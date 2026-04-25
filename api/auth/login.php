<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  exit(0);
}

$data = json_decode(file_get_contents('php://input'), true);
$email = $data['email'] ?? '';
$password = $data['password'] ?? '';

$usersPath = __DIR__ . '/../../data/users.json';
if (!file_exists($usersPath)) {
  http_response_code(500);
  echo json_encode(['error' => 'Archivo de usuarios no encontrado']);
  exit;
}

$users = json_decode(file_get_contents($usersPath), true);
$user = null;

foreach ($users as $u) {
  if ($u['email'] === $email && password_verify($password, $u['password'])) {
    $user = $u;
    break;
  }
}

if (!$user) {
  http_response_code(401);
  echo json_encode(['error' => 'Credenciales incorrectas']);
  exit;
}

$token = base64_encode(json_encode([
  'sub' => $user['id'],
  'email' => $user['email'],
  'nombre' => $user['nombre'],
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
  'usuario' => ['nombre' => $user['nombre'], 'email' => $user['email'], 'rol' => $user['rol']]
]);
?>