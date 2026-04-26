<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? 'home';

require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/database.php';

if ($method === 'GET') {
  $row = dbFetchOne('SELECT id, meta, bloques, estado, created_at, updated_at FROM paginas WHERE id = :id LIMIT 1', ['id' => $id]);
  if (!$row) {
    http_response_code(404);
    echo json_encode(['error' => 'Página no encontrada']);
    exit;
  }
  $meta = json_decode($row['meta'] ?? '{}', true) ?: [];
  $bloques = json_decode($row['bloques'] ?? '{}', true) ?: [];
  echo json_encode([
    'meta' => $meta,
    'bloques' => $bloques,
    'estado' => $row['estado'] ?? null,
    'created_at' => isoDateTime($row['created_at'] ?? null),
    'updated_at' => isoDateTime($row['updated_at'] ?? null),
  ]);
  exit;
}

if ($method === 'POST' || $method === 'PATCH') {
  requireAuth();
  $data = json_decode(file_get_contents('php://input'), true);
  $blocks = $data['blocks'] ?? [];
  $meta = $data['meta'] ?? [];
  $estado = $data['estado'] ?? null;

  $current = dbFetchOne('SELECT id, meta, bloques, estado FROM paginas WHERE id = :id LIMIT 1', ['id' => $id]);
  $currentMeta = $current ? (json_decode($current['meta'] ?? '{}', true) ?: []) : [];
  $currentBlocks = $current ? (json_decode($current['bloques'] ?? '{}', true) ?: []) : [];

  if (is_array($blocks)) {
    foreach ($blocks as $blockId => $content) {
      $currentBlocks[(string)$blockId] = $content;
    }
  }
  if (is_array($meta)) {
    foreach ($meta as $key => $value) {
      $currentMeta[(string)$key] = $value;
    }
  }

  $finalEstado = $estado ?: ($current['estado'] ?? 'draft');

  if (!$current) {
    dbInsert('paginas', [
      'id' => $id,
      'meta' => json_encode($currentMeta),
      'bloques' => json_encode($currentBlocks),
      'estado' => $finalEstado,
    ], 'id');
  } else {
    dbExec(
      'UPDATE paginas SET meta = :meta, bloques = :bloques, estado = :estado, updated_at = NOW() WHERE id = :id',
      [
        'id' => $id,
        'meta' => json_encode($currentMeta),
        'bloques' => json_encode($currentBlocks),
        'estado' => $finalEstado,
      ]
    );
  }

  echo json_encode(['ok' => true, 'updated' => count($blocks), 'meta_updated' => count($meta)]);
  exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
?>
