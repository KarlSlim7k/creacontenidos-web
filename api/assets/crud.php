<?php
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$dataPath = __DIR__ . '/../../data/generated_assets.json';

function requireAuth() {
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
  return $payload;
}

function generateUuid() {
  return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
    mt_rand(0, 0xffff), mt_rand(0, 0xffff),
    mt_rand(0, 0xffff),
    mt_rand(0, 0x0fff) | 0x4000,
    mt_rand(0, 0x3fff) | 0x8000,
    mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
  );
}

function loadAssets() {
  global $dataPath;
  if (!file_exists($dataPath)) {
    return ['assets' => []];
  }
  $data = json_decode(file_get_contents($dataPath), true);
  return $data ?: ['assets' => []];
}

function saveAssets($data) {
  global $dataPath;
  file_put_contents($dataPath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

if ($method === 'GET') {
  $assets = loadAssets()['assets'];
  $id = $_GET['id'] ?? null;
  $type = $_GET['type'] ?? null;
  $proposalId = $_GET['proposal_id'] ?? null;
  $status = $_GET['status'] ?? null;

  if ($id) {
    $found = null;
    foreach ($assets as $a) {
      if ($a['id'] === $id) {
        $found = $a;
        break;
      }
    }
    if (!$found) {
      http_response_code(404);
      echo json_encode(['error' => 'Asset no encontrado']);
      exit;
    }
    echo json_encode(['asset' => $found]);
    exit;
  }

  if ($type) {
    $assets = array_values(array_filter($assets, fn($a) => ($a['type'] ?? '') === $type));
  }
  if ($proposalId) {
    $assets = array_values(array_filter($assets, fn($a) => ($a['proposal_id'] ?? '') === $proposalId));
  }
  if ($status) {
    $assets = array_values(array_filter($assets, fn($a) => ($a['status'] ?? '') === $status));
  }

  usort($assets, fn($a, $b) => strcmp($b['created_at'] ?? '', $a['created_at'] ?? ''));
  echo json_encode(['assets' => $assets]);
  exit;
}

if ($method === 'POST') {
  requireAuth();
  $data = json_decode(file_get_contents('php://input'), true);

  $newAsset = [
    'id' => generateUuid(),
    'proposal_id' => $data['proposal_id'] ?? null,
    'type' => $data['type'] ?? 'image',
    'original_prompt' => $data['original_prompt'] ?? '',
    'file_path' => $data['file_path'] ?? '',
    'status' => $data['status'] ?? 'generated',
    'created_at' => date('c'),
    'cost_tokens' => $data['cost_tokens'] ?? null
  ];

  $assetsData = loadAssets();
  $assetsData['assets'][] = $newAsset;
  saveAssets($assetsData);

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

  $assetsData = loadAssets();
  $initialCount = count($assetsData['assets']);
  $assetsData['assets'] = array_values(array_filter($assetsData['assets'], fn($a) => $a['id'] !== $id));

  if (count($assetsData['assets']) === $initialCount) {
    http_response_code(404);
    echo json_encode(['error' => 'Asset no encontrado']);
    exit;
  }

  saveAssets($assetsData);
  echo json_encode(['ok' => true, 'deleted' => $initialCount - count($assetsData['assets'])]);
  exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
?>
