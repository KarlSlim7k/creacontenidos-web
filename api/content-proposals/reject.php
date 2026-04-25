<?php
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'PATCH') {
  http_response_code(405);
  echo json_encode(['error' => 'Método no permitido']);
  exit;
}

$token = $_COOKIE['crea_editor_session'] ?? null;
if (!$token) {
  http_response_code(401);
  echo json_encode(['error' => 'No autorizado']);
  exit;
}

$payload = json_decode(base64_decode($token), true);
if (!$payload || $payload['exp'] < time()) {
  http_response_code(401);
  echo json_encode(['error' => 'Sesión expirada']);
  exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$id = $input['id'] ?? null;

if (!$id) {
  http_response_code(400);
  echo json_encode(['error' => 'El ID es requerido']);
  exit;
}

$dataPath = __DIR__ . '/../../data/content_proposals.json';
$data = json_decode(file_get_contents($dataPath), true);
$proposals = $data['proposals'] ?? [];
$found = false;

foreach ($proposals as $i => $p) {
  if ($p['id'] === $id) {
    $proposals[$i]['status'] = 'rejected';
    $proposals[$i]['rejected_at'] = date('c');
    $proposals[$i]['rejected_by'] = $payload['email'] ?? $payload['nombre'] ?? 'editor';
    $proposals[$i]['rejection_reason'] = $input['reason'] ?? '';
    $proposals[$i]['updated_at'] = date('c');
    $found = true;
    break;
  }
}

if (!$found) {
  http_response_code(404);
  echo json_encode(['error' => 'Propuesta no encontrada']);
  exit;
}

$data['proposals'] = $proposals;
file_put_contents($dataPath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

echo json_encode(['ok' => true, 'proposal' => $proposals[$i]]);
