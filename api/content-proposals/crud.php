<?php
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/database.php';

function generateSlug(string $titulo): string
{
  $slug = strtolower(trim($titulo));
  $slug = preg_replace('/[^\p{L}\p{N}\s-]/u', '', $slug);
  $slug = preg_replace('/\s+/u', '-', $slug);
  $slug = preg_replace('/-+/u', '-', $slug);
  $slug = trim($slug, '-');
  if ($slug === '') $slug = 'propuesta';
  return $slug;
}

function ensureUniqueSlug(string $baseSlug, ?string $ignoreId = null): string
{
  $slug = $baseSlug;
  $n = 1;
  while (true) {
    $params = ['slug' => $slug];
    $sql = "SELECT 1 FROM piezas_contenido WHERE slug = :slug AND deleted_at IS NULL";
    if ($ignoreId) {
      $sql .= " AND id <> :id";
      $params['id'] = $ignoreId;
    }
    $exists = dbFetchOne($sql . " LIMIT 1", $params);
    if (!$exists) return $slug;
    $n++;
    $slug = $baseSlug . '-' . $n;
  }
}

function uiFormatToDbFormat(string $uiFormat): string
{
  $f = strtolower(trim($uiFormat));
  return match ($f) {
    'video' => 'guion_video',
    'audio', 'podcast' => 'capsula_audio',
    'newsletter' => 'newsletter',
    default => 'nota_web',
  };
}

function dbFormatToUiFormat(string $dbFormat, array $meta): string
{
  if (!empty($meta['ui_format'])) return (string)$meta['ui_format'];
  return match ($dbFormat) {
    'guion_video' => 'video',
    'capsula_audio' => 'audio',
    'newsletter' => 'newsletter',
    default => 'nota',
  };
}

function estadoPiezaToUiStatus(string $estado, array $meta): string
{
  if (!empty($meta['status'])) return (string)$meta['status'];
  return match ($estado) {
    'aprobada' => 'approved',
    'rechazada' => 'rejected',
    'publicada' => 'published',
    default => 'draft',
  };
}

function uiStatusToEstadoPieza(string $status): string
{
  $s = strtolower(trim($status));
  return match ($s) {
    'approved' => 'aprobada',
    'rejected' => 'rechazada',
    'published' => 'publicada',
    default => 'borrador',
  };
}

