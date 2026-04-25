<?php
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
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
$proposalId = $input['proposal_id'] ?? null;
$platforms = $input['platforms'] ?? [];

if (!$proposalId) {
  http_response_code(400);
  echo json_encode(['error' => 'proposal_id es requerido']);
  exit;
}

if (empty($platforms)) {
  http_response_code(400);
  echo json_encode(['error' => 'Al menos una plataforma es requerida']);
  exit;
}

$proposalsPath = __DIR__ . '/../../data/content_proposals.json';
$proposalsData = json_decode(file_get_contents($proposalsPath), true);
$proposal = null;
foreach ($proposalsData['proposals'] ?? [] as $p) {
  if ($p['id'] === $proposalId) {
    $proposal = $p;
    break;
  }
}

if (!$proposal) {
  http_response_code(404);
  echo json_encode(['error' => 'Propuesta no encontrada']);
  exit;
}

$pubPath = __DIR__ . '/../../data/publications.json';
$pubData = file_exists($pubPath) ? json_decode(file_get_contents($pubPath), true) : ['publications' => []];

function uuid_v4() {
  return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
    mt_rand(0, 0xffff), mt_rand(0, 0xffff),
    mt_rand(0, 0xffff),
    mt_rand(0, 0x0fff) | 0x4000,
    mt_rand(0, 0x3fff) | 0x8000,
    mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
  );
}

$content = [
  'title' => $proposal['title'] ?? '',
  'body' => $proposal['body'] ?? '',
  'format' => $proposal['format'] ?? 'articulo'
];

$results = [];
$validPlatforms = ['facebook', 'instagram', 'tiktok', 'website', 'whatsapp'];

foreach ($platforms as $platform) {
  if (!in_array($platform, $validPlatforms)) continue;
  
  $pub = [
    'id' => uuid_v4(),
    'proposal_id' => $proposalId,
    'platform' => $platform,
    'status' => 'pending',
    'url' => null,
    'published_at' => null,
    'error_message' => null,
    'metadata' => ['requested_by' => $payload['email'] ?? 'editor'],
    'created_at' => date('c')
  ];
  
  $pubData['publications'][] = $pub;
  $results[] = ['platform' => $platform, 'publication_id' => $pub['id'], 'status' => 'pending'];
}

file_put_contents($pubPath, json_encode($pubData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

echo json_encode([
  'ok' => true,
  'proposal_id' => $proposalId,
  'platforms_requested' => $platforms,
  'publications' => $results,
  'message' => 'Publicaciones creadas. La ejecución real requiere Node.js y API keys.'
]);