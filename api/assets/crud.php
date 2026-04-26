<?php
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/database.php';

if ($method === 'GET') {
  $id = $_GET['id'] ?? null;
  $type = $_GET['type'] ?? null;
  $proposalId = $_GET['proposal_id'] ?? null;
  $status = $_GET['status'] ?? null;

  $where = ['1=1'];
  $params = [];

  if ($id) {
    $where[] = 'id = :id';
    $params['id'] = $id;
  }
  if ($type) {
    $where[] = 'tipo = :tipo';
    $params['tipo'] = $type;
  }
  if ($proposalId) {
    $where[] = 'pieza_id = :pieza_id';
    $params['pieza_id'] = $proposalId;
  }
  if ($status) {
    $where[] = 'estado = :estado';
    $params['estado'] = $status;
  }

  $rows = dbFetchAll(
    'SELECT id, pieza_id, tipo, original_prompt, file_path, estado, created_at, cost_tokens
     FROM assets_multimedia
     WHERE ' . implode(' AND ', $where) . '
     ORDER BY created_at DESC',
    $params
  );

  $assets = array_map(function ($r) {
    return [
      'id' => $r['id'],
      'proposal_id' => $r['pieza_id'],
      'type' => $r['tipo'],
      'original_prompt' => $r['original_prompt'] ?? '',
      'file_path' => $r['file_path'] ?? '',
      'status' => $r['estado'],
      'created_at' => isoDateTime($r['created_at'] ?? null),
      'cost_tokens' => $r['cost_tokens'] !== null ? (int)$r['cost_tokens'] : null,
    ];
  }, $rows);

  if ($id) {
    if (!$assets) {
      http_response_code(404);
      echo json_encode(['error' => 'Asset no encontrado']);
      exit;
    }
    echo json_encode(['asset' => $assets[0]]);
    exit;
  }

  echo json_encode(['assets' => $assets]);
  exit;
}

if ($method === 'POST') {
  requireAuth();
  $data = json_decode(file_get_contents('php://input'), true);

  $row = dbInsert('assets_multimedia', [
    'pieza_id' => $data['proposal_id'] ?? null,
    'tipo' => $data['type'] ?? 'image',
    'original_prompt' => $data['original_prompt'] ?? '',
    'file_path' => $data['file_path'] ?? '',
    'estado' => $data['status'] ?? 'generated',
    'cost_tokens' => isset($data['cost_tokens']) ? (int)$data['cost_tokens'] : null,
    'metadata' => json_encode(new stdClass()),
  ], 'id, pieza_id, tipo, original_prompt, file_path, estado, created_at, cost_tokens');

  $newAsset = [
    'id' => $row['id'],
    'proposal_id' => $row['pieza_id'],
    'type' => $row['tipo'],
    'original_prompt' => $row['original_prompt'] ?? '',
    'file_path' => $row['file_path'] ?? '',
    'status' => $row['estado'],
    'created_at' => isoDateTime($row['created_at'] ?? null),
    'cost_tokens' => $row['cost_tokens'] !== null ? (int)$row['cost_tokens'] : null,
  ];

  echo json_encode(['ok' => true, 'asset' => $newAsset]);
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

  $deleted = dbDelete('assets_multimedia', 'id = :id', ['id' => $id]);
  if ($deleted <= 0) {
    http_response_code(404);
    echo json_encode(['error' => 'Asset no encontrado']);
    exit;
  }
  echo json_encode(['ok' => true, 'deleted' => $deleted]);
  exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
?>
