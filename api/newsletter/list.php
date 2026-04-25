<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  exit(0);
}

// Require auth for listing subscribers
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

$filePath = __DIR__ . '/../../data/subscribers.json';

if (!file_exists($filePath)) {
  echo json_encode(['total' => 0, 'subscribers' => []]);
  exit;
}

$store = json_decode(file_get_contents($filePath), true);
$subscribers = $store['subscribers'] ?? [];

// Filter by active status if requested
$activeFilter = $_GET['active'] ?? null;
if ($activeFilter === 'true') {
  $subscribers = array_values(array_filter($subscribers, fn($s) => $s['active'] === true));
} elseif ($activeFilter === 'false') {
  $subscribers = array_values(array_filter($subscribers, fn($s) => $s['active'] === false));
}

echo json_encode([
  'total' => count($subscribers),
  'subscribers' => $subscribers
]);
?>