if ($method === 'GET') {
  $id = $_GET['id'] ?? null;
  $status = $_GET['status'] ?? null;
  $format = $_GET['format'] ?? null;
  $topicId = $_GET['topic_id'] ?? null;
  $aiLabel = $_GET['ai_label'] ?? null;
  $scheduled = $_GET['scheduled'] ?? null;

  $where = [
    "pc.deleted_at IS NULL",
    "(pc.metadata->>'is_proposal') = 'true'",
  ];
  $params = [];

  if ($id) {
    $where[] = 'pc.id = :id';
    $params['id'] = $id;
  }
  if ($topicId) {
    $where[] = 'pc.idea_id = :idea_id';
    $params['idea_id'] = $topicId;
  }
  if ($status) {
    $where[] = "pc.metadata->>'status' = :status";
    $params['status'] = $status;
  }
  if ($format) {
    $where[] = "pc.metadata->>'ui_format' = :ui_format";
    $params['ui_format'] = $format;
  }
  if ($aiLabel) {
    $where[] = "pc.metadata->>'ai_label' = :ai_label";
    $params['ai_label'] = $aiLabel;
  }
  if ($scheduled !== null) {
    $wantScheduled = $scheduled === 'true' || $scheduled === '1';
    $where[] = $wantScheduled ? "pub.programada_para IS NOT NULL" : "pub.programada_para IS NULL";
  }

  $rows = dbFetchAll(
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
     WHERE " . implode(' AND ', $where) . "
     ORDER BY pc.created_at DESC",
    $params
  );

  $proposals = array_map(function ($r) {
    $meta = json_decode($r['metadata'] ?? '{}', true) ?: [];
    $statusOut = estadoPiezaToUiStatus($r['estado'], $meta);
    $scheduledAt = isoDateTime($r['programada_para'] ?? null);
    if ($scheduledAt && $statusOut !== 'scheduled') {
      $statusOut = 'scheduled';
    }
    return [
      'id' => $r['id'],
      'topic_id' => $r['idea_id'] ?? null,
      'topic_title' => $r['topic_title'] ?? null,
      'format' => dbFormatToUiFormat($r['formato'], $meta),
      'title' => $r['titulo'] ?? '',
      'body' => $r['contenido_markdown'] ?? '',
      'image_prompt' => $meta['image_prompt'] ?? ($r['prompt_usado'] ?? null),
      'ai_label' => $meta['ai_label'] ?? null,
      'status' => $statusOut,
      'scheduled_at' => $scheduledAt,
      'rejection_reason' => $meta['rejection_reason'] ?? ($r['notas_revision'] ?? null),
      'created_at' => isoDateTime($r['created_at'] ?? null),
      'updated_at' => isoDateTime($r['updated_at'] ?? null),
      'created_by' => $meta['created_by'] ?? null,
    ];
  }, $rows);

  if ($id) {
    if (!$proposals) {
      http_response_code(404);
      echo json_encode(['error' => 'Propuesta no encontrada']);
      exit;
    }
    echo json_encode(['proposal' => $proposals[0]]);
    exit;
  }

  echo json_encode(['proposals' => $proposals]);
  exit;
}

if ($method === 'POST') {
  $payload = requireAuth();
  $data = json_decode(file_get_contents('php://input'), true);
  
  $uiFormat = (string)($data['format'] ?? 'nota');
  $uiStatus = (string)($data['status'] ?? 'draft');

  $meta = [
    'is_proposal' => true,
    'ui_format' => $uiFormat,
    'ai_label' => $data['ai_label'] ?? null,
    'status' => $uiStatus,
    'image_prompt' => $data['image_prompt'] ?? null,
    'created_by' => $data['created_by'] ?? 'claude',
  ];

  $row = dbInsert('piezas_contenido', [
    'idea_id' => $data['topic_id'] ?? null,
    'titulo' => $data['title'] ?? '',
    'slug' => ensureUniqueSlug(generateSlug((string)($data['title'] ?? 'propuesta'))),
    'categoria_id' => null,
    'formato' => uiFormatToDbFormat($uiFormat),
    'estado' => uiStatusToEstadoPieza($uiStatus),
    'autor_id' => $payload['sub'],
    'editor_id' => null,
    'contenido_markdown' => $data['body'] ?? '',
    'prompt_usado' => $data['image_prompt'] ?? null,
    'notas_revision' => null,
    'metadata' => json_encode($meta),
  ], "id, idea_id, formato::text AS formato, estado::text AS estado, titulo, contenido_markdown, prompt_usado, notas_revision, created_at, updated_at, metadata");

  $metaOut = json_decode($row['metadata'] ?? '{}', true) ?: [];
  $newProposal = [
    'id' => $row['id'],
    'topic_id' => $row['idea_id'] ?? null,
    'format' => dbFormatToUiFormat($row['formato'], $metaOut),
    'title' => $row['titulo'] ?? '',
    'body' => $row['contenido_markdown'] ?? '',
    'image_prompt' => $metaOut['image_prompt'] ?? ($row['prompt_usado'] ?? null),
    'ai_label' => $metaOut['ai_label'] ?? null,
    'status' => $metaOut['status'] ?? estadoPiezaToUiStatus($row['estado'], $metaOut),
    'rejection_reason' => null,
    'created_at' => isoDateTime($row['created_at'] ?? null),
    'updated_at' => isoDateTime($row['updated_at'] ?? null),
    'created_by' => $metaOut['created_by'] ?? null,
  ];

  echo json_encode(['ok' => true, 'proposal' => $newProposal]);
  exit;
}

