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
$dataPath = __DIR__ . '/../../data/pages.json';

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

if ($method === 'GET') {
  if (!file_exists($dataPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Archivo de páginas no encontrado']);
    exit;
  }
  $pages = json_decode(file_get_contents($dataPath), true);
  $page = $pages[$id] ?? null;
  if (!$page) {
    http_response_code(404);
    echo json_encode(['error' => 'Página no encontrada']);
    exit;
  }
  echo json_encode($page);
  exit;
}

if ($method === 'POST' || $method === 'PATCH') {
  requireAuth();
  $data = json_decode(file_get_contents('php://input'), true);
  $blocks = $data['blocks'] ?? [];
  $meta = $data['meta'] ?? [];
  $estado = $data['estado'] ?? null;

  if (!file_exists($dataPath)) {
    $pages = [];
  } else {
    $pages = json_decode(file_get_contents($dataPath), true);
  }

  if (!isset($pages[$id])) {
    $pages[$id] = ['meta' => [], 'bloques' => []];
  }

  if (!isset($pages[$id]['bloques'])) {
    $pages[$id]['bloques'] = [];
  }

  if (!isset($pages[$id]['meta'])) {
    $pages[$id]['meta'] = [];
  }

  foreach ($blocks as $blockId => $content) {
    $pages[$id]['bloques'][$blockId] = $content;
  }

  foreach ($meta as $key => $value) {
    $pages[$id]['meta'][$key] = $value;
  }

  if ($estado) {
    $pages[$id]['estado'] = $estado;
    $pages[$id]['updated_at'] = date('c');
  }

  file_put_contents($dataPath, json_encode($pages, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
  echo json_encode(['ok' => true, 'updated' => count($blocks), 'meta_updated' => count($meta)]);
  exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
?>