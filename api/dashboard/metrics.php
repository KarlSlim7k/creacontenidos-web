<?php
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
  http_response_code(405);
  echo json_encode(['error' => 'Método no permitido']);
  exit;
}

require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/database.php';

requireAuth();

function metricInt(array $row, string $key): int
{
  return (int)($row[$key] ?? 0);
}

$pieceTotals = dbFetchOne(
  "SELECT
    COALESCE(SUM(vistas_unicas), 0)::bigint AS views,
    COALESCE(SUM(likes + comentarios + compartidos + guardados + clics_enlace), 0)::bigint AS interactions,
    COALESCE(SUM(nuevos_seguidores), 0)::bigint AS followers
   FROM metricas_piezas"
) ?: ['views' => 0, 'interactions' => 0, 'followers' => 0];

$weeklyTotals = dbFetchOne(
  "SELECT
    COALESCE(SUM(vistas_totales), 0)::bigint AS views,
    COALESCE(SUM(interacciones_totales), 0)::bigint AS interactions,
    COALESCE(SUM(nuevos_seguidores_total), 0)::bigint AS followers
   FROM metricas_semanales"
) ?: ['views' => 0, 'interactions' => 0, 'followers' => 0];

$weeklyRows = dbFetchAll(
  "SELECT
    semana_inicio,
    semana_fin,
    vistas_totales,
    interacciones_totales,
    nuevos_seguidores_total
   FROM metricas_semanales
   ORDER BY semana_inicio DESC
   LIMIT 8"
);

$weeklyRows = array_reverse($weeklyRows);

$series = array_map(function (array $row): array {
  return [
    'week_start' => $row['semana_inicio'],
    'week_end' => $row['semana_fin'],
    'views' => (int)($row['vistas_totales'] ?? 0),
    'interactions' => (int)($row['interacciones_totales'] ?? 0),
    'followers' => (int)($row['nuevos_seguidores_total'] ?? 0),
  ];
}, $weeklyRows);

$hasPieceMetrics = metricInt($pieceTotals, 'views') > 0
  || metricInt($pieceTotals, 'interactions') > 0
  || metricInt($pieceTotals, 'followers') > 0;

$totals = $hasPieceMetrics ? $pieceTotals : $weeklyTotals;

echo json_encode([
  'totals' => [
    'views' => metricInt($totals, 'views'),
    'interactions' => metricInt($totals, 'interactions'),
    'followers' => metricInt($totals, 'followers'),
  ],
  'source' => $hasPieceMetrics ? 'metricas_piezas' : 'metricas_semanales',
  'series' => $series,
]);
?>
