<?php
header('Content-Type: application/json');

require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/database.php';

$method = $_SERVER['REQUEST_METHOD'];

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
preg_match('/\/api\/publications\/crud\.php(?:\/([\w-]+))?/', $path, $matches);
$idFromPath = $matches[1] ?? null;

requireAuth();

function platformToCanal(?string $platform): ?string
{
  $p = strtolower(trim((string)$platform));
  return match ($p) {
    'facebook' => 'facebook',
    'instagram' => 'instagram',
    'twitter', 'x', 'twitter_x' => 'twitter_x',
    'tiktok' => 'tiktok',
    'youtube' => 'youtube',
    'telegram' => 'telegram',
    'whatsapp' => 'whatsapp',
    'newsletter' => 'newsletter',
    'website', 'sitio_web' => 'sitio_web',
    default => null,
  };
}

function canalToPlatform(string $canal): string
{
  return match ($canal) {
    'sitio_web' => 'website',
    default => $canal,
  };
}

function uiStatusToEstado(?string $status): string
{
  $s = strtolower(trim((string)$status));
  return match ($s) {
    'published' => 'publicada',
    'failed' => 'fallida',
    'cancelled', 'canceled' => 'cancelada',
    default => 'programada',
  };
}

function estadoToUiStatus(string $estado): string
{
  return match ($estado) {
    'publicada' => 'published',
    'fallida' => 'failed',
    'cancelada' => 'canceled',
    default => 'pending',
  };
}

if ($method === 'GET') {
  $platform = $_GET['platform'] ?? null;
  $status = $_GET['status'] ?? null;
  $proposalId = $_GET['proposal_id'] ?? null;

  $where = ['1=1'];
  $params = [];

  if ($platform) {
    $canal = platformToCanal($platform);
    if ($canal) {
      $where[] = 'canal = :canal';
      $params['canal'] = $canal;
    }
  }
  if ($status) {
    $where[] = 'estado = :estado';
    $params['estado'] = uiStatusToEstado($status);
  }
  if ($proposalId) {
    $where[] = 'pieza_id = :pieza_id';
    $params['pieza_id'] = $proposalId;
  }

  $rows = dbFetchAll(
    "SELECT id, pieza_id, canal::text AS canal, estado::text AS estado, url_publicacion, publicada_en, error_detalle, metadata, created_at, updated_at
     FROM publicaciones
     WHERE " . implode(' AND ', $where) . "
     ORDER BY created_at DESC",
    $params
  );

  $publications = array_map(function ($r) {
    $meta = json_decode($r['metadata'] ?? '{}', true) ?: [];
    return [
      'id' => $r['id'],
      'proposal_id' => $r['pieza_id'],
      'platform' => canalToPlatform($r['canal']),
      'status' => estadoToUiStatus($r['estado']),
      'url' => $r['url_publicacion'] ?? null,
      'published_at' => isoDateTime($r['publicada_en'] ?? null),
      'error_message' => $r['error_detalle'] ?? null,
      'metadata' => $meta,
      'created_at' => isoDateTime($r['created_at'] ?? null),
      'updated_at' => isoDateTime($r['updated_at'] ?? null),
    ];
  }, $rows);

  echo json_encode(['publications' => $publications, 'total' => count($publications)]);
  exit;
}

if ($method === 'POST') {
  $input = json_decode(file_get_contents('php://input'), true);

  $proposalId = $input['proposal_id'] ?? null;
  $platform = $input['platform'] ?? null;
  $canal = platformToCanal($platform);

  if (empty($proposalId) || !$canal) {
    http_response_code(400);
    echo json_encode(['error' => 'proposal_id y platform son requeridos']);
    exit;
  }

  $row = dbInsert('publicaciones', [
    'pieza_id' => $proposalId,
    'canal' => $canal,
    'estado' => 'programada',
    'metadata' => json_encode($input['metadata'] ?? new stdClass()),
  ], 'id, pieza_id, canal::text AS canal, estado::text AS estado, created_at, updated_at, metadata');

  $publication = [
    'id' => $row['id'],
    'proposal_id' => $row['pieza_id'],
    'platform' => canalToPlatform($row['canal']),
    'status' => estadoToUiStatus($row['estado']),
    'url' => null,
    'published_at' => null,
    'error_message' => null,
    'metadata' => json_decode($row['metadata'] ?? '{}', true) ?: [],
    'created_at' => isoDateTime($row['created_at'] ?? null),
  ];

  echo json_encode(['ok' => true, 'publication' => $publication]);
  exit;
}

if ($method === 'PATCH' && $idFromPath) {
  $input = json_decode(file_get_contents('php://input'), true);

  $updates = [];
  if (isset($input['status'])) $updates['estado'] = uiStatusToEstado($input['status']);
  if (isset($input['url'])) $updates['url_publicacion'] = $input['url'];
  if (isset($input['published_at'])) $updates['publicada_en'] = $input['published_at'];
  if (isset($input['error_message'])) $updates['error_detalle'] = $input['error_message'];
  if (isset($input['metadata'])) $updates['metadata'] = json_encode($input['metadata']);

  if (!$updates) {
    http_response_code(400);
    echo json_encode(['error' => 'Nada que actualizar']);
    exit;
  }

  $row = dbUpdate('publicaciones', $updates, 'id = :id', ['id' => $idFromPath], 'id, pieza_id, canal::text AS canal, estado::text AS estado, url_publicacion, publicada_en, error_detalle, metadata, created_at, updated_at');
  if (!$row) {
    http_response_code(404);
    echo json_encode(['error' => 'Publicación no encontrada']);
    exit;
  }

  $publication = [
    'id' => $row['id'],
    'proposal_id' => $row['pieza_id'],
    'platform' => canalToPlatform($row['canal']),
    'status' => estadoToUiStatus($row['estado']),
    'url' => $row['url_publicacion'] ?? null,
    'published_at' => isoDateTime($row['publicada_en'] ?? null),
    'error_message' => $row['error_detalle'] ?? null,
    'metadata' => json_decode($row['metadata'] ?? '{}', true) ?: [],
    'created_at' => isoDateTime($row['created_at'] ?? null),
    'updated_at' => isoDateTime($row['updated_at'] ?? null),
  ];

  echo json_encode(['ok' => true, 'publication' => $publication]);
  exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);

