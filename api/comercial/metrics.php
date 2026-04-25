<?php
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
  http_response_code(405);
  echo json_encode(['error' => 'Método no permitido']);
  exit;
}

$clientId = $_GET['client_id'] ?? null;
$clientsPath = __DIR__ . '/../../data/clients.json';

if (!file_exists($clientsPath)) {
  echo json_encode(['metrics' => []]);
  exit;
}

$clientsData = json_decode(file_get_contents($clientsPath), true);
$clients = $clientsData['clients'] ?? [];

if ($clientId) {
  $clients = array_filter($clients, fn($c) => $c['id'] === $clientId);
  $clients = array_values($clients);
}

$metrics = array_map(function($client) {
  return [
    'client_id' => $client['id'],
    'business_name' => $client['business_name'],
    'package' => $client['package'],
    'views' => 0,
    'interactions' => 0,
    'cpm' => 0.0,
    'total_inversion' => 0.0
  ];
}, $clients);

echo json_encode(['metrics' => $metrics]);
?>
