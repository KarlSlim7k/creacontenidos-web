<?php
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Método no permitido']);
  exit;
}

require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/database.php';

$payload = requireAuth();

function platformToCanal(?string $platform): ?string
{
  $p = strtolower(trim((string)$platform));
  return match ($p) {
    'facebook' => 'facebook',
    'instagram' => 'instagram',
    'twitter', 'x', 'twitter_x' => 'twitter_x',
    'tiktok' => 'tiktok',
    'youtube' => 'youtube',
    'telegram' => 'telegram',
    'whatsapp' => 'whatsapp',
    'newsletter' => 'newsletter',
    'website', 'sitio_web' => 'sitio_web',
    default => null,
  };
}

$input = json_decode(file_get_contents('php://input'), true);
$proposalId = $input['proposal_id'] ?? null;
$platforms = $input['platforms'] ?? [];

if (!$proposalId) {
  http_response_code(400);
  echo json_encode(['error' => 'proposal_id es requerido']);
  exit;
}

if (empty($platforms) || !is_array($platforms)) {
  http_response_code(400);
  echo json_encode(['error' => 'Al menos una plataforma es requerida']);
  exit;
}

$proposal = dbFetchOne(
  "SELECT id
   FROM piezas_contenido
   WHERE id = :id AND deleted_at IS NULL AND (metadata->>'is_proposal') = 'true'
   LIMIT 1",
  ['id' => $proposalId]
);
if (!$proposal) {
  http_response_code(404);
  echo json_encode(['error' => 'Propuesta no encontrada']);
  exit;
}

$results = [];
foreach ($platforms as $platform) {
  $canal = platformToCanal($platform);
  if (!$canal) continue;

  $row = dbInsert('publicaciones', [
    'pieza_id' => $proposalId,
    'canal' => $canal,
    'estado' => 'programada',
    'metadata' => json_encode(['requested_by' => $payload['email'] ?? 'editor']),
  ], 'id');

  $results[] = [
    'platform' => $platform,
    'publication_id' => $row['id'],
    'status' => 'pending',
  ];
}

echo json_encode([
  'ok' => true,
  'proposal_id' => $proposalId,
  'platforms_requested' => $platforms,
  'publications' => $results,
  'message' => 'Publicaciones creadas. La ejecución real requiere Node.js y API keys.'
]);

