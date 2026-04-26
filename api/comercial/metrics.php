<?php
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
  http_response_code(405);
  echo json_encode(['error' => 'Método no permitido']);
  exit;
}

$clientId = $_GET['client_id'] ?? null;

require_once __DIR__ . '/../lib/database.php';

$where = ['p.deleted_at IS NULL'];
$params = [];
if ($clientId) {
  $where[] = 'p.id = :id';
  $params['id'] = $clientId;
}

$rows = dbFetchAll(
  "SELECT
     p.id,
     p.nombre_empresa,
     p.metadata,
     COALESCE(SUM(cc.monto_mxn), 0) AS total_inversion
   FROM patrocinadores p
   LEFT JOIN contratos_comerciales cc
     ON cc.patrocinador_id = p.id AND cc.deleted_at IS NULL AND cc.activo = TRUE
   WHERE " . implode(' AND ', $where) . "
   GROUP BY p.id
   ORDER BY p.nombre_empresa ASC",
  $params
);

$metrics = array_map(function ($r) {
  $meta = json_decode($r['metadata'] ?? '{}', true) ?: [];
  $views = 0;
  $interactions = 0;
  $totalInversion = (float)$r['total_inversion'];
  $cpm = $views > 0 ? ($totalInversion / $views) * 1000 : 0.0;
  return [
    'client_id' => $r['id'],
    'business_name' => $r['nombre_empresa'],
    'package' => $meta['package'] ?? '',
    'views' => $views,
    'interactions' => $interactions,
    'cpm' => $cpm,
    'total_inversion' => $totalInversion,
  ];
}, $rows);

echo json_encode(['metrics' => $metrics]);
?>
