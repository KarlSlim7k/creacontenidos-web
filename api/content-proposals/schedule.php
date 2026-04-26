<?php
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'PATCH') {
  http_response_code(405);
  echo json_encode(['error' => 'Método no permitido']);
  exit;
}

require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/database.php';

function fetchProposalById(string $id): ?array
{
  $row = dbFetchOne(
    "SELECT
      pc.id,
      pc.idea_id,
      pc.formato::text AS formato,
      pc.estado::text AS estado,
      pc.titulo,
      pc.contenido_markdown,
      pc.prompt_usado,
      pc.notas_revision,
      pc.created_at,
      pc.updated_at,
      pc.metadata,
      i.titulo AS topic_title,
      pub.programada_para
     FROM piezas_contenido pc
     LEFT JOIN ideas i ON i.id = pc.idea_id
     LEFT JOIN publicaciones pub
       ON pub.pieza_id = pc.id AND pub.canal = 'sitio_web' AND pub.estado = 'programada'
     WHERE pc.id = :id AND pc.deleted_at IS NULL AND (pc.metadata->>'is_proposal') = 'true'
     LIMIT 1",
    ['id' => $id]
  );

  if (!$row) return null;
  $meta = json_decode($row['metadata'] ?? '{}', true) ?: [];
  $format = $meta['ui_format'] ?? match ($row['formato']) {
    'guion_video' => 'video',
    'capsula_audio' => 'audio',
    'newsletter' => 'newsletter',
    default => 'nota',
  };

  $status = $meta['status'] ?? match ($row['estado']) {
    'aprobada' => 'approved',
    'rechazada' => 'rejected',
    'publicada' => 'published',
    default => 'draft',
  };
  $scheduledAt = isoDateTime($row['programada_para'] ?? null);
  if ($scheduledAt) $status = 'scheduled';

  return [
    'id' => $row['id'],
    'topic_id' => $row['idea_id'] ?? null,
    'topic_title' => $row['topic_title'] ?? null,
    'format' => $format,
    'title' => $row['titulo'] ?? '',
    'body' => $row['contenido_markdown'] ?? '',
    'image_prompt' => $meta['image_prompt'] ?? ($row['prompt_usado'] ?? null),
    'ai_label' => $meta['ai_label'] ?? null,
    'status' => $status,
    'scheduled_at' => $scheduledAt,
    'rejection_reason' => $meta['rejection_reason'] ?? ($row['notas_revision'] ?? null),
    'created_at' => isoDateTime($row['created_at'] ?? null),
    'updated_at' => isoDateTime($row['updated_at'] ?? null),
    'created_by' => $meta['created_by'] ?? null,
  ];
}

$payload = requireAuth();

$input = json_decode(file_get_contents('php://input'), true);
$id = $input['id'] ?? null;

if (!$id) {
  http_response_code(400);
  echo json_encode(['error' => 'El ID es requerido']);
  exit;
}

$scheduledAt = $input['scheduled_at'] ?? null;
if (!$scheduledAt) {
  http_response_code(400);
  echo json_encode(['error' => 'La fecha de programación es requerida']);
  exit;
}

$current = dbFetchOne(
  "SELECT id, metadata
   FROM piezas_contenido
   WHERE id = :id AND deleted_at IS NULL AND (metadata->>'is_proposal') = 'true'
   LIMIT 1",
  ['id' => $id]
);
if (!$current) {
  http_response_code(404);
  echo json_encode(['error' => 'Propuesta no encontrada']);
  exit;
}

$meta = json_decode($current['metadata'] ?? '{}', true) ?: [];
$meta['status'] = 'scheduled';
$meta['scheduled_at'] = $scheduledAt;
$meta['scheduled_by'] = $payload['email'] ?? $payload['nombre'] ?? 'editor';

// Upsert publication for sitio_web
$pub = dbFetchOne(
  "SELECT id FROM publicaciones
   WHERE pieza_id = :pieza_id AND canal = 'sitio_web'
   ORDER BY created_at DESC
   LIMIT 1",
  ['pieza_id' => $id]
);

if ($pub) {
  dbExec(
    "UPDATE publicaciones
     SET estado = 'programada', programada_para = :programada_para, error_detalle = NULL
     WHERE id = :id",
    ['id' => $pub['id'], 'programada_para' => $scheduledAt]
  );
} else {
  dbInsert('publicaciones', [
    'pieza_id' => $id,
    'canal' => 'sitio_web',
    'estado' => 'programada',
    'programada_para' => $scheduledAt,
    'metadata' => json_encode(['requested_by' => ($payload['email'] ?? 'editor')]),
  ], 'id');
}

dbExec(
  "UPDATE piezas_contenido
   SET metadata = :metadata,
       fecha_publicacion = :fecha_publicacion,
       fecha_publicacion_obj = :fecha_publicacion_obj,
       editor_id = :editor_id
   WHERE id = :id AND deleted_at IS NULL AND (metadata->>'is_proposal') = 'true'",
  [
    'id' => $id,
    'metadata' => json_encode($meta),
    'fecha_publicacion' => $scheduledAt,
    'fecha_publicacion_obj' => substr($scheduledAt, 0, 10),
    'editor_id' => $payload['sub'],
  ]
);

echo json_encode(['ok' => true, 'proposal' => fetchProposalById($id)]);
