-- CREA Contenidos - Initial Schema Migration
-- PostgreSQL 15+
-- Run order: extensions -> enums -> tables -> triggers -> views

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ENUMs
CREATE TYPE estado_idea AS ENUM ('nueva', 'en_analisis', 'aprobada', 'en_produccion', 'descartada', 'pospuesta');
CREATE TYPE urgencia AS ENUM ('alta', 'media', 'baja');
CREATE TYPE formato_contenido AS ENUM ('nota_web', 'guion_video', 'capsula_audio', 'hilo_twitter', 'carrusel_instagram', 'newsletter', 'branded_content', 'cobertura_evento');
CREATE TYPE estado_pieza AS ENUM ('borrador', 'en_revision', 'aprobada', 'publicada', 'rechazada', 'archivada');
CREATE TYPE canal AS ENUM ('sitio_web', 'facebook', 'instagram', 'twitter_x', 'tiktok', 'youtube', 'newsletter', 'telegram', 'whatsapp');
CREATE TYPE estado_publicacion AS ENUM ('programada', 'publicada', 'fallida', 'cancelada');
CREATE TYPE rol_usuario AS ENUM ('director_editorial', 'conductor_reportero', 'produccion_tecnica', 'comercial_ventas', 'colaborador_externo');
CREATE TYPE nivel_colaborador AS ENUM ('junior', 'creador', 'senior', 'maestro');
CREATE TYPE estado_pipeline AS ENUM ('identificado', 'contactado', 'propuesta_enviada', 'en_negociacion', 'cerrado_ganado', 'cerrado_perdido', 'inactivo');
CREATE TYPE tipo_producto_comercial AS ENUM ('patrocinio_seccion', 'branded_content_basico', 'branded_content_premium', 'cobertura_evento', 'publicidad_display');
CREATE TYPE fuente_idea AS ENUM ('whatsapp_voz', 'whatsapp_texto', 'telegram', 'formulario_notion', 'google_forms', 'alerta_google_news', 'perplexity_signal', 'colaborador_externo', 'agente_openclaw', 'director_editorial');
CREATE TYPE accion_audit AS ENUM ('insert', 'update', 'delete', 'soft_delete', 'login', 'api_call');

-- Function: auto-update updated_at
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tables
CREATE TABLE categorias_editorial (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      VARCHAR(80)  NOT NULL UNIQUE,
  slug        VARCHAR(80)  NOT NULL UNIQUE,
  descripcion TEXT,
  color_hex   VARCHAR(7),
  activa      BOOLEAN NOT NULL DEFAULT TRUE,
  orden       SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE patrocinadores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_empresa  VARCHAR(200) NOT NULL,
  contacto_nombre VARCHAR(150),
  contacto_email  VARCHAR(254),
  contacto_tel    VARCHAR(20),
  logo_url        TEXT,
  sitio_web       TEXT,
  notas           TEXT,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ NULL
);

CREATE TABLE usuarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo VARCHAR(150) NOT NULL,
  alias           VARCHAR(60)  NOT NULL UNIQUE,
  email           VARCHAR(254) NOT NULL UNIQUE,
  telefono        VARCHAR(20)  UNIQUE,
  rol             rol_usuario  NOT NULL,
  activo          BOOLEAN      NOT NULL DEFAULT TRUE,
  avatar_url      TEXT,
  bio_editorial   TEXT,
  uc_total        INTEGER      NOT NULL DEFAULT 0,
  nivel           nivel_colaborador NOT NULL DEFAULT 'junior',
  metadata        JSONB        NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ  NULL
);

