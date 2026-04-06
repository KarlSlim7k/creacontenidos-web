<?php
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$dataPath = __DIR__ . '/../../data/articles.json';

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

function generateId($articles) {
  $maxId = 0;
  foreach ($articles as $a) {
    if (preg_match('/art-(\d+)/', $a['id'], $m)) {
      $maxId = max($maxId, (int)$m[1]);
    }
  }
  return 'art-' . str_pad($maxId + 1, 3, '0', STR_PAD_LEFT);
}

function generateSlug($titulo) {
  $slug = strtolower(trim($titulo));
  $slug = preg_replace('/[^a-z0-9\s-]/', '', $slug);
  $slug = preg_replace('/\s+/', '-', $slug);
  $slug = preg_replace('/-+/', '-', $slug);
  return $slug;
}

function loadArticles() {
  global $dataPath;
  $data = json_decode(file_get_contents($dataPath), true);
  return $data['articles'] ?? [];
}

function saveArticles($articles) {
  global $dataPath;
  $data = ['articles' => $articles];
  file_put_contents($dataPath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

if ($method === 'GET') {
  $articles = loadArticles();
  $estado = $_GET['estado'] ?? null;
  $categoria = $_GET['categoria'] ?? null;
  if ($estado) {
    $articles = array_values(array_filter($articles, fn($a) => $a['estado'] === $estado));
  }
  if ($categoria) {
    $articles = array_values(array_filter($articles, fn($a) => $a['categoria'] === $categoria));
  }
  usort($articles, fn($a, $b) => strcmp($b['created_at'], $a['created_at']));
  echo json_encode(['articles' => $articles]);
  exit;
}

if ($method === 'POST') {
  requireAuth();
  $data = json_decode(file_get_contents('php://input'), true);
  if (empty($data['titulo'])) {
    http_response_code(400);
    echo json_encode(['error' => 'El título es requerido']);
    exit;
  }
  $articles = loadArticles();
  $newArticle = [
    'id' => generateId($articles),
    'slug' => generateSlug($data['titulo']),
    'titulo' => $data['titulo'],
    'subtitulo' => $data['subtitulo'] ?? '',
    'extracto' => $data['extracto'] ?? '',
    'contenido_html' => $data['contenido_html'] ?? '',
    'imagen_destacada' => $data['imagen_destacada'] ?? '',
    'imagen_alt' => $data['imagen_alt'] ?? '',
    'categoria' => $data['categoria'] ?? 'local',
    'autor' => $data['autor'] ?? '',
    'estado' => $data['estado'] ?? 'borrador',
    'keywords_seo' => $data['keywords_seo'] ?? [],
    'meta_description' => $data['meta_description'] ?? '',
    'fecha_publicacion' => $data['fecha_publicacion'] ?? null,
    'created_at' => date('c'),
    'updated_at' => date('c')
  ];
  $articles[] = $newArticle;
  saveArticles($articles);
  echo json_encode(['ok' => true, 'article' => $newArticle]);
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
  $articles = loadArticles();
  $found = false;
  foreach ($articles as $i => $a) {
    if ($a['id'] === $id) {
      $allowed = ['titulo', 'subtitulo', 'extracto', 'contenido_html', 'imagen_destacada', 'imagen_alt', 'categoria', 'autor', 'estado', 'keywords_seo', 'meta_description', 'fecha_publicacion'];
      foreach ($allowed as $field) {
        if (isset($data[$field])) {
          $articles[$i][$field] = $data[$field];
        }
      }
      if (isset($data['titulo'])) {
        $articles[$i]['slug'] = generateSlug($data['titulo']);
      }
      $articles[$i]['updated_at'] = date('c');
      $found = true;
      break;
    }
  }
  if (!$found) {
    http_response_code(404);
    echo json_encode(['error' => 'Artículo no encontrado']);
    exit;
  }
  saveArticles($articles);
  echo json_encode(['ok' => true, 'article' => $articles[$i]]);
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
  $articles = loadArticles();
  $initialCount = count($articles);
  $articles = array_values(array_filter($articles, fn($a) => $a['id'] !== $id));
  if (count($articles) === $initialCount) {
    http_response_code(404);
    echo json_encode(['error' => 'Artículo no encontrado']);
    exit;
  }
  saveArticles($articles);
  echo json_encode(['ok' => true, 'deleted' => $initialCount - count($articles)]);
  exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
?>