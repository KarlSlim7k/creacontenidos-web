<?php

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

  $payload = json_decode(base64_decode($token), true);
  if (!$payload || ($payload['exp'] ?? 0) < time()) {
    http_response_code(401);
    echo json_encode(['error' => 'Sesión expirada']);
    exit;
  }

  return $payload;
}
