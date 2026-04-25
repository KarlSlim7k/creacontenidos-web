<?php
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

function requireAuth() {
  $token = $_COOKIE['crea_editor_session'] ?? null;
  if (!$token) {
    http_response_code(401);
    echo json_encode(['error' => 'No autorizado']);
    exit;
  }
  $payload = json_decode(base64_decode($token), true);
  if (!$payload || $payload['exp'] < time()) {
    http_response_code(401);
    echo json_encode(['error' => 'Sesión expirada']);
    exit;
  }
  return $payload;
}

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

if ($type === 'audio') {
  echo json_encode([
    'ok' => true,
    'placeholder' => true,
    'message' => 'Audio generation PLACEHOLDER - no real API call',
    'type' => 'audio',
    'proposal_id' => $proposalId,
    'would_call' => 'audio-generator.js::generateAudio()',
    'params' => [
      'text' => $params['text'] ?? '',
      'voice_id' => $params['voice_id'] ?? 'elevenlabs_voice_id_placeholder'
    ]
  ]);
  exit;
}

if ($type === 'image') {
  echo json_encode([
    'ok' => true,
    'placeholder' => true,
    'message' => 'Image generation PLACEHOLDER - no real API call',
    'type' => 'image',
    'proposal_id' => $proposalId,
    'would_call' => 'image-generator.js::generateImage()',
    'params' => [
      'prompt' => $params['prompt'] ?? ''
    ]
  ]);
  exit;
}

if ($type === 'meme') {
  echo json_encode([
    'ok' => true,
    'placeholder' => true,
    'message' => 'Meme generation PLACEHOLDER - no real API call',
    'type' => 'meme',
    'proposal_id' => $proposalId,
    'would_call' => 'image-generator.js::createMeme()',
    'params' => [
      'image_prompt' => $params['image_prompt'] ?? '',
      'top_text' => $params['top_text'] ?? '',
      'bottom_text' => $params['bottom_text'] ?? ''
    ]
  ]);
  exit;
}

if ($type === 'infographic') {
  echo json_encode([
    'ok' => true,
    'placeholder' => true,
    'message' => 'Infographic generation PLACEHOLDER - no real API call',
    'type' => 'infographic',
    'proposal_id' => $proposalId,
    'would_call' => 'image-generator.js::createInfographic()',
    'params' => [
      'topic' => $params['topic'] ?? '',
      'data' => $params['data'] ?? []
    ]
  ]);
  exit;
}

http_response_code(400);
echo json_encode(['error' => 'Tipo no soportado']);
?>
