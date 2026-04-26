<?php
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/database.php';

if ($method !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Método no permitido']);
  exit;
}

requireAuth();
$data = json_decode(file_get_contents('php://input'), true);

$type = $data['type'] ?? null;
$proposalId = $data['proposal_id'] ?? null;
$params = $data['params'] ?? [];

if (!$type || !in_array($type, ['audio', 'image', 'meme', 'infographic'])) {
  http_response_code(400);
  echo json_encode(['error' => 'Tipo inválido. Use: audio, image, meme, infographic']);
  exit;
}

$piezaId = $proposalId ?: null;
$tipoDb = $type === 'infographic' ? 'infographic' : $type;

if (!$piezaId) {
  http_response_code(400);
  echo json_encode(['error' => 'proposal_id es requerido']);
  exit;
}

$originalPrompt = '';
if ($type === 'audio') {
  $originalPrompt = (string)($params['text'] ?? '');
} elseif ($type === 'image') {
  $originalPrompt = (string)($params['prompt'] ?? '');
} elseif ($type === 'meme') {
  $originalPrompt = (string)($params['image_prompt'] ?? '');
} elseif ($type === 'infographic') {
  $originalPrompt = (string)($params['topic'] ?? '');
}

if (trim($originalPrompt) === '') {
  http_response_code(400);
  echo json_encode(['error' => 'params requeridos para generar el asset']);
  exit;
}

try {
  $row = dbInsert('assets_multimedia', [
    'pieza_id' => $piezaId,
    'tipo' => $tipoDb,
    'original_prompt' => $originalPrompt,
    'file_path' => null,
    'estado' => 'queued',
    'cost_tokens' => null,
    'metadata' => json_encode([
      'requested_at' => gmdate('c'),
      'requested_by' => 'editor',
      'params' => $params,
    ]),
  ], 'id, pieza_id, tipo, estado, created_at');

  echo json_encode([
    'ok' => true,
    'queued' => true,
    'message' => 'Asset encolado para generación',
    'asset' => [
      'id' => $row['id'],
      'proposal_id' => $row['pieza_id'],
      'type' => $row['tipo'],
      'status' => $row['estado'],
      'created_at' => isoDateTime($row['created_at'] ?? null),
    ],
  ]);
  exit;
} catch (Throwable $e) {
  error_log('[assets/generate] ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['error' => 'No se pudo encolar el asset']);
  exit;
}
?>
