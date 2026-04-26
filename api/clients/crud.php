<?php
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/database.php';

if ($method === 'GET') {
  $id = $_GET['id'] ?? null;
  if ($id) {
    $row = dbFetchOne(
      "SELECT
        id,
        contacto_nombre,
        nombre_empresa,
        contacto_tel,
        contacto_email,
        activo,
        metadata
      FROM patrocinadores
      WHERE id = :id AND deleted_at IS NULL
      LIMIT 1",
      ['id' => $id]
    );

    if (!$row) {
      http_response_code(404);
      echo json_encode(['error' => 'Cliente no encontrado']);
      exit;
    }
    $meta = json_decode($row['metadata'] ?? '{}', true) ?: [];
    echo json_encode(['client' => [
      'id' => $row['id'],
      'name' => $row['contacto_nombre'] ?? '',
      'business_name' => $row['nombre_empresa'] ?? '',
      'package' => $meta['package'] ?? '',
      'phone' => $row['contacto_tel'] ?? '',
      'email' => $row['contacto_email'] ?? '',
      'start_date' => $meta['start_date'] ?? '',
      'active' => (bool)$row['activo'],
    ]]);
    exit;
  }

  $package = $_GET['package'] ?? null;
  $active = $_GET['active'] ?? null;

  $where = ['deleted_at IS NULL'];
  $params = [];
  if ($package) {
    $where[] = "metadata->>'package' = :package";
    $params['package'] = $package;
  }
  if ($active !== null) {
    $where[] = 'activo = :activo';
    $params['activo'] = ($active === 'true' || $active === '1');
  }

  $rows = dbFetchAll(
    "SELECT id, contacto_nombre, nombre_empresa, contacto_tel, contacto_email, activo, metadata
     FROM patrocinadores
     WHERE " . implode(' AND ', $where) . "
     ORDER BY contacto_nombre ASC NULLS LAST, nombre_empresa ASC",
    $params
  );

  $clients = array_map(function ($r) {
    $meta = json_decode($r['metadata'] ?? '{}', true) ?: [];
    return [
      'id' => $r['id'],
      'name' => $r['contacto_nombre'] ?? '',
      'business_name' => $r['nombre_empresa'] ?? '',
      'package' => $meta['package'] ?? '',
      'phone' => $r['contacto_tel'] ?? '',
      'email' => $r['contacto_email'] ?? '',
      'start_date' => $meta['start_date'] ?? '',
      'active' => (bool)$r['activo'],
    ];
  }, $rows);

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

  $meta = [
    'package' => $data['package'],
    'start_date' => $data['start_date'] ?? date('Y-m-d'),
  ];

  $row = dbInsert('patrocinadores', [
    'contacto_nombre' => trim((string)$data['name']),
    'nombre_empresa' => trim((string)$data['business_name']),
    'contacto_tel' => $data['phone'] ?? null,
    'contacto_email' => $data['email'] ?? null,
    'activo' => isset($data['active']) ? (bool)$data['active'] : true,
    'metadata' => json_encode($meta),
  ], 'id, contacto_nombre, nombre_empresa, contacto_tel, contacto_email, activo, metadata');

  $metaOut = json_decode($row['metadata'] ?? '{}', true) ?: [];
  $newClient = [
    'id' => $row['id'],
    'name' => $row['contacto_nombre'] ?? '',
    'business_name' => $row['nombre_empresa'] ?? '',
    'package' => $metaOut['package'] ?? '',
    'phone' => $row['contacto_tel'] ?? '',
    'email' => $row['contacto_email'] ?? '',
    'start_date' => $metaOut['start_date'] ?? '',
    'active' => (bool)$row['activo'],
  ];

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

  $current = dbFetchOne('SELECT id, metadata FROM patrocinadores WHERE id = :id AND deleted_at IS NULL', ['id' => $id]);
  if (!$current) {
    http_response_code(404);
    echo json_encode(['error' => 'Cliente no encontrado']);
    exit;
  }

  if (isset($data['package']) && !in_array($data['package'], ['basico', 'premium', 'gold'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Paquete inválido (basico, premium o gold)']);
    exit;
  }

  $meta = json_decode($current['metadata'] ?? '{}', true) ?: [];
  if (isset($data['package'])) $meta['package'] = $data['package'];
  if (isset($data['start_date'])) $meta['start_date'] = $data['start_date'];

  $updates = ['metadata' => json_encode($meta)];
  if (isset($data['name'])) $updates['contacto_nombre'] = $data['name'];
  if (isset($data['business_name'])) $updates['nombre_empresa'] = $data['business_name'];
  if (isset($data['phone'])) $updates['contacto_tel'] = $data['phone'];
  if (isset($data['email'])) $updates['contacto_email'] = $data['email'];
  if (isset($data['active'])) $updates['activo'] = (bool)$data['active'];

  $row = dbUpdate('patrocinadores', $updates, 'id = :id AND deleted_at IS NULL', ['id' => $id], 'id, contacto_nombre, nombre_empresa, contacto_tel, contacto_email, activo, metadata');
  if (!$row) {
    http_response_code(404);
    echo json_encode(['error' => 'Cliente no encontrado']);
    exit;
  }

  $metaOut = json_decode($row['metadata'] ?? '{}', true) ?: [];
  echo json_encode(['ok' => true, 'client' => [
    'id' => $row['id'],
    'name' => $row['contacto_nombre'] ?? '',
    'business_name' => $row['nombre_empresa'] ?? '',
    'package' => $metaOut['package'] ?? '',
    'phone' => $row['contacto_tel'] ?? '',
    'email' => $row['contacto_email'] ?? '',
    'start_date' => $metaOut['start_date'] ?? '',
    'active' => (bool)$row['activo'],
  ]]);
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

  $deleted = dbExec('UPDATE patrocinadores SET deleted_at = NOW(), activo = FALSE WHERE id = :id AND deleted_at IS NULL', ['id' => $id]);
  if ($deleted <= 0) {
    http_response_code(404);
    echo json_encode(['error' => 'Cliente no encontrado']);
    exit;
  }
  echo json_encode(['ok' => true, 'deleted' => $deleted]);
  exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
?>
