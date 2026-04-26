<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];

require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/database.php';

function uiStatusToIdeaEstado(string $status): string
{
  $status = strtolower(trim($status));
  return match ($status) {
    'approved' => 'aprobada',
    'analyzing', 'en_analisis' => 'en_analisis',
    'production', 'en_produccion' => 'en_produccion',
    'rejected', 'discarded', 'descartada' => 'descartada',
    'postponed', 'pospuesta' => 'pospuesta',
    default => 'nueva',
  };
}

function ideaEstadoToUiStatus(?string $estado): string
{
  return match ($estado) {
    'aprobada' => 'approved',
    'en_analisis' => 'analyzing',
    'en_produccion' => 'production',
    'descartada' => 'rejected',
    'pospuesta' => 'postponed',
    default => 'pending',
  };
}

function normalizeFuenteIdea(?string $source): string
{
  $s = strtolower(trim((string)$source));
  return match ($s) {
    'telegram' => 'telegram',
    'whatsapp', 'whatsapp_texto' => 'whatsapp_texto',
    'whatsapp_voz' => 'whatsapp_voz',
    'google_news', 'alerta_google_news' => 'alerta_google_news',
    'perplexity', 'perplexity_signal' => 'perplexity_signal',
    'director_editorial' => 'director_editorial',
    'colaborador_externo' => 'colaborador_externo',
    default => 'director_editorial',
  };
}

if ($method === 'GET') {
  $status = $_GET['status'] ?? null;
  $source = $_GET['source'] ?? null;
  $sentiment = $_GET['sentiment'] ?? null;
  $fecha = $_GET['fecha'] ?? null;

  $where = ['deleted_at IS NULL'];
  $params = [];

  if ($status) {
    $where[] = "estado = :estado";
    $params['estado'] = uiStatusToIdeaEstado((string)$status);
  }
  if ($source) {
    $where[] = "fuente::text ILIKE :source";
    $params['source'] = '%' . $source . '%';
  }
  if ($sentiment) {
    $where[] = "metadata->>'sentiment' = :sentiment";
    $params['sentiment'] = $sentiment;
  }
  if ($fecha) {
    $where[] = "created_at::date = :fecha::date";
    $params['fecha'] = $fecha;
  }

  $sql = "
    SELECT
      id,
      titulo,
      fuente::text AS fuente,
      estado::text AS estado,
      metadata,
      created_at
    FROM ideas
    WHERE " . implode(' AND ', $where) . "
    ORDER BY created_at DESC
  ";

  $rows = dbFetchAll($sql, $params);
  $topics = array_map(function ($r) {
    $meta = [];
    if (!empty($r['metadata'])) {
      $meta = json_decode($r['metadata'], true) ?: [];
    }
    return [
      'id' => $r['id'],
      'topic' => $r['titulo'],
      'source' => $meta['source_raw'] ?? $r['fuente'],
      'mentions' => $meta['mentions'] ?? 1,
      'sentiment' => $meta['sentiment'] ?? 'neutral',
      'suggested_formats' => $meta['suggested_formats'] ?? ['nota'],
      'detected_at' => isoDateTime($r['created_at'] ?? null),
      'status' => $meta['status'] ?? ideaEstadoToUiStatus($r['estado'] ?? null),
    ];
  }, $rows);

  echo json_encode(['topics' => $topics]);
  exit;
}

if ($method === 'POST') {
  $payload = requireAuth();
  $input = json_decode(file_get_contents('php://input'), true);

  $title = trim((string)($input['topic'] ?? ''));
  if ($title === '') {
    http_response_code(400);
    echo json_encode(['error' => 'El topic es requerido']);
    exit;
  }

  $sourceRaw = (string)($input['source'] ?? 'manual');
  $uiStatus = (string)($input['status'] ?? 'pending');
  $mentions = (int)($input['mentions'] ?? 1);
  $sentiment = (string)($input['sentiment'] ?? 'neutral');
  $suggestedFormats = $input['suggested_formats'] ?? ['nota'];
  if (!is_array($suggestedFormats)) $suggestedFormats = ['nota'];

  $meta = [
    'status' => $uiStatus,
    'source_raw' => $sourceRaw,
    'mentions' => $mentions,
    'sentiment' => $sentiment,
    'suggested_formats' => array_values($suggestedFormats),
  ];

  $row = dbInsert('ideas', [
    'titulo' => $title,
    'fuente' => normalizeFuenteIdea($sourceRaw),
    'estado' => uiStatusToIdeaEstado($uiStatus),
    'registrado_por' => $payload['sub'],
    'metadata' => json_encode($meta),
  ], 'id, titulo, created_at');

  $topic = [
    'id' => $row['id'],
    'topic' => $row['titulo'],
    'source' => $sourceRaw,
    'mentions' => $mentions,
    'sentiment' => $sentiment,
    'suggested_formats' => array_values($suggestedFormats),
    'detected_at' => isoDateTime($row['created_at'] ?? null),
    'status' => $uiStatus,
  ];

  echo json_encode(['ok' => true, 'topic' => $topic]);
  exit;
}

