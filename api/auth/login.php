<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  exit(0);
}

require_once __DIR__ . '/../lib/database.php';

$data = json_decode(file_get_contents('php://input'), true);
$email = $data['email'] ?? '';
$password = $data['password'] ?? '';

if (!is_string($email) || !is_string($password) || trim($email) === '' || trim($password) === '') {
  http_response_code(400);
  echo json_encode(['error' => 'Email y password son requeridos']);
  exit;
}

$user = dbFetchOne(
  "SELECT id, email, nombre_completo, rol, password_hash
   FROM usuarios
   WHERE LOWER(email) = LOWER(:email) AND activo = TRUE AND deleted_at IS NULL
   LIMIT 1",
  ['email' => $email]
);

if (!$user || empty($user['password_hash']) || !password_verify($password, $user['password_hash'])) {
  http_response_code(401);
  echo json_encode(['error' => 'Credenciales incorrectas']);
  exit;
}

$token = base64_encode(json_encode([
  'sub' => $user['id'],
  'email' => $user['email'],
  'nombre' => $user['nombre_completo'],
  'rol' => $user['rol'],
  'exp' => time() + (8 * 3600)
]));

setcookie('crea_editor_session', $token, [
  'expires' => time() + (8 * 3600),
  'httponly' => false,
  'samesite' => 'Lax',
  'path' => '/'
]);

echo json_encode([
  'ok' => true,
  'usuario' => ['nombre' => $user['nombre_completo'], 'email' => $user['email'], 'rol' => $user['rol']]
]);
?>
