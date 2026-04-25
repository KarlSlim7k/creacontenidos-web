<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Método no permitido']);
  exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$email = trim($data['email'] ?? '');
$whatsapp = trim($data['whatsapp'] ?? '');

// Validate email
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
  http_response_code(400);
  echo json_encode(['error' => 'Correo electrónico inválido']);
  exit;
}

$filePath = __DIR__ . '/../../data/subscribers.json';

if (!file_exists($filePath)) {
  file_put_contents($filePath, json_encode(['subscribers' => []]));
}

$store = json_decode(file_get_contents($filePath), true);
$subscribers = $store['subscribers'] ?? [];

// Check for duplicates
foreach ($subscribers as $sub) {
  if (strtolower($sub['email']) === strtolower($email)) {
    http_response_code(409);
    echo json_encode(['error' => 'Este correo ya está suscrito']);
    exit;
  }
}

// Add subscriber
$subscribers[] = [
  'email' => strtolower($email),
  'whatsapp' => $whatsapp,
  'subscribed_at' => date('c'),
  'active' => true
];

$store['subscribers'] = $subscribers;
file_put_contents($filePath, json_encode($store, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

echo json_encode([
  'ok' => true,
  'message' => '¡Suscripción exitosa! Recibirás Buenos días, Perote cada mañana.'
]);
?>
