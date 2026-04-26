<?php

require_once __DIR__ . '/jwt.php';

function getAuthToken(): ?string
{
  $token = $_COOKIE['crea_editor_session'] ?? null;
  if ($token) return $token;

  $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  if (preg_match('/^Bearer\s+(.+)$/i', $auth, $m)) {
    return trim($m[1]);
  }

  return null;
}

function requireAuth(): array
{
  $token = getAuthToken();
  if (!$token) {
    http_response_code(401);
    echo json_encode(['error' => 'No autorizado']);
    exit;
  }

  $secret = getenv('JWT_SECRET') ?: '';
  if ($secret === '') {
    http_response_code(500);
    echo json_encode(['error' => 'JWT_SECRET no configurado']);
    exit;
  }

  $payload = validateJWT($token, $secret);
  if (!$payload) {
    http_response_code(401);
    echo json_encode(['error' => 'Sesión expirada']);
    exit;
  }

  return $payload;
}
