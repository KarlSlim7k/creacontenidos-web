<?php
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/database.php';

function generateSlug(string $titulo): string
{
  $slug = strtolower(trim($titulo));
  $slug = preg_replace('/[^\p{L}\p{N}\s-]/u', '', $slug);
  $slug = preg_replace('/\s+/u', '-', $slug);
  $slug = preg_replace('/-+/u', '-', $slug);
  $slug = trim($slug, '-');
  if ($slug === '') $slug = 'articulo';
  return $slug;
}

function ensureUniqueSlug(string $baseSlug, ?string $ignoreId = null): string
{
  $slug = $baseSlug;
  $n = 1;
  while (true) {
    $params = ['slug' => $slug];
    $sql = "SELECT 1 FROM piezas_contenido WHERE slug = :slug AND deleted_at IS NULL";
    if ($ignoreId) {
      $sql .= " AND id <> :id";
      $params['id'] = $ignoreId;
    }
    $exists = dbFetchOne($sql . " LIMIT 1", $params);
    if (!$exists) return $slug;
    $n++;
    $slug = $baseSlug . '-' . $n;
  }
}

function normalizeEstadoPieza(?string $estado): string
{
  $e = strtolower(trim((string)$estado));
  return in_array($e, ['borrador', 'en_revision', 'aprobada', 'publicada', 'rechazada', 'archivada'], true) ? $e : 'borrador';
}

function boolParam(?string $v): bool
{
  if ($v === null) return false;
  $v = strtolower(trim($v));
  return $v === '1' || $v === 'true' || $v === 'yes' || $v === 'on';
}

function categoryPageUrl(?string $slug): string
{
  return match ($slug) {
    'cultura' => '/pages/cultura.html',
    'economia' => '/pages/economia.html',
    'entretenimiento' => '/pages/entretenimiento.html',
    'deportes' => '/pages/deportes.html',
    'opinion' => '/pages/opinion.html',
    default => '/pages/seccion.html',
  };
}

if ($method === 'GET') {
  $token = getAuthToken();
  $isPublic = boolParam($_GET['public'] ?? null) || !$token;
  if ($token && !$isPublic) {
    requireAuth();
  }

  $id = $_GET['id'] ?? null;
  $slug = $_GET['slug'] ?? null;
  $estado = $_GET['estado'] ?? null;
  $categoria = $_GET['categoria'] ?? null;

  $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : null;
  $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
  if ($limit !== null && $limit <= 0) $limit = null;
  if ($limit !== null && $limit > 100) $limit = 100;
  if ($offset < 0) $offset = 0;

  $where = ["pc.deleted_at IS NULL", "pc.formato = 'nota_web'"];
  $params = [];
  if ($id) {
    $where[] = 'pc.id = :id';
    $params['id'] = $id;
  }
  if ($slug) {
    $where[] = 'pc.slug = :slug';
    $params['slug'] = $slug;
  }

  if ($isPublic) {
    $where[] = "pc.estado = 'publicada'";
  }

  if ($estado) {
    if (!$isPublic) {
      $where[] = 'pc.estado = :estado';
      $params['estado'] = normalizeEstadoPieza((string)$estado);
    }
  }
  if ($categoria) {
    $where[] = 'ce.slug = :categoria';
    $params['categoria'] = $categoria;
  }

  $sql = "SELECT
    pc.id,
    pc.slug,
    pc.titulo,
    pc.subtitulo,
    pc.extracto,
    pc.contenido_html,
    pc.imagen_destacada_url,
    pc.imagen_alt,
    ce.slug AS categoria_slug,
    pc.estado::text AS estado,
    to_json(pc.keywords_seo) AS keywords_seo,
    pc.meta_description,
    pc.fecha_publicacion,
    pc.created_at,
    pc.updated_at,
    u.nombre_completo AS autor_nombre,
    pc.metadata
   FROM piezas_contenido pc
   LEFT JOIN categorias_editorial ce ON ce.id = pc.categoria_id
   LEFT JOIN usuarios u ON u.id = pc.autor_id
   WHERE " . implode(' AND ', $where) . "
   ORDER BY COALESCE(pc.fecha_publicacion, pc.created_at) DESC, pc.created_at DESC";

  if ($limit !== null) {
    $sql .= ' LIMIT :limit';
    $params['limit'] = $limit;
  }
  if ($offset > 0) {
    $sql .= ' OFFSET :offset';
    $params['offset'] = $offset;
  }

  $rows = dbFetchAll($sql, $params);

  $articles = array_map(function ($r) {
    $meta = json_decode($r['metadata'] ?? '{}', true) ?: [];
    $kw = [];
    if (isset($r['keywords_seo']) && $r['keywords_seo'] !== null) {
      $kw = json_decode($r['keywords_seo'], true) ?: [];
    }
    $aiLabel = $meta['ai_label'] ?? 'humano';
    return [
      'id' => $r['id'],
      'slug' => $r['slug'],
      'titulo' => $r['titulo'],
      'subtitulo' => $r['subtitulo'] ?? '',
      'extracto' => $r['extracto'] ?? '',
      'contenido_html' => $r['contenido_html'] ?? '',
      'imagen_destacada' => $r['imagen_destacada_url'] ?? '',
      'imagen_alt' => $r['imagen_alt'] ?? '',
      'categoria' => $r['categoria_slug'] ?? 'local',
      'categoria_url' => categoryPageUrl($r['categoria_slug'] ?? 'local'),
      'autor' => $meta['autor_display'] ?? ($r['autor_nombre'] ?? ''),
      'estado' => $r['estado'],
      'keywords_seo' => $kw,
      'meta_description' => $r['meta_description'] ?? '',
      'ai_label' => $aiLabel,
      'fecha_publicacion' => isoDateTime($r['fecha_publicacion'] ?? null),
      'created_at' => isoDateTime($r['created_at'] ?? null),
      'updated_at' => isoDateTime($r['updated_at'] ?? null),
    ];
  }, $rows);

  if ($id || $slug) {
    if (!$articles) {
      http_response_code(404);
      echo json_encode(['error' => 'Artículo no encontrado']);
      exit;
    }
    echo json_encode(['article' => $articles[0]]);
    exit;
  }

  echo json_encode(['articles' => $articles, 'total' => count($articles)]);
  exit;
}

