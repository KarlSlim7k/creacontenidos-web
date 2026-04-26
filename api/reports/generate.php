<?php
header('Content-Type: application/json');

require_once __DIR__ . '/../lib/env.php';
require_once __DIR__ . '/../lib/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Método no permitido']);
  exit;
}

requireAuth();

$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data)) {
  http_response_code(400);
  echo json_encode(['error' => 'JSON inválido']);
  exit;
}

$clientId = trim((string)($data['client_id'] ?? ''));
$month = (int)($data['month'] ?? 0);
$year = (int)($data['year'] ?? 0);

if (!preg_match('/^[0-9a-f-]{36}$/i', $clientId)) {
  http_response_code(400);
  echo json_encode(['error' => 'client_id inválido']);
  exit;
}

if ($month < 1 || $month > 12) {
  http_response_code(400);
  echo json_encode(['error' => 'month debe estar entre 1 y 12']);
  exit;
}

if ($year < 2000 || $year > 2100) {
  http_response_code(400);
  echo json_encode(['error' => 'year inválido']);
  exit;
}

$root = realpath(__DIR__ . '/../..');
$script = $root ? $root . '/services/report-generator.js' : null;

if (!$script || !is_file($script)) {
  http_response_code(500);
  echo json_encode(['error' => 'Generador de reportes no disponible']);
  exit;
}

$nodeBin = getenv('NODE_BIN') ?: 'node';
$command = implode(' ', [
  escapeshellcmd($nodeBin),
  escapeshellarg($script),
  '--client-id',
  escapeshellarg($clientId),
  '--month',
  escapeshellarg((string)$month),
  '--year',
  escapeshellarg((string)$year),
]);

$descriptorSpec = [
  1 => ['pipe', 'w'],
  2 => ['pipe', 'w'],
];

$process = proc_open($command, $descriptorSpec, $pipes, $root);
if (!is_resource($process)) {
  http_response_code(500);
  echo json_encode(['error' => 'No se pudo iniciar el generador']);
  exit;
}

$stdout = stream_get_contents($pipes[1]);
$stderr = stream_get_contents($pipes[2]);
fclose($pipes[1]);
fclose($pipes[2]);
$exitCode = proc_close($process);

if ($exitCode !== 0) {
  error_log('[reports/generate] ' . trim($stderr ?: $stdout));
  http_response_code(500);
  echo json_encode(['error' => 'No se pudo generar el reporte']);
  exit;
}

$result = json_decode(trim($stdout), true);
if (!is_array($result) || empty($result['ok']) || empty($result['url']) || empty($result['path'])) {
  error_log('[reports/generate] Respuesta inválida: ' . trim($stdout));
  http_response_code(500);
  echo json_encode(['error' => 'Respuesta inválida del generador']);
  exit;
}

echo json_encode([
  'ok' => true,
  'url' => $result['url'],
  'path' => $result['path'],
]);
?>
