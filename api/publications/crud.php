<?php
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
preg_match('/\/api\/publications\/crud\.php(?:\/(\w+))?/', $path, $matches);
$id = $matches[1] ?? null;

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

$dataPath = __DIR__ . '/../../data/publications.json';
$data = file_exists($dataPath) ? json_decode(file_get_contents($dataPath), true) : ['publications' => []];

function uuid_v4() {
  return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
    mt_rand(0, 0xffff), mt_rand(0, 0xffff),
    mt_rand(0, 0xffff),
    mt_rand(0, 0x0fff) | 0x4000,
    mt_rand(0, 0x3fff) | 0x8000,
    mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
  );
}

if ($method === 'GET') {
  $platform = $_GET['platform'] ?? null;
  $status = $_GET['status'] ?? null;
  $proposalId = $_GET['proposal_id'] ?? null;
  
  $publications = $data['publications'] ?? [];
  
  if ($platform) {
    $publications = array_filter($publications, fn($p) => $p['platform'] === $platform);
  }
  if ($status) {
    $publications = array_filter($publications, fn($p) => $p['status'] === $status);
  }
  if ($proposalId) {
    $publications = array_filter($publications, fn($p) => $p['proposal_id'] === $proposalId);
  }
  
  $publications = array_values($publications);
  echo json_encode(['publications' => $publications, 'total' => count($publications)]);
  exit;
}

if ($method === 'POST') {
  $input = json_decode(file_get_contents('php://input'), true);
  
  if (empty($input['proposal_id']) || empty($input['platform'])) {
    http_response_code(400);
    echo json_encode(['error' => 'proposal_id y platform son requeridos']);
    exit;
  }
  
  $publication = [
    'id' => uuid_v4(),
    'proposal_id' => $input['proposal_id'],
    'platform' => $input['platform'],
    'status' => 'pending',
    'url' => null,
    'published_at' => null,
    'error_message' => null,
    'metadata' => $input['metadata'] ?? [],
    'created_at' => date('c')
  ];
  
  $data['publications'][] = $publication;
  file_put_contents($dataPath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
  
  echo json_encode(['ok' => true, 'publication' => $publication]);
  exit;
}

if ($method === 'PATCH' && $id) {
  $publications = $data['publications'] ?? [];
  $found = false;
  
  foreach ($publications as $i => $p) {
    if ($p['id'] === $id) {
      $input = json_decode(file_get_contents('php://input'), true);
      $allowed = ['status', 'url', 'published_at', 'error_message', 'metadata'];
      foreach ($allowed as $key) {
        if (isset($input[$key])) {
          $publications[$i][$key] = $input[$key];
        }
      }
      $publications[$i]['updated_at'] = date('c');
      $found = true;
      break;
    }
  }
  
  if (!$found) {
    http_response_code(404);
    echo json_encode(['error' => 'Publicación no encontrada']);
    exit;
  }
  
  $data['publications'] = $publications;
  file_put_contents($dataPath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
  
  echo json_encode(['ok' => true, 'publication' => $publications[$i]]);
  exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);