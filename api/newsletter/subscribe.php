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

// Honeypot
if (!empty($data['website'])) {
  http_response_code(200);
  echo json_encode(['ok' => true]);
  exit;
}

$email = trim($data['email'] ?? '');
$whatsapp = trim($data['whatsapp'] ?? '');

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
  http_response_code(400);
  echo json_encode(['error' => 'Correo electrónico inválido']);
  exit;
}

$emailNorm = strtolower($email);

// Verificar duplicado en prospectos con origen newsletter
$exists = dbFetchOne(
  "SELECT id FROM prospectos
   WHERE LOWER(email_contacto) = :email
     AND origen_descripcion = 'newsletter'
     AND deleted_at IS NULL
   LIMIT 1",
  ['email' => $emailNorm]
);
if ($exists) {
  http_response_code(409);
  echo json_encode(['error' => 'Este correo ya está suscrito']);
  exit;
}

$metadata = [
  'fuente' => 'newsletter_form',
  'ip_origen' => $_SERVER['REMOTE_ADDR'] ?? null,
  'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
  'enviado_en' => date('c'),
];

try {
  $row = dbInsert('prospectos', [
    'nombre_empresa' => 'Suscriptor newsletter',
    'nombre_contacto' => null,
    'email_contacto' => $emailNorm,
    'telefono_contacto' => $whatsapp !== '' ? $whatsapp : null,
    'origen_descripcion' => 'newsletter',
    'estado_pipeline' => 'identificado',
    'metadata' => json_encode($metadata),
  ], 'id');

  echo json_encode([
    'ok' => true,
    'message' => '¡Suscripción exitosa! Recibirás Buenos días, Perote cada mañana.'
  ]);
} catch (Throwable $e) {
  error_log('[newsletter/subscribe] insert failed: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['error' => 'No pudimos completar la suscripción. Intenta de nuevo.']);
}