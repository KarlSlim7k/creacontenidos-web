<?php

require_once __DIR__ . '/env.php';

function base64url_encode(string $data): string
{
  return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string
{
  $data = strtr($data, '-_', '+/');
  $padLen = 4 - (strlen($data) % 4);
  if ($padLen < 4) {
    $data .= str_repeat('=', $padLen);
  }
  $decoded = base64_decode($data, true);
  return $decoded === false ? '' : $decoded;
}

function createJWT(array $payload, string $secret): string
{
  $header = ['alg' => 'HS256', 'typ' => 'JWT'];

  if (!isset($payload['iat'])) $payload['iat'] = time();
  if (!isset($payload['exp'])) $payload['exp'] = time() + (8 * 3600);

  $encodedHeader = base64url_encode(json_encode($header, JSON_UNESCAPED_SLASHES));
  $encodedPayload = base64url_encode(json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

  $signingInput = $encodedHeader . '.' . $encodedPayload;
  $signature = hash_hmac('sha256', $signingInput, $secret, true);
  $encodedSignature = base64url_encode($signature);

  return $encodedHeader . '.' . $encodedPayload . '.' . $encodedSignature;
}

function decodeJWT(string $token): ?array
{
  $parts = explode('.', $token);
  if (count($parts) !== 3) return null;
  $payloadJson = base64url_decode($parts[1]);
  $payload = json_decode($payloadJson, true);
  return is_array($payload) ? $payload : null;
}

function validateJWT(string $token, string $secret): ?array
{
  $parts = explode('.', $token);
  if (count($parts) !== 3) return null;

  [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;
  if ($encodedHeader === '' || $encodedPayload === '' || $encodedSignature === '') return null;

  $signingInput = $encodedHeader . '.' . $encodedPayload;
  $expected = base64url_encode(hash_hmac('sha256', $signingInput, $secret, true));
  if (!hash_equals($expected, $encodedSignature)) return null;

  $payload = decodeJWT($token);
  if (!$payload) return null;
  $exp = (int)($payload['exp'] ?? 0);
  if ($exp <= time()) return null;

  return $payload;
}

