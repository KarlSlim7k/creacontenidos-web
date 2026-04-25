<?php
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$dataPath = __DIR__ . '/../../data/content_proposals.json';

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

function generateUuid() {
  return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
    mt_rand(0, 0xffff), mt_rand(0, 0xffff),
    mt_rand(0, 0xffff),
    mt_rand(0, 0x0fff) | 0x4000,
    mt_rand(0, 0x3fff) | 0x8000,
    mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
  );
}

function loadProposals() {
  global $dataPath;
  $data = json_decode(file_get_contents($dataPath), true);
  return $data['proposals'] ?? [];
}

function saveProposals($proposals) {
  global $dataPath;
  $data = ['proposals' => $proposals];
  file_put_contents($dataPath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

if ($method === 'GET') {
  $proposals = loadProposals();
  $id = $_GET['id'] ?? null;
  $status = $_GET['status'] ?? null;
  $format = $_GET['format'] ?? null;
  $topicId = $_GET['topic_id'] ?? null;
  $aiLabel = $_GET['ai_label'] ?? null;
  $scheduled = $_GET['scheduled'] ?? null;

  if ($id) {
    $found = null;
    foreach ($proposals as $p) {
      if ($p['id'] === $id) {
        $found = $p;
        break;
      }
    }
    if (!$found) {
      http_response_code(404);
      echo json_encode(['error' => 'Propuesta no encontrada']);
      exit;
    }
    echo json_encode(['proposal' => $found]);
    exit;
  }

  if ($status) {
    $proposals = array_values(array_filter($proposals, fn($p) => ($p['status'] ?? '') === $status));
  }
  if ($format) {
    $proposals = array_values(array_filter($proposals, fn($p) => ($p['format'] ?? '') === $format));
  }
  if ($topicId) {
    $proposals = array_values(array_filter($proposals, fn($p) => ($p['topic_id'] ?? '') === $topicId));
  }
  if ($aiLabel) {
    $proposals = array_values(array_filter($proposals, fn($p) => ($p['ai_label'] ?? '') === $aiLabel));
  }
  if ($scheduled !== null) {
    $wantScheduled = $scheduled === 'true' || $scheduled === '1';
    $proposals = array_values(array_filter($proposals, fn($p) => !empty($p['scheduled_at']) === $wantScheduled));
  }
  
  usort($proposals, fn($a, $b) => strcmp($b['created_at'] ?? '', $a['created_at'] ?? ''));
  echo json_encode(['proposals' => $proposals]);
  exit;
}

if ($method === 'POST') {
  requireAuth();
  $data = json_decode(file_get_contents('php://input'), true);
  
  $newProposal = [
    'id' => generateUuid(),
    'topic_id' => $data['topic_id'] ?? null,
    'format' => $data['format'] ?? 'nota',
    'title' => $data['title'] ?? '',
    'body' => $data['body'] ?? '',
    'image_prompt' => $data['image_prompt'] ?? null,
    'ai_label' => $data['ai_label'] ?? 'asistido',
    'status' => $data['status'] ?? 'draft',
    'rejection_reason' => null,
    'created_at' => date('c'),
    'updated_at' => date('c'),
    'created_by' => 'claude'
  ];
  
  $proposals = loadProposals();
  $proposals[] = $newProposal;
  saveProposals($proposals);
  echo json_encode(['ok' => true, 'proposal' => $newProposal]);
  exit;
}

if ($method === 'PATCH') {
  requireAuth();
  $data = json_decode(file_get_contents('php://input'), true);
  $id = $data['id'] ?? null;
  if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'El ID es requerido']);
    exit;
  }
  
  $proposals = loadProposals();
  $found = false;
  foreach ($proposals as $i => $p) {
    if ($p['id'] === $id) {
      $allowed = ['topic_id', 'format', 'title', 'body', 'image_prompt', 'ai_label', 'status', 'rejection_reason'];
      foreach ($allowed as $field) {
        if (isset($data[$field])) {
          $proposals[$i][$field] = $data[$field];
        }
      }
      $proposals[$i]['updated_at'] = date('c');
      $found = true;
      break;
    }
  }
  
  if (!$found) {
    http_response_code(404);
    echo json_encode(['error' => 'Propuesta no encontrada']);
    exit;
  }
  
  saveProposals($proposals);
  echo json_encode(['ok' => true, 'proposal' => $proposals[$i]]);
  exit;
}

if ($method === 'DELETE') {
  requireAuth();
  $id = $_GET['id'] ?? null;
  if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'El ID es requerido']);
    exit;
  }
  
  $proposals = loadProposals();
  $initialCount = count($proposals);
  $proposals = array_values(array_filter($proposals, fn($p) => $p['id'] !== $id));
  
  if (count($proposals) === $initialCount) {
    http_response_code(404);
    echo json_encode(['error' => 'Propuesta no encontrada']);
    exit;
  }
  
  saveProposals($proposals);
  echo json_encode(['ok' => true, 'deleted' => $initialCount - count($proposals)]);
  exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
?>