CREATE TABLE ideas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo                VARCHAR(300) NOT NULL,
  descripcion           TEXT,
  fuente                fuente_idea  NOT NULL DEFAULT 'director_editorial',
  categoria_id          UUID REFERENCES categorias_editorial(id) ON DELETE SET NULL,
  urgencia              urgencia     NOT NULL DEFAULT 'media',
  estado                estado_idea  NOT NULL DEFAULT 'nueva',
  potencial_comercial   BOOLEAN      NOT NULL DEFAULT FALSE,
  registrado_por        UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  asignado_a            UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  score_relevancia      SMALLINT CHECK (score_relevancia BETWEEN 1 AND 10),
  score_comercial       SMALLINT CHECK (score_comercial BETWEEN 1 AND 10),
  brief_contexto        TEXT,
  resonancia_social     TEXT,
  decision_editorial    TEXT,
  formato_sugerido      formato_contenido,
  fecha_publicacion_obj DATE,
  audio_url             TEXT,
  transcripcion_voz     TEXT,
  notion_id             VARCHAR(100) UNIQUE,
  metadata              JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ NULL
);

CREATE TABLE radar_briefings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id         UUID REFERENCES ideas(id) ON DELETE CASCADE,
  fecha_briefing  DATE NOT NULL DEFAULT CURRENT_DATE,
  resumen         TEXT NOT NULL,
  fuentes         JSONB NOT NULL DEFAULT '[]',
  actores         JSONB NOT NULL DEFAULT '[]',
  angulos         JSONB NOT NULL DEFAULT '[]',
  score_editorial SMALLINT CHECK (score_editorial BETWEEN 1 AND 10),
  score_audiencia SMALLINT CHECK (score_audiencia BETWEEN 1 AND 10),
  menciones_x     INTEGER DEFAULT 0,
  tendencia_x     TEXT,
  modelo_ia       VARCHAR(100),
  tokens_usados   INTEGER,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE radar_alertas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo          VARCHAR(300) NOT NULL,
  resumen         TEXT,
  origen          VARCHAR(60) NOT NULL,
  url_fuente      TEXT,
  palabras_clave  TEXT[],
  relevancia      urgencia NOT NULL DEFAULT 'media',
  procesada       BOOLEAN NOT NULL DEFAULT FALSE,
  idea_generada   UUID REFERENCES ideas(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE piezas_contenido (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id               UUID REFERENCES ideas(id) ON DELETE SET NULL,
  titulo                VARCHAR(400) NOT NULL,
  subtitulo             VARCHAR(400),
  slug                  VARCHAR(400) NOT NULL UNIQUE,
  categoria_id          UUID REFERENCES categorias_editorial(id) ON DELETE SET NULL,
  formato               formato_contenido NOT NULL,
  estado                estado_pieza NOT NULL DEFAULT 'borrador',
  autor_id              UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  editor_id             UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  contenido_html        TEXT,
  contenido_markdown    TEXT,
  extracto              TEXT,
  imagen_destacada_url  TEXT,
  imagen_alt            VARCHAR(200),
  imagen_es_ia          BOOLEAN NOT NULL DEFAULT FALSE,
  meta_title            VARCHAR(70),
  meta_description      VARCHAR(160),
  keywords_seo          TEXT[],
  borrador_ia           TEXT,
  modelo_ia_usado       VARCHAR(100),
  prompt_usado          TEXT,
  tokens_ia             INTEGER,
  patrocinador_id       UUID REFERENCES patrocinadores(id) ON DELETE SET NULL,
  es_branded_content    BOOLEAN NOT NULL DEFAULT FALSE,
  uc_valor              NUMERIC(4,1) NOT NULL DEFAULT 1.0,
  fecha_publicacion     TIMESTAMPTZ,
  fecha_publicacion_obj DATE,
  wordpress_id          INTEGER UNIQUE,
  wordpress_url         TEXT,
  notion_id             VARCHAR(100),
  notas_revision        TEXT,
  metadata              JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ NULL
);

CREATE TABLE publicaciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pieza_id        UUID NOT NULL REFERENCES piezas_contenido(id) ON DELETE CASCADE,
  canal           canal NOT NULL,
  estado          estado_publicacion NOT NULL DEFAULT 'programada',
  programada_para TIMESTAMPTZ,
  publicada_en    TIMESTAMPTZ,
  url_publicacion TEXT,
  id_externo      VARCHAR(200),
  copy_canal      TEXT,
  hashtags        TEXT[],
  gestionado_por  VARCHAR(60),
  buffer_id       VARCHAR(100),
  error_detalle   TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE metricas_piezas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pieza_id              UUID NOT NULL REFERENCES piezas_contenido(id) ON DELETE CASCADE,
  canal                 canal NOT NULL,
  fecha_captura         DATE NOT NULL DEFAULT CURRENT_DATE,
  vistas_unicas         INTEGER NOT NULL DEFAULT 0,
  impresiones           INTEGER NOT NULL DEFAULT 0,
  alcance               INTEGER NOT NULL DEFAULT 0,
  likes                 INTEGER NOT NULL DEFAULT 0,
  comentarios           INTEGER NOT NULL DEFAULT 0,
  compartidos           INTEGER NOT NULL DEFAULT 0,
  guardados             INTEGER NOT NULL DEFAULT 0,
  clics_enlace          INTEGER NOT NULL DEFAULT 0,
  tiempo_promedio_seg   INTEGER,
  tasa_rebote           NUMERIC(5,2),
  nuevos_seguidores     INTEGER NOT NULL DEFAULT 0,
  fuentes_trafico       JSONB NOT NULL DEFAULT '{}',
  raw_payload           JSONB NOT NULL DEFAULT '{}',
  bonus_uc_activado     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pieza_id, canal, fecha_captura)
);

