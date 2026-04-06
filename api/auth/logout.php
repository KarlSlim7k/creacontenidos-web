<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  exit(0);
}

setcookie('crea_editor_session', '', ['expires' => time() - 3600, 'path' => '/']);
echo json_encode(['ok' => true]);
?>