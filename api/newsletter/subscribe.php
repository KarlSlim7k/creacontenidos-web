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

require_once __DIR__ . '/../lib/database.php';

$data = json_decode(file_get_contents('php://input'), true);
$email = trim($data['email'] ?? '');
$whatsapp = trim($data['whatsapp'] ?? '');

// Validate email
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
  http_response_code(400);
  echo json_encode(['error' => 'Correo electrónico inválido']);
  exit;
}

$emailNorm = strtolower($email);
$exists = dbFetchOne('SELECT 1 FROM suscriptores WHERE LOWER(email) = LOWER(:email) LIMIT 1', ['email' => $emailNorm]);
if ($exists) {
  http_response_code(409);
  echo json_encode(['error' => 'Este correo ya está suscrito']);
  exit;
}

dbInsert('suscriptores', [
  'email' => $emailNorm,
  'whatsapp' => $whatsapp !== '' ? $whatsapp : null,
  'activo' => true,
  'metadata' => json_encode(new stdClass()),
]);

echo json_encode([
  'ok' => true,
  'message' => '¡Suscripción exitosa! Recibirás Buenos días, Perote cada mañana.'
]);
?>