if ($method === 'PATCH') {
  requireAuth();
  $input = json_decode(file_get_contents('php://input'), true);
  $id = $input['id'] ?? null;

  if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'El ID es requerido']);
    exit;
  }

  $current = dbFetchOne('SELECT id, titulo, fuente::text AS fuente, estado::text AS estado, metadata, created_at FROM ideas WHERE id = :id AND deleted_at IS NULL', ['id' => $id]);
  if (!$current) {
    http_response_code(404);
    echo json_encode(['error' => 'Topic no encontrado']);
    exit;
  }

  $meta = [];
  if (!empty($current['metadata'])) {
    $meta = json_decode($current['metadata'], true) ?: [];
  }

  $updates = [];
  if (isset($input['topic'])) {
    $updates['titulo'] = trim((string)$input['topic']);
  }
  if (isset($input['status'])) {
    $meta['status'] = (string)$input['status'];
    $updates['estado'] = uiStatusToIdeaEstado((string)$input['status']);
  }
  if (isset($input['mentions'])) $meta['mentions'] = (int)$input['mentions'];
  if (isset($input['sentiment'])) $meta['sentiment'] = (string)$input['sentiment'];
  if (isset($input['suggested_formats'])) {
    $sf = $input['suggested_formats'];
    if (!is_array($sf)) $sf = ['nota'];
    $meta['suggested_formats'] = array_values($sf);
  }
  $updates['metadata'] = json_encode($meta);

  $row = dbUpdate('ideas', $updates, 'id = :id', ['id' => $id], 'id, titulo, fuente::text AS fuente, estado::text AS estado, metadata, created_at');
  if (!$row) {
    http_response_code(500);
    echo json_encode(['error' => 'No se pudo actualizar']);
    exit;
  }

  $metaOut = json_decode($row['metadata'] ?? '{}', true) ?: [];
  $topic = [
    'id' => $row['id'],
    'topic' => $row['titulo'],
    'source' => $metaOut['source_raw'] ?? $row['fuente'],
    'mentions' => $metaOut['mentions'] ?? 1,
    'sentiment' => $metaOut['sentiment'] ?? 'neutral',
    'suggested_formats' => $metaOut['suggested_formats'] ?? ['nota'],
    'detected_at' => isoDateTime($row['created_at'] ?? null),
    'status' => $metaOut['status'] ?? ideaEstadoToUiStatus($row['estado'] ?? null),
  ];

  echo json_encode(['ok' => true, 'topic' => $topic]);
  exit;
}

if ($method === 'DELETE') {
  requireAuth();
  $id = $_GET['id'] ?? null;
  $olderThanDays = $_GET['older_than_days'] ?? null;

  if ($id) {
    $updated = dbExec('UPDATE ideas SET deleted_at = NOW() WHERE id = :id AND deleted_at IS NULL', ['id' => $id]);
    if ($updated <= 0) {
      http_response_code(404);
      echo json_encode(['error' => 'Topic no encontrado']);
      exit;
    }
    echo json_encode(['ok' => true, 'deleted' => 1]);
    exit;
  }

  if ($olderThanDays) {
    $days = (int)$olderThanDays;
    if ($days <= 0) $days = 1;
    $updated = dbExec(
      "UPDATE ideas SET deleted_at = NOW()
       WHERE deleted_at IS NULL AND created_at < (NOW() - (:days || ' days')::interval)",
      ['days' => (string)$days]
    );
    echo json_encode(['ok' => true, 'deleted' => $updated]);
    exit;
  }

  http_response_code(400);
  echo json_encode(['error' => 'ID o older_than_days requerido']);
  exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