CREATE TABLE metricas_semanales (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semana_inicio             DATE NOT NULL UNIQUE,
  semana_fin                DATE NOT NULL,
  piezas_publicadas         INTEGER NOT NULL DEFAULT 0,
  objetivo_piezas           INTEGER NOT NULL DEFAULT 15,
  piezas_video              INTEGER NOT NULL DEFAULT 0,
  piezas_audio              INTEGER NOT NULL DEFAULT 0,
  vistas_totales            INTEGER NOT NULL DEFAULT 0,
  interacciones_totales     INTEGER NOT NULL DEFAULT 0,
  pieza_mas_vista_id        UUID REFERENCES piezas_contenido(id) ON DELETE SET NULL,
  canal_mayor_crecimiento   canal,
  nuevos_seguidores_total   INTEGER NOT NULL DEFAULT 0,
  visitantes_unicos_web     INTEGER NOT NULL DEFAULT 0,
  sesiones_web              INTEGER NOT NULL DEFAULT 0,
  nuevos_prospectos         INTEGER NOT NULL DEFAULT 0,
  propuestas_enviadas       INTEGER NOT NULL DEFAULT 0,
  contratos_cerrados        INTEGER NOT NULL DEFAULT 0,
  ingresos_semana           NUMERIC(10,2) NOT NULL DEFAULT 0,
  uc_generadas_semana       NUMERIC(6,1) NOT NULL DEFAULT 0,
  colaborador_semana_id     UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  notas_editoriales         TEXT,
  metadata                  JSONB NOT NULL DEFAULT '{}',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE prospectos (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_empresa        VARCHAR(200) NOT NULL,
  nombre_contacto       VARCHAR(150),
  email_contacto        VARCHAR(254),
  telefono_contacto     VARCHAR(20),
  sector                VARCHAR(100),
  estado_pipeline       estado_pipeline NOT NULL DEFAULT 'identificado',
  responsable_id        UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  pieza_origen_id       UUID REFERENCES piezas_contenido(id) ON DELETE SET NULL,
  origen_descripcion    TEXT,
  tipo_producto_interes  tipo_producto_comercial[],
  valor_estimado_mxn    NUMERIC(10,2),
  fecha_proximo_contacto DATE,
  notas                 TEXT,
  brief_comercial_ia    TEXT,
  patrocinador_id       UUID REFERENCES patrocinadores(id) ON DELETE SET NULL,
  notion_crm_id         VARCHAR(100),
  metadata              JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ NULL
);

CREATE TABLE propuestas_comerciales (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospecto_id      UUID NOT NULL REFERENCES prospectos(id) ON DELETE CASCADE,
  tipo_producto     tipo_producto_comercial NOT NULL,
  titulo            VARCHAR(300) NOT NULL,
  descripcion       TEXT,
  precio_mxn        NUMERIC(10,2) NOT NULL,
  duracion_meses    SMALLINT,
  enviada_en        TIMESTAMPTZ,
  respuesta_en      TIMESTAMPTZ,
  aceptada          BOOLEAN,
  pdf_url           TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE contratos_comerciales (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patrocinador_id   UUID NOT NULL REFERENCES patrocinadores(id) ON DELETE RESTRICT,
  propuesta_id      UUID REFERENCES propuestas_comerciales(id) ON DELETE SET NULL,
  tipo_producto     tipo_producto_comercial NOT NULL,
  monto_mxn         NUMERIC(10,2) NOT NULL,
  fecha_inicio      DATE NOT NULL,
  fecha_fin         DATE,
  renovacion_auto   BOOLEAN NOT NULL DEFAULT FALSE,
  activo            BOOLEAN NOT NULL DEFAULT TRUE,
  notas             TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ NULL
);

CREATE TABLE misiones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          VARCHAR(200) NOT NULL,
  descripcion     TEXT NOT NULL,
  tipo            VARCHAR(60) NOT NULL,
  recompensa_uc   NUMERIC(4,1) NOT NULL,
  activa          BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_inicio    DATE,
  fecha_fin       DATE,
  max_completaciones_por_usuario SMALLINT DEFAULT 1,
  icono           VARCHAR(10),
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE asignaciones_mision (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mision_id       UUID NOT NULL REFERENCES misiones(id) ON DELETE CASCADE,
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  completada      BOOLEAN NOT NULL DEFAULT FALSE,
  completada_en   TIMESTAMPTZ,
  pieza_id        UUID REFERENCES piezas_contenido(id) ON DELETE SET NULL,
  contrato_id     UUID REFERENCES contratos_comerciales(id) ON DELETE SET NULL,
  uc_otorgadas    NUMERIC(4,1),
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mision_id, usuario_id, created_at)
);

CREATE TABLE logros (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          VARCHAR(200) NOT NULL UNIQUE,
  descripcion     TEXT NOT NULL,
  tipo_condicion  VARCHAR(60) NOT NULL,
  umbral_valor    INTEGER,
  icono           VARCHAR(10),
  color_hex       VARCHAR(7),
  imagen_url      TEXT,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE logros_usuarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logro_id        UUID NOT NULL REFERENCES logros(id) ON DELETE CASCADE,
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  desbloqueado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pieza_id        UUID REFERENCES piezas_contenido(id) ON DELETE SET NULL,
  notas           TEXT,
  UNIQUE (logro_id, usuario_id)
);

CREATE TABLE puntos_uc (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  monto_uc        NUMERIC(4,1) NOT NULL,
  concepto        VARCHAR(200) NOT NULL,
  tipo            VARCHAR(60) NOT NULL,
  pieza_id        UUID REFERENCES piezas_contenido(id) ON DELETE SET NULL,
  mision_id       UUID REFERENCES misiones(id) ON DELETE SET NULL,
  logro_id        UUID REFERENCES logros(id) ON DELETE SET NULL,
  autorizado_por  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notificaciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo            VARCHAR(60) NOT NULL,
  titulo          VARCHAR(200) NOT NULL,
  cuerpo          TEXT,
  referencia_tipo VARCHAR(60),
  referencia_id   UUID,
  leida           BOOLEAN NOT NULL DEFAULT FALSE,
  leida_en        TIMESTAMPTZ,
  canal_entregado canal,
  entregada       BOOLEAN NOT NULL DEFAULT FALSE,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_log (
  id              BIGSERIAL PRIMARY KEY,
  tabla           VARCHAR(80) NOT NULL,
  registro_id     UUID,
  accion          accion_audit NOT NULL,
  usuario_id      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  datos_anteriores JSONB,
  datos_nuevos    JSONB,
  ip_origen       INET,
  user_agent      TEXT,
  origen_sistema  VARCHAR(100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ideas_estado ON ideas(estado);
CREATE INDEX idx_ideas_urgencia ON ideas(urgencia);
CREATE INDEX idx_ideas_registrado ON ideas(registrado_por);
CREATE INDEX idx_ideas_categoria ON ideas(categoria_id);
CREATE INDEX idx_ideas_created ON ideas(created_at DESC);
CREATE INDEX idx_ideas_titulo_trgm ON ideas USING GIN (titulo gin_trgm_ops);

CREATE INDEX idx_radar_idea ON radar_briefings(idea_id);
CREATE INDEX idx_radar_fecha ON radar_briefings(fecha_briefing DESC);

CREATE INDEX idx_alertas_procesada ON radar_alertas(procesada);
CREATE INDEX idx_alertas_created ON radar_alertas(created_at DESC);

CREATE INDEX idx_piezas_estado ON piezas_contenido(estado);
CREATE INDEX idx_piezas_formato ON piezas_contenido(formato);
CREATE INDEX idx_piezas_autor ON piezas_contenido(autor_id);
CREATE INDEX idx_piezas_categoria ON piezas_contenido(categoria_id);
CREATE INDEX idx_piezas_publicacion ON piezas_contenido(fecha_publicacion DESC);
CREATE INDEX idx_piezas_patrocin ON piezas_contenido(patrocinador_id);
CREATE INDEX idx_piezas_titulo_trgm ON piezas_contenido USING GIN (titulo gin_trgm_ops);
CREATE INDEX idx_piezas_keywords ON piezas_contenido USING GIN (keywords_seo);

CREATE INDEX idx_pub_pieza ON publicaciones(pieza_id);
CREATE INDEX idx_pub_canal ON publicaciones(canal);
CREATE INDEX idx_pub_estado ON publicaciones(estado);
CREATE INDEX idx_pub_programa ON publicaciones(programada_para);

CREATE INDEX idx_met_pieza ON metricas_piezas(pieza_id);
CREATE INDEX idx_met_canal ON metricas_piezas(canal);
CREATE INDEX idx_met_fecha ON metricas_piezas(fecha_captura DESC);

CREATE INDEX idx_prospectos_estado ON prospectos(estado_pipeline);
CREATE INDEX idx_prospectos_resp ON prospectos(responsable_id);
CREATE INDEX idx_prospectos_contacto ON prospectos(fecha_proximo_contacto);
CREATE INDEX idx_prospectos_pieza ON prospectos(pieza_origen_id);

CREATE INDEX idx_propuestas_prospecto ON propuestas_comerciales(prospecto_id);
CREATE INDEX idx_propuestas_tipo ON propuestas_comerciales(tipo_producto);

CREATE INDEX idx_contratos_patrocin ON contratos_comerciales(patrocinador_id);
CREATE INDEX idx_contratos_activo ON contratos_comerciales(activo);

CREATE INDEX idx_asig_usuario ON asignaciones_mision(usuario_id);
CREATE INDEX idx_asig_mision ON asignaciones_mision(mision_id);
CREATE INDEX idx_asig_completa ON asignaciones_mision(completada);

CREATE INDEX idx_logros_u_usuario ON logros_usuarios(usuario_id);

CREATE INDEX idx_uc_usuario ON puntos_uc(usuario_id);
CREATE INDEX idx_uc_tipo ON puntos_uc(tipo);
CREATE INDEX idx_uc_created ON puntos_uc(created_at DESC);

CREATE INDEX idx_notif_usuario ON notificaciones(usuario_id, leida);
CREATE INDEX idx_notif_created ON notificaciones(created_at DESC);

CREATE INDEX idx_audit_tabla ON audit_log(tabla, registro_id);
CREATE INDEX idx_audit_usuario ON audit_log(usuario_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- Triggers
CREATE TRIGGER trg_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_categorias_updated_at BEFORE UPDATE ON categorias_editorial FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_patrocinadores_updated_at BEFORE UPDATE ON patrocinadores FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_ideas_updated_at BEFORE UPDATE ON ideas FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_radar_updated_at BEFORE UPDATE ON radar_briefings FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_alertas_updated_at BEFORE UPDATE ON radar_alertas FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_piezas_updated_at BEFORE UPDATE ON piezas_contenido FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_publicaciones_updated_at BEFORE UPDATE ON publicaciones FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_prospectos_updated_at BEFORE UPDATE ON prospectos FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_propuestas_updated_at BEFORE UPDATE ON propuestas_comerciales FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_contratos_updated_at BEFORE UPDATE ON contratos_comerciales FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_misiones_updated_at BEFORE UPDATE ON misiones FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_asignaciones_updated_at BEFORE UPDATE ON asignaciones_mision FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_metricas_sem_updated_at BEFORE UPDATE ON metricas_semanales FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Function: auto-update nivel_colaborador
CREATE OR REPLACE FUNCTION fn_actualizar_nivel_colaborador()
RETURNS TRIGGER AS $$
BEGIN
  NEW.nivel = CASE
    WHEN NEW.uc_total <= 20  THEN 'junior'::nivel_colaborador
    WHEN NEW.uc_total <= 60  THEN 'creador'::nivel_colaborador
    WHEN NEW.uc_total <= 150 THEN 'senior'::nivel_colaborador
    ELSE                          'maestro'::nivel_colaborador
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_nivel_colaborador
  BEFORE UPDATE OF uc_total ON usuarios
  FOR EACH ROW EXECUTE FUNCTION fn_actualizar_nivel_colaborador();

-- Function: auto-acredit UC on pieza published
CREATE OR REPLACE FUNCTION fn_acreditar_uc_publicacion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado = 'publicada' AND OLD.estado != 'publicada' THEN
    INSERT INTO puntos_uc (usuario_id, monto_uc, concepto, tipo, pieza_id)
    VALUES (NEW.autor_id, NEW.uc_valor, 'Pieza publicada: ' || NEW.titulo, 'pieza_publicada', NEW.id);
    UPDATE usuarios SET uc_total = uc_total + NEW.uc_valor WHERE id = NEW.autor_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_acreditar_uc
  AFTER UPDATE OF estado ON piezas_contenido
  FOR EACH ROW EXECUTE FUNCTION fn_acreditar_uc_publicacion();

-- Views
CREATE VIEW v_resumen_editorial_hoy AS
SELECT
  (SELECT COUNT(*) FROM ideas WHERE estado = 'nueva') AS ideas_sin_revisar,
  (SELECT COUNT(*) FROM ideas WHERE estado = 'aprobada') AS ideas_aprobadas_sin_producir,
  (SELECT COUNT(*) FROM piezas_contenido WHERE estado = 'en_revision') AS piezas_en_revision,
  (SELECT COUNT(*) FROM piezas_contenido WHERE estado = 'publicada' AND DATE(fecha_publicacion) = CURRENT_DATE) AS piezas_publicadas_hoy,
  (SELECT COUNT(*) FROM prospectos WHERE fecha_proximo_contacto <= CURRENT_DATE AND estado_pipeline NOT IN ('cerrado_ganado','cerrado_perdido','inactivo')) AS prospectos_sin_contactar;

CREATE VIEW v_ranking_colaboradores AS
SELECT
  u.id, u.alias, u.nombre_completo, u.rol, u.nivel, u.uc_total,
  COUNT(DISTINCT p.id) FILTER (WHERE p.estado = 'publicada') AS piezas_publicadas,
  RANK() OVER (ORDER BY u.uc_total DESC) AS posicion_ranking
FROM usuarios u
LEFT JOIN piezas_contenido p ON p.autor_id = u.id
WHERE u.activo = TRUE AND u.deleted_at IS NULL
GROUP BY u.id
ORDER BY u.uc_total DESC;

CREATE VIEW v_pipeline_comercial AS
SELECT
  pr.id, pr.nombre_empresa, pr.nombre_contacto, pr.estado_pipeline,
  pr.valor_estimado_mxn, pr.fecha_proximo_contacto, u.alias AS responsable,
  pc.titulo AS pieza_origen,
  CURRENT_DATE - pr.updated_at::date AS dias_sin_actualizar
FROM prospectos pr
LEFT JOIN usuarios u ON u.id = pr.responsable_id
LEFT JOIN piezas_contenido pc ON pc.id = pr.pieza_origen_id
WHERE pr.deleted_at IS NULL AND pr.estado_pipeline NOT IN ('cerrado_ganado','cerrado_perdido','inactivo')
ORDER BY pr.fecha_proximo_contacto ASC NULLS LAST;

COMMIT;