if ($method === 'PATCH') {
  requireAuth();
  $data = json_decode(file_get_contents('php://input'), true);
  $id = $data['id'] ?? null;
  if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'El ID es requerido']);
    exit;
  }

  $current = dbFetchOne(
    "SELECT id, metadata, formato::text AS formato, estado::text AS estado, idea_id, titulo, contenido_markdown, prompt_usado, notas_revision, created_at, updated_at
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

  $updates = [];
  if (isset($data['topic_id'])) $updates['idea_id'] = $data['topic_id'];
  if (isset($data['title'])) {
    $updates['titulo'] = $data['title'];
    $updates['slug'] = ensureUniqueSlug(generateSlug((string)$data['title']), $id);
  }
  if (isset($data['body'])) $updates['contenido_markdown'] = $data['body'];
  if (isset($data['image_prompt'])) {
    $meta['image_prompt'] = $data['image_prompt'];
    $updates['prompt_usado'] = $data['image_prompt'];
  }
  if (isset($data['ai_label'])) $meta['ai_label'] = $data['ai_label'];
  if (isset($data['status'])) {
    $meta['status'] = $data['status'];
    $updates['estado'] = uiStatusToEstadoPieza((string)$data['status']);
  }
  if (isset($data['rejection_reason'])) {
    $meta['rejection_reason'] = $data['rejection_reason'];
    $updates['notas_revision'] = $data['rejection_reason'];
  }
  if (isset($data['format'])) {
    $meta['ui_format'] = $data['format'];
    $updates['formato'] = uiFormatToDbFormat((string)$data['format']);
  }

  $updates['metadata'] = json_encode($meta);

  $row = dbUpdate('piezas_contenido', $updates, "id = :id AND deleted_at IS NULL AND (metadata->>'is_proposal') = 'true'", ['id' => $id], "id, idea_id, formato::text AS formato, estado::text AS estado, titulo, contenido_markdown, prompt_usado, notas_revision, created_at, updated_at, metadata");
  if (!$row) {
    http_response_code(404);
    echo json_encode(['error' => 'Propuesta no encontrada']);
    exit;
  }

  $metaOut = json_decode($row['metadata'] ?? '{}', true) ?: [];
  echo json_encode(['ok' => true, 'proposal' => [
    'id' => $row['id'],
    'topic_id' => $row['idea_id'] ?? null,
    'format' => dbFormatToUiFormat($row['formato'], $metaOut),
    'title' => $row['titulo'] ?? '',
    'body' => $row['contenido_markdown'] ?? '',
    'image_prompt' => $metaOut['image_prompt'] ?? ($row['prompt_usado'] ?? null),
    'ai_label' => $metaOut['ai_label'] ?? null,
    'status' => $metaOut['status'] ?? estadoPiezaToUiStatus($row['estado'], $metaOut),
    'rejection_reason' => $metaOut['rejection_reason'] ?? ($row['notas_revision'] ?? null),
    'created_at' => isoDateTime($row['created_at'] ?? null),
    'updated_at' => isoDateTime($row['updated_at'] ?? null),
    'created_by' => $metaOut['created_by'] ?? null,
  ]]);
  exit;
}

if ($method === 'DELETE') {
  requireAuth();
  $id = $_GET['id'] ?? null;
  if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'El ID es requerido']);
    exit;
  }

  $deleted = dbExec("UPDATE piezas_contenido SET deleted_at = NOW() WHERE id = :id AND deleted_at IS NULL AND (metadata->>'is_proposal') = 'true'", ['id' => $id]);
  if ($deleted <= 0) {
    http_response_code(404);
    echo json_encode(['error' => 'Propuesta no encontrada']);
    exit;
  }

  echo json_encode(['ok' => true, 'deleted' => $deleted]);
  exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
?>
