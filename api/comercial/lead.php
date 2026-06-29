<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Método no permitido']);
  exit;
}

require_once __DIR__ . '/../lib/database.php';

$data = json_decode(file_get_contents('php://input'), true);

// Honeypot anti-spam
if (!empty($data['website'])) {
  http_response_code(200);
  echo json_encode(['ok' => true]);
  exit;
}

$nombre = trim($data['nombre'] ?? '');
$empresa = trim($data['empresa'] ?? '');
$email = trim($data['email'] ?? '');
$telefono = trim($data['telefono'] ?? '');
$producto = trim($data['producto'] ?? '');
$mensaje = trim($data['mensaje'] ?? '');

if (empty($nombre)) {
  http_response_code(400);
  echo json_encode(['error' => 'El nombre es requerido']);
  exit;
}
if (empty($telefono) && empty($email)) {
  http_response_code(400);
  echo json_encode(['error' => 'Necesitamos al menos un teléfono o correo']);
  exit;
}
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
  http_response_code(400);
  echo json_encode(['error' => 'Correo electrónico inválido']);
  exit;
}

// Mapear producto a tipo_producto_comercial (enum en DB)
$productoMap = [
  'patrocinio' => 'patrocinio_seccion',
  'branded-premium' => 'branded_content_premium',
  'branded-basico' => 'branded_content_basico',
  'evento' => 'cobertura_evento',
  'display' => 'publicidad_display',
  'otro' => null
];
$tipoProducto = $productoMap[$producto] ?? null;
$tipoProductoArr = $tipoProducto ? '{' . $tipoProducto . '}' : null;

$metadata = [
  'fuente' => 'formulario_comercial',
  'ip_origen' => $_SERVER['REMOTE_ADDR'] ?? null,
  'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
  'enviado_en' => date('c'),
];
if ($mensaje !== '') $metadata['mensaje'] = $mensaje;

try {
  $row = dbInsert('prospectos', [
    'nombre_empresa' => $empresa !== '' ? $empresa : 'Por contactar',
    'nombre_contacto' => $nombre,
    'email_contacto' => $email !== '' ? strtolower($email) : null,
    'telefono_contacto' => $telefono !== '' ? $telefono : null,
    'tipo_producto_interes' => $tipoProductoArr,
    'origen_descripcion' => 'formulario_comercial',
    'estado_pipeline' => 'identificado',
    'metadata' => json_encode($metadata),
  ], 'id, nombre_empresa, nombre_contacto, estado_pipeline');

  // Notificar al equipo comercial via notificacion interna
  try {
    dbInsert('notificaciones', [
      'usuario_id' => null,
      'tipo' => 'prospecto_nuevo',
      'titulo' => 'Nuevo prospecto desde comercial',
      'cuerpo' => $empresa !== '' ? "$empresa ($nombre)" : $nombre,
      'referencia_tipo' => 'prospecto',
      'referencia_id' => $row['id'],
      'metadata' => json_encode(['producto' => $producto]),
    ]);
  } catch (Throwable $e) {
    // No bloquear el submit si falla la notificacion
    error_log('[comercial/lead] notificacion failed: ' . $e->getMessage());
  }

  echo json_encode([
    'ok' => true,
    'message' => '¡Gracias! El equipo comercial te contactará en menos de 24 horas.',
    'prospecto_id' => $row['id']
  ]);
} catch (Throwable $e) {
  error_log('[comercial/lead] insert failed: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['error' => 'No pudimos registrar tu solicitud. Intenta de nuevo o escríbenos por WhatsApp.']);
}