if ($method === 'POST') {
  $payload = requireAuth();
  $data = json_decode(file_get_contents('php://input'), true);
  if (empty($data['titulo'])) {
    http_response_code(400);
    echo json_encode(['error' => 'El título es requerido']);
    exit;
  }

  $slugBase = generateSlug((string)$data['titulo']);
  $slug = ensureUniqueSlug($slugBase);
  $categoriaSlug = $data['categoria'] ?? 'local';
  $categoriaRow = dbFetchOne('SELECT id FROM categorias_editorial WHERE slug = :slug LIMIT 1', ['slug' => $categoriaSlug]);
  $categoriaId = $categoriaRow['id'] ?? null;

  $meta = [];
  if (isset($data['autor']) && trim((string)$data['autor']) !== '') {
    $meta['autor_display'] = trim((string)$data['autor']);
  }
  if (isset($data['ai_label']) && trim((string)$data['ai_label']) !== '') {
    $meta['ai_label'] = trim((string)$data['ai_label']);
  }

  $keywords = $data['keywords_seo'] ?? [];
  if (!is_array($keywords)) $keywords = [];

  $row = dbInsert('piezas_contenido', [
    'titulo' => (string)$data['titulo'],
    'subtitulo' => $data['subtitulo'] ?? null,
    'slug' => $slug,
    'categoria_id' => $categoriaId,
    'formato' => 'nota_web',
    'estado' => normalizeEstadoPieza($data['estado'] ?? null),
    'autor_id' => $payload['sub'],
    'contenido_html' => $data['contenido_html'] ?? null,
    'extracto' => $data['extracto'] ?? null,
    'imagen_destacada_url' => $data['imagen_destacada'] ?? null,
    'imagen_alt' => $data['imagen_alt'] ?? null,
    'meta_description' => $data['meta_description'] ?? null,
    'keywords_seo' => pgTextArrayLiteral($keywords),
    'fecha_publicacion' => $data['fecha_publicacion'] ?? null,
    'metadata' => json_encode($meta ?: new stdClass()),
  ], "id, slug, titulo, subtitulo, extracto, contenido_html, imagen_destacada_url, imagen_alt, estado::text AS estado, to_json(keywords_seo) AS keywords_seo, meta_description, fecha_publicacion, created_at, updated_at, metadata");

  $metaOut = json_decode($row['metadata'] ?? '{}', true) ?: [];
  $kwOut = json_decode($row['keywords_seo'] ?? '[]', true) ?: [];
  $newArticle = [
    'id' => $row['id'],
    'slug' => $row['slug'],
    'titulo' => $row['titulo'],
    'subtitulo' => $row['subtitulo'] ?? '',
    'extracto' => $row['extracto'] ?? '',
    'contenido_html' => $row['contenido_html'] ?? '',
    'imagen_destacada' => $row['imagen_destacada_url'] ?? '',
    'imagen_alt' => $row['imagen_alt'] ?? '',
    'categoria' => $categoriaSlug,
    'autor' => $metaOut['autor_display'] ?? '',
    'estado' => $row['estado'],
    'keywords_seo' => $kwOut,
    'meta_description' => $row['meta_description'] ?? '',
    'fecha_publicacion' => isoDateTime($row['fecha_publicacion'] ?? null),
    'created_at' => isoDateTime($row['created_at'] ?? null),
    'updated_at' => isoDateTime($row['updated_at'] ?? null),
  ];

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

  $current = dbFetchOne('SELECT id, metadata FROM piezas_contenido WHERE id = :id AND deleted_at IS NULL AND formato = :formato LIMIT 1', [
    'id' => $id,
    'formato' => 'nota_web',
  ]);
  if (!$current) {
    http_response_code(404);
    echo json_encode(['error' => 'Artículo no encontrado']);
    exit;
  }

  $meta = json_decode($current['metadata'] ?? '{}', true) ?: [];

  $updates = [];
  if (isset($data['titulo'])) {
    $slugBase = generateSlug((string)$data['titulo']);
    $updates['slug'] = ensureUniqueSlug($slugBase, $id);
    $updates['titulo'] = $data['titulo'];
  }
  if (isset($data['subtitulo'])) $updates['subtitulo'] = $data['subtitulo'];
  if (isset($data['extracto'])) $updates['extracto'] = $data['extracto'];
  if (isset($data['contenido_html'])) $updates['contenido_html'] = $data['contenido_html'];
  if (isset($data['imagen_destacada'])) $updates['imagen_destacada_url'] = $data['imagen_destacada'];
  if (isset($data['imagen_alt'])) $updates['imagen_alt'] = $data['imagen_alt'];
  if (isset($data['estado'])) $updates['estado'] = normalizeEstadoPieza($data['estado']);
  if (isset($data['meta_description'])) $updates['meta_description'] = $data['meta_description'];
  if (isset($data['fecha_publicacion'])) $updates['fecha_publicacion'] = $data['fecha_publicacion'];
  if (isset($data['keywords_seo'])) {
    $keywords = $data['keywords_seo'];
    if (!is_array($keywords)) $keywords = [];
    $updates['keywords_seo'] = pgTextArrayLiteral($keywords);
  }
  if (isset($data['categoria'])) {
    $categoriaRow = dbFetchOne('SELECT id FROM categorias_editorial WHERE slug = :slug LIMIT 1', ['slug' => $data['categoria']]);
    $updates['categoria_id'] = $categoriaRow['id'] ?? null;
  }
  if (isset($data['autor'])) {
    $a = trim((string)$data['autor']);
    if ($a === '') {
      unset($meta['autor_display']);
    } else {
      $meta['autor_display'] = $a;
    }
  }
  if (isset($data['ai_label'])) {
    $l = trim((string)$data['ai_label']);
    if ($l === '') unset($meta['ai_label']);
    else $meta['ai_label'] = $l;
  }
  $updates['metadata'] = json_encode($meta ?: new stdClass());

  $row = dbUpdate('piezas_contenido', $updates, 'id = :id AND deleted_at IS NULL AND formato = :formato', ['id' => $id, 'formato' => 'nota_web'], "id, slug, titulo, subtitulo, extracto, contenido_html, imagen_destacada_url, imagen_alt, estado::text AS estado, to_json(keywords_seo) AS keywords_seo, meta_description, fecha_publicacion, created_at, updated_at, metadata, categoria_id");
  if (!$row) {
    http_response_code(404);
    echo json_encode(['error' => 'Artículo no encontrado']);
    exit;
  }

  $categoriaSlugOut = $data['categoria'] ?? ($_GET['categoria'] ?? null);
  if (!$categoriaSlugOut) {
    $catRow = dbFetchOne('SELECT slug FROM categorias_editorial WHERE id = :id LIMIT 1', ['id' => $row['categoria_id']]);
    $categoriaSlugOut = $catRow['slug'] ?? 'local';
  }

  $metaOut = json_decode($row['metadata'] ?? '{}', true) ?: [];
  $kwOut = json_decode($row['keywords_seo'] ?? '[]', true) ?: [];
  echo json_encode(['ok' => true, 'article' => [
    'id' => $row['id'],
    'slug' => $row['slug'],
    'titulo' => $row['titulo'],
    'subtitulo' => $row['subtitulo'] ?? '',
    'extracto' => $row['extracto'] ?? '',
    'contenido_html' => $row['contenido_html'] ?? '',
    'imagen_destacada' => $row['imagen_destacada_url'] ?? '',
    'imagen_alt' => $row['imagen_alt'] ?? '',
    'categoria' => $categoriaSlugOut,
    'autor' => $metaOut['autor_display'] ?? '',
    'estado' => $row['estado'],
    'keywords_seo' => $kwOut,
    'meta_description' => $row['meta_description'] ?? '',
    'fecha_publicacion' => isoDateTime($row['fecha_publicacion'] ?? null),
    'created_at' => isoDateTime($row['created_at'] ?? null),
    'updated_at' => isoDateTime($row['updated_at'] ?? null),
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

  $deleted = dbExec("UPDATE piezas_contenido SET deleted_at = NOW() WHERE id = :id AND deleted_at IS NULL AND formato = 'nota_web'", ['id' => $id]);
  if ($deleted <= 0) {
    http_response_code(404);
    echo json_encode(['error' => 'Artículo no encontrado']);
    exit;
  }
  echo json_encode(['ok' => true, 'deleted' => $deleted]);
  exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
?>
