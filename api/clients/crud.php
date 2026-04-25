<?php
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$dataPath = __DIR__ . '/../../data/clients.json';

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
    mt_rand(0, 0xffff), mt_rand(0, 0x0fff) | 0x4000,
    mt_rand(0, 0x3fff) | 0x8000,
    mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
  );
}

function loadClients() {
  global $dataPath;
  $data = json_decode(file_get_contents($dataPath), true);
  return $data['clients'] ?? [];
}

function saveClients($clients) {
  global $dataPath;
  $data = ['clients' => $clients];
  file_put_contents($dataPath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

if ($method === 'GET') {
  $clients = loadClients();
  $id = $_GET['id'] ?? null;
  if ($id) {
    $found = null;
    foreach ($clients as $c) {
      if ($c['id'] === $id) { $found = $c; break; }
    }
    if (!$found) {
      http_response_code(404);
      echo json_encode(['error' => 'Cliente no encontrado']);
      exit;
    }
    echo json_encode(['client' => $found]);
    exit;
  }
  $package = $_GET['package'] ?? null;
  $active = $_GET['active'] ?? null;
  if ($package) {
    $clients = array_values(array_filter($clients, fn($c) => $c['package'] === $package));
  }
  if ($active !== null) {
    $clients = array_values(array_filter($clients, fn($c) => $c['active'] === ($active === 'true' || $active === '1')));
  }
  usort($clients, fn($a, $b) => strcmp($a['name'], $b['name']));
  echo json_encode(['clients' => $clients]);
  exit;
}

if ($method === 'POST') {
  requireAuth();
  $data = json_decode(file_get_contents('php://input'), true);
  
  $errors = [];
  if (empty($data['name'])) $errors[] = 'El nombre de contacto es requerido';
  if (empty($data['business_name'])) $errors[] = 'El nombre de empresa es requerido';
  if (empty($data['package'])) $errors[] = 'El paquete es requerido';
  if (!in_array($data['package'], ['basico', 'premium', 'gold'])) $errors[] = 'Paquete inválido (basico, premium o gold)';
  if ($errors) {
    http_response_code(400);
    echo json_encode(['error' => implode(', ', $errors)]);
    exit;
  }
  
  $clients = loadClients();
  $newClient = [
    'id' => generateUuid(),
    'name' => trim($data['name']),
    'business_name' => trim($data['business_name']),
    'package' => $data['package'],
    'phone' => $data['phone'] ?? '',
    'email' => $data['email'] ?? '',
    'start_date' => $data['start_date'] ?? date('Y-m-d'),
    'active' => $data['active'] ?? true
  ];
  $clients[] = $newClient;
  saveClients($clients);
  echo json_encode(['ok' => true, 'client' => $newClient]);
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
  
  $clients = loadClients();
  $found = false;
  foreach ($clients as $i => $c) {
    if ($c['id'] === $id) {
      $allowed = ['name', 'business_name', 'package', 'phone', 'email', 'start_date', 'active'];
      foreach ($allowed as $field) {
        if (isset($data[$field])) {
          $clients[$i][$field] = $data[$field];
        }
      }
      if (isset($data['package']) && !in_array($data['package'], ['basico', 'premium', 'gold'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Paquete inválido (basico, premium o gold)']);
        exit;
      }
      $found = true;
      break;
    }
  }
  if (!$found) {
    http_response_code(404);
    echo json_encode(['error' => 'Cliente no encontrado']);
    exit;
  }
  saveClients($clients);
  echo json_encode(['ok' => true, 'client' => $clients[$i]]);
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
  $clients = loadClients();
  $initialCount = count($clients);
  $clients = array_values(array_filter($clients, fn($c) => $c['id'] !== $id));
  if (count($clients) === $initialCount) {
    http_response_code(404);
    echo json_encode(['error' => 'Cliente no encontrado']);
    exit;
  }
  saveClients($clients);
  echo json_encode(['ok' => true, 'deleted' => $initialCount - count($clients)]);
  exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
?>
