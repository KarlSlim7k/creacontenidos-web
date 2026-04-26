<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  exit(0);
}

require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/database.php';

requireAuth();

$activeFilter = $_GET['active'] ?? null;

$where = [];
$params = [];
if ($activeFilter === 'true') {
  $where[] = 'activo = TRUE';
} elseif ($activeFilter === 'false') {
  $where[] = 'activo = FALSE';
}

$sql = 'SELECT email, whatsapp, subscribed_at, activo FROM suscriptores';
if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
$sql .= ' ORDER BY subscribed_at DESC';

$rows = dbFetchAll($sql, $params);
$subscribers = array_map(function ($r) {
  return [
    'email' => $r['email'],
    'whatsapp' => $r['whatsapp'] ?? '',
    'subscribed_at' => isoDateTime($r['subscribed_at'] ?? null),
    'active' => (bool)$r['activo'],
  ];
}, $rows);

echo json_encode([
  'total' => count($subscribers),
  'subscribers' => $subscribers
]);
?>
