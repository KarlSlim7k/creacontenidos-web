-- CREA Contenidos - Seed + compat tables for current endpoints
-- Run after 001_initial_schema.sql

BEGIN;

-- Auth: password hash support (used by api/auth/login.php)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Newsletter subscribers (used by api/newsletter/*.php)
CREATE TABLE IF NOT EXISTS suscriptores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(254) NOT NULL UNIQUE,
  whatsapp      VARCHAR(30),
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  metadata      JSONB NOT NULL DEFAULT '{}'
);

-- Generated assets (used by api/assets/crud.php)
CREATE TABLE IF NOT EXISTS assets_multimedia (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pieza_id         UUID REFERENCES piezas_contenido(id) ON DELETE SET NULL,
  tipo            VARCHAR(30) NOT NULL,
  original_prompt TEXT,
  file_path       TEXT,
  estado          VARCHAR(30) NOT NULL DEFAULT 'generated',
  cost_tokens     INTEGER,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assets_multimedia_pieza_id ON assets_multimedia(pieza_id);

-- Static pages (used by api/content/index.php)
CREATE TABLE IF NOT EXISTS paginas (
  id         VARCHAR(80) PRIMARY KEY,
  meta       JSONB NOT NULL DEFAULT '{}',
  bloques    JSONB NOT NULL DEFAULT '{}',
  estado     VARCHAR(30) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Editorial categories expected by current admin UI
INSERT INTO categorias_editorial (nombre, slug, descripcion, orden)
VALUES
  ('Local', 'local', 'Noticias locales', 1),
  ('Cultura', 'cultura', 'Cultura', 2),
  ('Economía', 'economia', 'Economía', 3),
  ('Entretenimiento', 'entretenimiento', 'Entretenimiento', 4),
  ('Deportes', 'deportes', 'Deportes', 5),
  ('Opinión', 'opinion', 'Opinión', 6)
ON CONFLICT (slug) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  orden = EXCLUDED.orden,
  activa = TRUE;

-- Admin user seed (email matches data/users.json)
INSERT INTO usuarios (nombre_completo, alias, email, rol, activo, password_hash)
VALUES (
  'Editor CREA',
  'editor_crea',
  'editor@creacontenidos.com',
  'director_editorial',
  TRUE,
  '$2y$12$LQW5KrKa/2YghRhFDPo3COlN0RX58cgZKl1tbbDn7TYD8OWPiFDna'
)
ON CONFLICT (email) DO UPDATE SET
  nombre_completo = EXCLUDED.nombre_completo,
  rol = EXCLUDED.rol,
  activo = TRUE,
  password_hash = EXCLUDED.password_hash;

COMMIT;

