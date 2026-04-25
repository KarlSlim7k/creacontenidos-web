<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];
$dataPath = __DIR__ . '/../../data/topics.json';

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

function loadTopics() {
  global $dataPath;
  if (!file_exists($dataPath)) {
    return ['topics' => []];
  }
  return json_decode(file_get_contents($dataPath), true);
}

function saveTopics($data) {
  global $dataPath;
  file_put_contents($dataPath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function generateUuid() {
  return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
    mt_rand(0, 0xffff), mt_rand(0, 0xffff),
    mt_rand(0, 0xffff), mt_rand(0, 0x0fff) | 0x4000,
    mt_rand(0, 0x3fff) | 0x8000,
    mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
  );
}

if ($method === 'GET') {
  $data = loadTopics();
  $topics = $data['topics'] ?? [];

  $status = $_GET['status'] ?? null;
  $source = $_GET['source'] ?? null;
  $sentiment = $_GET['sentiment'] ?? null;
  $fecha = $_GET['fecha'] ?? null;

  if ($status) {
    $topics = array_values(array_filter($topics, fn($t) => $t['status'] === $status));
  }
  if ($source) {
    $topics = array_values(array_filter($topics, fn($t) => strpos($t['source'], $source) !== false));
  }
  if ($sentiment) {
    $topics = array_values(array_filter($topics, fn($t) => $t['sentiment'] === $sentiment));
  }
  if ($fecha) {
    $topics = array_values(array_filter($topics, fn($t) => strpos($t['detected_at'], $fecha) === 0));
  }

  usort($topics, fn($a, $b) => strcmp($b['detected_at'], $a['detected_at']));
  echo json_encode(['topics' => $topics]);
  exit;
}

if ($method === 'POST') {
  requireAuth();
  $input = json_decode(file_get_contents('php://input'), true);

  $topic = [
    'id' => generateUuid(),
    'topic' => $input['topic'] ?? '',
    'source' => $input['source'] ?? 'manual',
    'mentions' => $input['mentions'] ?? 1,
    'sentiment' => $input['sentiment'] ?? 'neutral',
    'suggested_formats' => $input['suggested_formats'] ?? ['nota'],
    'detected_at' => date('c'),
    'status' => $input['status'] ?? 'pending'
  ];

  if (empty($topic['topic'])) {
    http_response_code(400);
    echo json_encode(['error' => 'El topic es requerido']);
    exit;
  }

  $data = loadTopics();
  $data['topics'][] = $topic;
  saveTopics($data);

  echo json_encode(['ok' => true, 'topic' => $topic]);
  exit;
}

if ($method === 'PATCH') {
  requireAuth();
  $input = json_decode(file_get_contents('php://input'), true);
  $id = $input['id'] ?? null;

  if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'El ID es requerido']);
    exit;
  }

  $data = loadTopics();
  $found = false;

  foreach ($data['topics'] as $i => $t) {
    if ($t['id'] === $id) {
      $allowed = ['status', 'topic', 'mentions', 'sentiment', 'suggested_formats'];
      foreach ($allowed as $field) {
        if (isset($input[$field])) {
          $data['topics'][$i][$field] = $input[$field];
        }
      }
      $found = true;
      break;
    }
  }

  if (!$found) {
    http_response_code(404);
    echo json_encode(['error' => 'Topic no encontrado']);
    exit;
  }

  saveTopics($data);
  echo json_encode(['ok' => true, 'topic' => $data['topics'][$i]]);
  exit;
}

if ($method === 'DELETE') {
  requireAuth();
  $id = $_GET['id'] ?? null;
  $olderThanDays = $_GET['older_than_days'] ?? null;

  $data = loadTopics();

  if ($id) {
    $initialCount = count($data['topics']);
    $data['topics'] = array_values(array_filter($data['topics'], fn($t) => $t['id'] !== $id));
    if (count($data['topics']) === $initialCount) {
      http_response_code(404);
      echo json_encode(['error' => 'Topic no encontrado']);
      exit;
    }
    saveTopics($data);
    echo json_encode(['ok' => true, 'deleted' => $initialCount - count($data['topics'])]);
    exit;
  }

  if ($olderThanDays) {
    $cutoff = strtotime("-{$olderThanDays} days");
    $beforeCount = count($data['topics']);
    $data['topics'] = array_values(array_filter($data['topics'], function($t) use ($cutoff) {
      return strtotime($t['detected_at']) >= $cutoff;
    }));
    saveTopics($data);
    echo json_encode(['ok' => true, 'deleted' => $beforeCount - count($data['topics'])]);
    exit;
  }

  http_response_code(400);
  echo json_encode(['error' => 'ID o older_than_days requerido']);
  exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
