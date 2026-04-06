# CREA — Esquema de Base de Datos PostgreSQL
## Sistema Interno del Ecosistema de Medio Humano Aumentado por IA

**Versión:** 1.0  
**Autor:** Emmanuel Reyes Zapata — Director Editorial CREA  
**Entorno de despliegue:** VPS KVM2 Hostinger + DokPloy + GitHub  
**Motor:** PostgreSQL (recomendado 15+)  
**Dominio:** crea-contenidos.com  

---

## INSTRUCCIONES PARA AGENTES E INTEGRADORES IA

Este documento es la **fuente de verdad estructural** de la base de datos del sistema CREA.  
Cualquier agente, modelo o desarrollador que genere código SQL, migraciones, APIs o integraciones
debe basarse exclusivamente en este esquema.

### Convenciones globales del esquema

| Convención | Descripción |
|---|---|
| `id` | Siempre `UUID` con `DEFAULT gen_random_uuid()`. Nunca usar `SERIAL`. |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` en todas las tablas. |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` + trigger de auto-actualización. |
| `deleted_at` | `TIMESTAMPTZ NULL` — soft delete. Nunca borrar filas directamente. |
| Nombres de tablas | `snake_case`, plural (ej. `colaboradores`, `piezas_contenido`). |
| Nombres de columnas | `snake_case` estricto. |
| Enums | Declarados como tipos PostgreSQL (`CREATE TYPE`) antes de usarse en tablas. |
| Texto corto | `VARCHAR(n)` con límite explícito. |
| Texto largo | `TEXT`. |
| Metadatos flexibles | `JSONB` para payloads de APIs externas (GA4, Buffer, Claude API, etc.). |
| Extensiones requeridas | `pgcrypto` (para `gen_random_uuid()`), `pg_trgm` (búsqueda de texto). |

---

## DIAGRAMA DE MÓDULOS Y SUS TABLAS

```
MÓDULO IDEAS         → ideas
MÓDULO RADAR         → radar_briefings, radar_alertas
MÓDULO PRODUCCIÓN    → piezas_contenido, formatos_contenido
MÓDULO PUBLICACIÓN   → publicaciones, canales_publicacion
MÓDULO MÉTRICAS      → metricas_piezas, metricas_semanales
MÓDULO COMERCIAL     → prospectos, productos_comerciales, propuestas
MÓDULO COLABORADORES → usuarios, roles, niveles_colaborador,
                       misiones, logros, asignaciones_mision,
                       logros_usuarios, puntos_uc
TRANSVERSAL          → patrocinadores, categorias_editorial,
                       audit_log, notificaciones
```

---

## SECCIÓN 1 — EXTENSIONES Y TIPOS ENUM

### 1.1 Extensiones requeridas

```sql
-- INSTRUCCIÓN PARA AGENTE: ejecutar ANTES de cualquier CREATE TABLE
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### 1.2 Tipos ENUM del sistema

```sql
-- Estado del ciclo de vida de una idea
CREATE TYPE estado_idea AS ENUM (
  'nueva',
  'en_analisis',
  'aprobada',
  'en_produccion',
  'descartada',
  'pospuesta'
);

-- Urgencia editorial
CREATE TYPE urgencia AS ENUM (
  'alta',
  'media',
  'baja'
);

-- Formatos de contenido producible
CREATE TYPE formato_contenido AS ENUM (
  'nota_web',           -- 500-800 palabras SEO
  'guion_video',        -- 60-180 segundos
  'capsula_audio',      -- 3-7 minutos
  'hilo_twitter',       -- 8-12 tweets
  'carrusel_instagram', -- 6-10 slides
  'newsletter',         -- digest semanal
  'branded_content',    -- contenido comercial
  'cobertura_evento'    -- evento de cliente
);

-- Estado del ciclo de vida de una pieza de contenido
CREATE TYPE estado_pieza AS ENUM (
  'borrador',
  'en_revision',
  'aprobada',
  'publicada',
  'rechazada',
  'archivada'
);

-- Canales de publicación disponibles
CREATE TYPE canal AS ENUM (
  'sitio_web',
  'facebook',
  'instagram',
  'twitter_x',
  'tiktok',
  'youtube',
  'newsletter',
  'telegram',
  'whatsapp'
);

-- Estado de una publicación en canal
CREATE TYPE estado_publicacion AS ENUM (
  'programada',
  'publicada',
  'fallida',
  'cancelada'
);

-- Roles del equipo CREA
CREATE TYPE rol_usuario AS ENUM (
  'director_editorial',
  'conductor_reportero',
  'produccion_tecnica',
  'comercial_ventas',
  'colaborador_externo'
);

-- Niveles de gamificación del colaborador
CREATE TYPE nivel_colaborador AS ENUM (
  'junior',   -- 0-20 UC
  'creador',  -- 21-60 UC
  'senior',   -- 61-150 UC
  'maestro'   -- 151+ UC
);

-- Estado del pipeline comercial
CREATE TYPE estado_pipeline AS ENUM (
  'identificado',
  'contactado',
  'propuesta_enviada',
  'en_negociacion',
  'cerrado_ganado',
  'cerrado_perdido',
  'inactivo'
);

-- Tipos de productos comerciales CREA
CREATE TYPE tipo_producto_comercial AS ENUM (
  'patrocinio_seccion',      -- MXN 2,500–5,000/mes
  'branded_content_basico',  -- MXN 1,500–3,000/pieza
  'branded_content_premium', -- MXN 4,000–8,000
  'cobertura_evento',        -- MXN 3,000–6,000
  'publicidad_display'       -- MXN 800–1,500/mes
);

-- Fuente de origen de una idea
CREATE TYPE fuente_idea AS ENUM (
  'whatsapp_voz',
  'whatsapp_texto',
  'telegram',
  'formulario_notion',
  'google_forms',
  'alerta_google_news',
  'perplexity_signal',
  'colaborador_externo',
  'agente_openclaw',
  'director_editorial'
);

-- Tipo de acción en el log de auditoría
CREATE TYPE accion_audit AS ENUM (
  'insert',
  'update',
  'delete',
  'soft_delete',
  'login',
  'api_call'
);
```

---

## SECCIÓN 2 — TABLAS TRANSVERSALES

### 2.1 `usuarios`

Todos los miembros del equipo CREA. También aplica a colaboradores externos y cuentas de agentes IA.

```sql
CREATE TABLE usuarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo VARCHAR(150) NOT NULL,
  alias           VARCHAR(60)  NOT NULL UNIQUE,     -- nombre público/editorial
  email           VARCHAR(254) NOT NULL UNIQUE,
  telefono        VARCHAR(20)  UNIQUE,               -- número WhatsApp/Telegram
  rol             rol_usuario  NOT NULL,
  activo          BOOLEAN      NOT NULL DEFAULT TRUE,
  avatar_url      TEXT,
  bio_editorial   TEXT,                              -- bio para página de autor
  -- Gamificación
  uc_total        INTEGER      NOT NULL DEFAULT 0,   -- Unidades CREA acumuladas
  nivel           nivel_colaborador NOT NULL DEFAULT 'junior',
  -- Metadata
  metadata        JSONB        NOT NULL DEFAULT '{}',-- datos extra sin estructura fija
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ  NULL
);

COMMENT ON TABLE  usuarios IS 'Todos los miembros del equipo CREA y colaboradores externos.';
COMMENT ON COLUMN usuarios.uc_total IS 'Unidades CREA acumuladas. 1 UC = 1 pieza publicada base.';
COMMENT ON COLUMN usuarios.nivel IS 'Calculado automáticamente según uc_total. Junior 0-20, Creador 21-60, Senior 61-150, Maestro 151+.';
COMMENT ON COLUMN usuarios.metadata IS 'JSONB para datos de integraciones externas (Notion ID, WhatsApp ID, Telegram chat_id, etc.).';
```

### 2.2 `categorias_editorial`

Secciones editoriales fijas del medio.

```sql
CREATE TABLE categorias_editorial (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      VARCHAR(80)  NOT NULL UNIQUE,   -- ej: "Local", "Economía", "Cultura"
  slug        VARCHAR(80)  NOT NULL UNIQUE,   -- ej: "local", "economia", "cultura"
  descripcion TEXT,
  color_hex   VARCHAR(7),                     -- color de sección en UI
  activa      BOOLEAN NOT NULL DEFAULT TRUE,
  orden       SMALLINT NOT NULL DEFAULT 0,    -- orden de aparición en menú
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE categorias_editorial IS 'Secciones editoriales del medio: Local, Cultura, Economía, Entretenimiento, Deportes, Opinión.';
```

### 2.3 `patrocinadores`

Clientes comerciales activos con patrocinios de sección o productos recurrentes.

```sql
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

COMMENT ON TABLE patrocinadores IS 'Empresas o personas con acuerdos comerciales activos en CREA.';
```

---

## SECCIÓN 3 — MÓDULO IDEAS

### 3.1 `ideas`

Captura de ideas editoriales desde cualquier fuente o miembro del equipo.

```sql
CREATE TABLE ideas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo                VARCHAR(300) NOT NULL,
  descripcion           TEXT,
  fuente                fuente_idea  NOT NULL DEFAULT 'director_editorial',
  categoria_id          UUID REFERENCES categorias_editorial(id) ON DELETE SET NULL,
  urgencia              urgencia     NOT NULL DEFAULT 'media',
  estado                estado_idea  NOT NULL DEFAULT 'nueva',
  potencial_comercial   BOOLEAN      NOT NULL DEFAULT FALSE,
  -- Autoría
  registrado_por        UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  asignado_a            UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  -- Análisis IA (Módulo RADAR)
  score_relevancia      SMALLINT CHECK (score_relevancia BETWEEN 1 AND 10),
  score_comercial       SMALLINT CHECK (score_comercial BETWEEN 1 AND 10),
  brief_contexto        TEXT,        -- output de Perplexity AI
  resonancia_social     TEXT,        -- output de Grok / X monitoring
  -- Decisión editorial
  decision_editorial    TEXT,        -- nota del director al aprobar/rechazar
  formato_sugerido      formato_contenido,
  fecha_publicacion_obj DATE,        -- fecha objetivo de publicación
  -- Audio original (si la idea fue por voz)
  audio_url             TEXT,
  transcripcion_voz     TEXT,        -- output de Whisper API
  -- Metadata de integración
  notion_id             VARCHAR(100) UNIQUE, -- ID del registro en Notion
  metadata              JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ NULL
);

COMMENT ON TABLE  ideas IS 'Módulo IDEAS: todas las ideas editoriales capturadas en el sistema, independientemente de su fuente.';
COMMENT ON COLUMN ideas.score_relevancia IS 'Score 1-10 asignado automáticamente por el análisis IA. 10 = máxima urgencia editorial.';
COMMENT ON COLUMN ideas.brief_contexto IS 'Resumen de contexto generado por Perplexity AI. Incluye antecedentes, actores, ángulos de cobertura.';
COMMENT ON COLUMN ideas.notion_id IS 'ID del registro espejo en Notion durante la Fase 1 del proyecto.';

CREATE INDEX idx_ideas_estado       ON ideas(estado);
CREATE INDEX idx_ideas_urgencia     ON ideas(urgencia);
CREATE INDEX idx_ideas_registrado   ON ideas(registrado_por);
CREATE INDEX idx_ideas_categoria    ON ideas(categoria_id);
CREATE INDEX idx_ideas_created      ON ideas(created_at DESC);
CREATE INDEX idx_ideas_titulo_trgm  ON ideas USING GIN (titulo gin_trgm_ops);
```

---

## SECCIÓN 4 — MÓDULO RADAR

### 4.1 `radar_briefings`

Briefings de contexto generados por el sistema de monitoreo automático (Perplexity, Grok, Google News).

```sql
CREATE TABLE radar_briefings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id         UUID REFERENCES ideas(id) ON DELETE CASCADE,
  fecha_briefing  DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Contenido del briefing
  resumen         TEXT NOT NULL,
  fuentes         JSONB NOT NULL DEFAULT '[]',  -- array de {url, titulo, fecha}
  actores         JSONB NOT NULL DEFAULT '[]',  -- array de {nombre, rol, relevancia}
  angulos         JSONB NOT NULL DEFAULT '[]',  -- array de strings: ángulos de cobertura
  -- Scores calculados
  score_editorial SMALLINT CHECK (score_editorial BETWEEN 1 AND 10),
  score_audiencia SMALLINT CHECK (score_audiencia BETWEEN 1 AND 10),
  -- Monitoreo social
  menciones_x     INTEGER DEFAULT 0,            -- menciones en X (Twitter)
  tendencia_x     TEXT,                         -- resumen de tendencia local en X
  -- Modelo IA que generó el briefing
  modelo_ia       VARCHAR(100),                 -- ej: "claude-sonnet-4-6", "perplexity-sonar"
  tokens_usados   INTEGER,
  -- Metadata
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  radar_briefings IS 'Módulo RADAR: análisis contextual automático para cada idea editorial.';
COMMENT ON COLUMN radar_briefings.fuentes IS 'Array JSON de fuentes verificables: [{url, titulo, fecha_publicacion, medio}].';
COMMENT ON COLUMN radar_briefings.angulos IS 'Array de strings con ángulos de cobertura sugeridos por la IA.';

CREATE INDEX idx_radar_idea     ON radar_briefings(idea_id);
CREATE INDEX idx_radar_fecha    ON radar_briefings(fecha_briefing DESC);
```

### 4.2 `radar_alertas`

Alertas automáticas de monitoreo sin idea asociada aún (señales del entorno).

```sql
CREATE TABLE radar_alertas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo          VARCHAR(300) NOT NULL,
  resumen         TEXT,
  origen          VARCHAR(60) NOT NULL,    -- "google_news", "grok_x", "rss", "openclaw"
  url_fuente      TEXT,
  palabras_clave  TEXT[],                  -- array de keywords que activaron la alerta
  relevancia      urgencia NOT NULL DEFAULT 'media',
  procesada       BOOLEAN NOT NULL DEFAULT FALSE,
  idea_generada   UUID REFERENCES ideas(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE radar_alertas IS 'Señales del entorno informativo detectadas automáticamente que aún no tienen idea asociada.';

CREATE INDEX idx_alertas_procesada ON radar_alertas(procesada);
CREATE INDEX idx_alertas_created   ON radar_alertas(created_at DESC);
```

---

## SECCIÓN 5 — MÓDULO PRODUCCIÓN

### 5.1 `piezas_contenido`

Cada pieza editorial producida dentro del ecosistema CREA.

```sql
CREATE TABLE piezas_contenido (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id               UUID REFERENCES ideas(id) ON DELETE SET NULL,
  titulo                VARCHAR(400) NOT NULL,
  subtitulo             VARCHAR(400),
  slug                  VARCHAR(400) NOT NULL UNIQUE,  -- URL-friendly, sin acentos
  categoria_id          UUID REFERENCES categorias_editorial(id) ON DELETE SET NULL,
  formato               formato_contenido NOT NULL,
  estado                estado_pieza NOT NULL DEFAULT 'borrador',
  -- Autoría
  autor_id              UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  editor_id             UUID REFERENCES usuarios(id) ON DELETE SET NULL, -- quien revisa
  -- Contenido
  contenido_html        TEXT,          -- cuerpo principal en HTML
  contenido_markdown    TEXT,          -- copia en Markdown para portabilidad
  extracto              TEXT,          -- resumen de 150-200 palabras
  imagen_destacada_url  TEXT,
  imagen_alt            VARCHAR(200),
  imagen_es_ia          BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE si fue generada con DALL·E/Firefly
  -- SEO
  meta_title            VARCHAR(70),
  meta_description      VARCHAR(160),
  keywords_seo          TEXT[],        -- array de palabras clave validadas con Ubersuggest
  -- Producción asistida por IA
  borrador_ia           TEXT,          -- primer borrador generado por Claude/GPT
  modelo_ia_usado       VARCHAR(100),  -- ej: "claude-sonnet-4-6", "gpt-4o"
  prompt_usado          TEXT,          -- prompt de sistema que generó el borrador
  tokens_ia             INTEGER,       -- tokens consumidos en la generación
  -- Comercial
  patrocinador_id       UUID REFERENCES patrocinadores(id) ON DELETE SET NULL,
  es_branded_content    BOOLEAN NOT NULL DEFAULT FALSE,
  -- Gamificación
  uc_valor              NUMERIC(4,1) NOT NULL DEFAULT 1.0, -- valor en Unidades CREA
  -- Fechas
  fecha_publicacion     TIMESTAMPTZ,   -- fecha real de publicación
  fecha_publicacion_obj DATE,          -- fecha objetivo
  -- CMS externo
  wordpress_id          INTEGER UNIQUE, -- ID del post en WordPress
  wordpress_url         TEXT,
  notion_id             VARCHAR(100),
  -- Comentarios editoriales
  notas_revision        TEXT,          -- feedback del editor al devolver
  -- Metadata
  metadata              JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ NULL
);

COMMENT ON TABLE  piezas_contenido IS 'Módulo PRODUCCIÓN: unidad central del sistema. Cada pieza editorial del ecosistema CREA.';
COMMENT ON COLUMN piezas_contenido.uc_valor IS 'Nota web = 1.0 UC, Video = 2.0 UC, Entrevista campo = 2.0 UC. Bonus +1.0 si supera 1000 vistas en 48h.';
COMMENT ON COLUMN piezas_contenido.borrador_ia IS 'Primer borrador generado automáticamente. Nunca publicado sin revisión humana.';
COMMENT ON COLUMN piezas_contenido.imagen_es_ia IS 'TRUE indica que la imagen fue generada con DALL·E 3 o Adobe Firefly y debe identificarse editorialmente.';
COMMENT ON COLUMN piezas_contenido.wordpress_id IS 'ID del post espejo en WordPress CMS (crearcontenidos.com).';

CREATE INDEX idx_piezas_estado      ON piezas_contenido(estado);
CREATE INDEX idx_piezas_formato     ON piezas_contenido(formato);
CREATE INDEX idx_piezas_autor       ON piezas_contenido(autor_id);
CREATE INDEX idx_piezas_categoria   ON piezas_contenido(categoria_id);
CREATE INDEX idx_piezas_publicacion ON piezas_contenido(fecha_publicacion DESC);
CREATE INDEX idx_piezas_patrocin    ON piezas_contenido(patrocinador_id);
CREATE INDEX idx_piezas_titulo_trgm ON piezas_contenido USING GIN (titulo gin_trgm_ops);
CREATE INDEX idx_piezas_keywords    ON piezas_contenido USING GIN (keywords_seo);
```

---

## SECCIÓN 6 — MÓDULO PUBLICACIÓN

### 6.1 `publicaciones`

Registro de cada publicación de una pieza en un canal específico.

```sql
CREATE TABLE publicaciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pieza_id        UUID NOT NULL REFERENCES piezas_contenido(id) ON DELETE CASCADE,
  canal           canal NOT NULL,
  estado          estado_publicacion NOT NULL DEFAULT 'programada',
  -- Tiempos
  programada_para TIMESTAMPTZ,
  publicada_en    TIMESTAMPTZ,
  -- Resultado
  url_publicacion TEXT,            -- URL del post en el canal
  id_externo      VARCHAR(200),    -- ID del post en la plataforma (Twitter, Facebook, etc.)
  -- Contenido adaptado al canal
  copy_canal      TEXT,            -- copy específico para este canal
  hashtags        TEXT[],
  -- Herramienta de gestión
  gestionado_por  VARCHAR(60),     -- "buffer", "later", "manual", "openclaw"
  buffer_id       VARCHAR(100),    -- ID del post en Buffer/Later
  -- Error si falló
  error_detalle   TEXT,
  -- Metadata
  metadata        JSONB NOT NULL DEFAULT '{}',  -- payload completo de Buffer/Later API
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE publicaciones IS 'Módulo PUBLICACIÓN: registro de cada instancia de publicación de una pieza en cada canal.';
COMMENT ON COLUMN publicaciones.copy_canal IS 'Versión del contenido adaptada al formato y límite del canal específico.';

CREATE INDEX idx_pub_pieza    ON publicaciones(pieza_id);
CREATE INDEX idx_pub_canal    ON publicaciones(canal);
CREATE INDEX idx_pub_estado   ON publicaciones(estado);
CREATE INDEX idx_pub_programa ON publicaciones(programada_para);
```

---

## SECCIÓN 7 — MÓDULO MÉTRICAS

### 7.1 `metricas_piezas`

Métricas de rendimiento por pieza, capturadas a las 24h, 48h y 7 días.

```sql
CREATE TABLE metricas_piezas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pieza_id              UUID NOT NULL REFERENCES piezas_contenido(id) ON DELETE CASCADE,
  canal                 canal NOT NULL,
  fecha_captura         DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Métricas de alcance
  vistas_unicas         INTEGER NOT NULL DEFAULT 0,
  impresiones           INTEGER NOT NULL DEFAULT 0,
  alcance               INTEGER NOT NULL DEFAULT 0,
  -- Métricas de interacción
  likes                 INTEGER NOT NULL DEFAULT 0,
  comentarios           INTEGER NOT NULL DEFAULT 0,
  compartidos           INTEGER NOT NULL DEFAULT 0,
  guardados             INTEGER NOT NULL DEFAULT 0,
  clics_enlace          INTEGER NOT NULL DEFAULT 0,
  -- Métricas de lectura (solo sitio web)
  tiempo_promedio_seg   INTEGER,   -- tiempo en página en segundos
  tasa_rebote           NUMERIC(5,2), -- porcentaje
  -- Crecimiento de seguidores en la fecha
  nuevos_seguidores     INTEGER NOT NULL DEFAULT 0,
  -- Fuente de tráfico (solo sitio web, JSON de GA4)
  fuentes_trafico       JSONB NOT NULL DEFAULT '{}',
  -- Raw payload de la API (GA4, Meta Business Suite, etc.)
  raw_payload           JSONB NOT NULL DEFAULT '{}',
  -- Bonus UC (se activa si supera 1000 vistas en 48h)
  bonus_uc_activado     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Constraint: una sola captura por pieza + canal + fecha
  UNIQUE (pieza_id, canal, fecha_captura)
);

COMMENT ON TABLE  metricas_piezas IS 'Módulo MÉTRICAS: datos de rendimiento por pieza y canal. Captura en D+1, D+2 y D+7.';
COMMENT ON COLUMN metricas_piezas.bonus_uc_activado IS 'TRUE si la pieza superó 1,000 vistas en 48h. Agrega +1.0 UC al autor automáticamente.';

CREATE INDEX idx_met_pieza   ON metricas_piezas(pieza_id);
CREATE INDEX idx_met_canal   ON metricas_piezas(canal);
CREATE INDEX idx_met_fecha   ON metricas_piezas(fecha_captura DESC);
```

### 7.2 `metricas_semanales`

Dashboard semanal consolidado del medio.

```sql
CREATE TABLE metricas_semanales (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semana_inicio             DATE NOT NULL UNIQUE,  -- lunes de la semana
  semana_fin                DATE NOT NULL,
  -- Producción
  piezas_publicadas         INTEGER NOT NULL DEFAULT 0,
  objetivo_piezas           INTEGER NOT NULL DEFAULT 15, -- meta Fase 1: 15-20
  piezas_video              INTEGER NOT NULL DEFAULT 0,
  piezas_audio              INTEGER NOT NULL DEFAULT 0,
  -- Alcance total
  vistas_totales            INTEGER NOT NULL DEFAULT 0,
  interacciones_totales     INTEGER NOT NULL DEFAULT 0,
  pieza_mas_vista_id        UUID REFERENCES piezas_contenido(id) ON DELETE SET NULL,
  -- Redes sociales
  canal_mayor_crecimiento   canal,
  nuevos_seguidores_total   INTEGER NOT NULL DEFAULT 0,
  -- Tráfico web
  visitantes_unicos_web     INTEGER NOT NULL DEFAULT 0,
  sesiones_web              INTEGER NOT NULL DEFAULT 0,
  -- Comercial
  nuevos_prospectos         INTEGER NOT NULL DEFAULT 0,
  propuestas_enviadas       INTEGER NOT NULL DEFAULT 0,
  contratos_cerrados        INTEGER NOT NULL DEFAULT 0,
  ingresos_semana           NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Gamificación
  uc_generadas_semana       NUMERIC(6,1) NOT NULL DEFAULT 0,
  colaborador_semana_id     UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  -- Metadata
  notas_editoriales         TEXT,
  metadata                  JSONB NOT NULL DEFAULT '{}',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE metricas_semanales IS 'Consolidado semanal de métricas editoriales y comerciales del medio CREA.';
```

---

## SECCIÓN 8 — MÓDULO COMERCIAL

### 8.1 `prospectos`

Pipeline CRM de clientes potenciales.

```sql
CREATE TABLE prospectos (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_empresa        VARCHAR(200) NOT NULL,
  nombre_contacto       VARCHAR(150),
  email_contacto        VARCHAR(254),
  telefono_contacto     VARCHAR(20),
  sector                VARCHAR(100),    -- giro del negocio
  -- Pipeline
  estado_pipeline       estado_pipeline NOT NULL DEFAULT 'identificado',
  responsable_id        UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  -- Origen del prospecto
  pieza_origen_id       UUID REFERENCES piezas_contenido(id) ON DELETE SET NULL,
  origen_descripcion    TEXT,            -- contexto de cómo se identificó
  -- Oportunidad
  tipo_producto_interes tipo_producto_comercial[],
  valor_estimado_mxn    NUMERIC(10,2),
  -- Seguimiento
  fecha_proximo_contacto DATE,
  notas                 TEXT,
  -- Brief comercial (generado por agente IA)
  brief_comercial_ia    TEXT,            -- guión de aproximación sugerido
  -- Convertido a patrocinador
  patrocinador_id       UUID REFERENCES patrocinadores(id) ON DELETE SET NULL,
  -- Metadata
  notion_crm_id         VARCHAR(100),
  metadata              JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ NULL
);

COMMENT ON TABLE  prospectos IS 'Módulo COMERCIAL: pipeline CRM de clientes potenciales. Cada pieza publicada puede generar un prospecto automáticamente.';
COMMENT ON COLUMN prospectos.brief_comercial_ia IS 'Guión de aproximación comercial generado automáticamente por el agente OpenClaw/Claude al identificar el prospecto.';

CREATE INDEX idx_prospectos_estado    ON prospectos(estado_pipeline);
CREATE INDEX idx_prospectos_resp      ON prospectos(responsable_id);
CREATE INDEX idx_prospectos_contacto  ON prospectos(fecha_proximo_contacto);
CREATE INDEX idx_prospectos_pieza     ON prospectos(pieza_origen_id);
```

### 8.2 `propuestas_comerciales`

Propuestas formales enviadas a prospectos.

```sql
CREATE TABLE propuestas_comerciales (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospecto_id      UUID NOT NULL REFERENCES prospectos(id) ON DELETE CASCADE,
  tipo_producto     tipo_producto_comercial NOT NULL,
  -- Propuesta
  titulo            VARCHAR(300) NOT NULL,
  descripcion       TEXT,
  precio_mxn        NUMERIC(10,2) NOT NULL,
  duracion_meses    SMALLINT,
  -- Estado
  enviada_en        TIMESTAMPTZ,
  respuesta_en      TIMESTAMPTZ,
  aceptada          BOOLEAN,
  -- Archivos
  pdf_url           TEXT,              -- URL del media kit / propuesta en PDF
  -- Metadata
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE propuestas_comerciales IS 'Propuestas formales enviadas a prospectos del pipeline comercial CREA.';

CREATE INDEX idx_propuestas_prospecto ON propuestas_comerciales(prospecto_id);
CREATE INDEX idx_propuestas_tipo      ON propuestas_comerciales(tipo_producto);
```

### 8.3 `contratos_comerciales`

Contratos cerrados y activos con clientes.

```sql
CREATE TABLE contratos_comerciales (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patrocinador_id   UUID NOT NULL REFERENCES patrocinadores(id) ON DELETE RESTRICT,
  propuesta_id      UUID REFERENCES propuestas_comerciales(id) ON DELETE SET NULL,
  tipo_producto     tipo_producto_comercial NOT NULL,
  -- Términos
  monto_mxn         NUMERIC(10,2) NOT NULL,
  fecha_inicio      DATE NOT NULL,
  fecha_fin         DATE,              -- NULL si es indefinido
  renovacion_auto   BOOLEAN NOT NULL DEFAULT FALSE,
  -- Estado
  activo            BOOLEAN NOT NULL DEFAULT TRUE,
  -- Metadata
  notas             TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ NULL
);

COMMENT ON TABLE contratos_comerciales IS 'Contratos cerrados con clientes. Base para calcular MRR (Monthly Recurring Revenue).';

CREATE INDEX idx_contratos_patrocin ON contratos_comerciales(patrocinador_id);
CREATE INDEX idx_contratos_activo   ON contratos_comerciales(activo);
```

---

## SECCIÓN 9 — MÓDULO COLABORADORES / GAMIFICACIÓN

### 9.1 `misiones`

Catálogo de misiones disponibles en el sistema de gamificación.

```sql
CREATE TABLE misiones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          VARCHAR(200) NOT NULL,
  descripcion     TEXT NOT NULL,
  tipo            VARCHAR(60) NOT NULL,   -- "editorial", "comercial", "crecimiento", "especial"
  recompensa_uc   NUMERIC(4,1) NOT NULL,  -- UC que otorga al completarla
  -- Condiciones de activación
  activa          BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_inicio    DATE,
  fecha_fin       DATE,                   -- NULL si es permanente
  -- Límite de completaciones
  max_completaciones_por_usuario SMALLINT DEFAULT 1,
  -- Metadata
  icono           VARCHAR(10),            -- emoji o código de ícono
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE misiones IS 'Catálogo de misiones del sistema de gamificación CREA. Ejemplo: "Consigue un patrocinador esta semana = +15 UC".';
```

### 9.2 `asignaciones_mision`

Asignación y seguimiento de misiones por colaborador.

```sql
CREATE TABLE asignaciones_mision (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mision_id       UUID NOT NULL REFERENCES misiones(id) ON DELETE CASCADE,
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  -- Estado
  completada      BOOLEAN NOT NULL DEFAULT FALSE,
  completada_en   TIMESTAMPTZ,
  -- Evidencia (pieza o contrato que valida la misión)
  pieza_id        UUID REFERENCES piezas_contenido(id) ON DELETE SET NULL,
  contrato_id     UUID REFERENCES contratos_comerciales(id) ON DELETE SET NULL,
  -- UC otorgadas
  uc_otorgadas    NUMERIC(4,1),
  -- Metadata
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mision_id, usuario_id, created_at) -- permite múltiples si la misión se repite
);

COMMENT ON TABLE asignaciones_mision IS 'Seguimiento de misiones activas y completadas por cada colaborador.';

CREATE INDEX idx_asig_usuario ON asignaciones_mision(usuario_id);
CREATE INDEX idx_asig_mision  ON asignaciones_mision(mision_id);
CREATE INDEX idx_asig_completa ON asignaciones_mision(completada);
```

### 9.3 `logros`

Catálogo de logros (badges) desbloqueables.

```sql
CREATE TABLE logros (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          VARCHAR(200) NOT NULL UNIQUE,
  descripcion     TEXT NOT NULL,
  -- Condición de desbloqueo
  tipo_condicion  VARCHAR(60) NOT NULL,  -- "primera_entrevista", "nota_viral", "primer_patrocinador", etc.
  umbral_valor    INTEGER,               -- valor numérico de la condición si aplica
  -- Visual
  icono           VARCHAR(10),
  color_hex       VARCHAR(7),
  imagen_url      TEXT,
  -- Metadata
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE logros IS 'Catálogo de badges desbloqueables. Ejemplos: primera entrevista en video, primera nota viral, primer patrocinador conseguido.';
```

### 9.4 `logros_usuarios`

Relación de qué logros ha desbloqueado cada colaborador.

```sql
CREATE TABLE logros_usuarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logro_id        UUID NOT NULL REFERENCES logros(id) ON DELETE CASCADE,
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  desbloqueado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Contexto del desbloqueo
  pieza_id        UUID REFERENCES piezas_contenido(id) ON DELETE SET NULL,
  notas           TEXT,
  UNIQUE (logro_id, usuario_id)
);

COMMENT ON TABLE logros_usuarios IS 'Logros desbloqueados por cada colaborador.';

CREATE INDEX idx_logros_u_usuario ON logros_usuarios(usuario_id);
```

### 9.5 `puntos_uc`

Ledger de movimientos de Unidades CREA por colaborador. Fuente de verdad para el saldo.

```sql
CREATE TABLE puntos_uc (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  monto_uc        NUMERIC(4,1) NOT NULL,   -- positivo: acreditación, negativo: ajuste
  concepto        VARCHAR(200) NOT NULL,   -- descripción del movimiento
  tipo            VARCHAR(60) NOT NULL,    -- "pieza_publicada", "mision_completada", "logro", "bonus_viral", "ajuste_manual"
  -- Referencia al objeto que generó los puntos
  pieza_id        UUID REFERENCES piezas_contenido(id) ON DELETE SET NULL,
  mision_id       UUID REFERENCES misiones(id) ON DELETE SET NULL,
  logro_id        UUID REFERENCES logros(id) ON DELETE SET NULL,
  -- Quien autorizó (para ajustes manuales)
  autorizado_por  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  puntos_uc IS 'Ledger de Unidades CREA. Cada fila es un movimiento. El saldo actual de un colaborador es SUM(monto_uc) WHERE usuario_id = X.';
COMMENT ON COLUMN puntos_uc.monto_uc IS 'Positivo = crédito de UC. Negativo = solo para correcciones manuales autorizadas por el director.';

CREATE INDEX idx_uc_usuario ON puntos_uc(usuario_id);
CREATE INDEX idx_uc_tipo    ON puntos_uc(tipo);
CREATE INDEX idx_uc_created ON puntos_uc(created_at DESC);
```

---

## SECCIÓN 10 — TABLAS TRANSVERSALES DE SISTEMA

### 10.1 `notificaciones`

Notificaciones internas del sistema para el equipo.

```sql
CREATE TABLE notificaciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo            VARCHAR(60) NOT NULL,   -- "idea_aprobada", "borrador_listo", "mision_asignada", "metrica_bonus", "alerta_comercial"
  titulo          VARCHAR(200) NOT NULL,
  cuerpo          TEXT,
  -- Referencia al objeto relacionado
  referencia_tipo VARCHAR(60),            -- "idea", "pieza", "mision", "prospecto"
  referencia_id   UUID,
  -- Estado
  leida           BOOLEAN NOT NULL DEFAULT FALSE,
  leida_en        TIMESTAMPTZ,
  -- Canal de entrega
  canal_entregado canal,                  -- si fue enviada por WhatsApp, Telegram, etc.
  entregada       BOOLEAN NOT NULL DEFAULT FALSE,
  -- Metadata
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notificaciones IS 'Notificaciones internas del sistema. Generadas automáticamente por el agente OpenClaw o por eventos del sistema.';

CREATE INDEX idx_notif_usuario ON notificaciones(usuario_id, leida);
CREATE INDEX idx_notif_created ON notificaciones(created_at DESC);
```

### 10.2 `audit_log`

Registro de auditoría inmutable para todas las operaciones sensibles.

```sql
CREATE TABLE audit_log (
  id              BIGSERIAL PRIMARY KEY,  -- BIGSERIAL para volumen alto, no UUID
  tabla           VARCHAR(80) NOT NULL,
  registro_id     UUID,
  accion          accion_audit NOT NULL,
  usuario_id      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  datos_anteriores JSONB,                 -- snapshot del registro antes del cambio
  datos_nuevos    JSONB,                  -- snapshot del registro después del cambio
  ip_origen       INET,
  user_agent      TEXT,
  origen_sistema  VARCHAR(100),           -- "openclaw", "api_web", "panel_interno", "make_webhook"
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  audit_log IS 'Log de auditoría inmutable. NUNCA hacer DELETE ni UPDATE en esta tabla.';
COMMENT ON COLUMN audit_log.origen_sistema IS 'Identifica si el cambio vino del agente IA, del panel web, de un webhook de Make, etc.';

CREATE INDEX idx_audit_tabla   ON audit_log(tabla, registro_id);
CREATE INDEX idx_audit_usuario ON audit_log(usuario_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
```

---

## SECCIÓN 11 — TRIGGERS Y FUNCIONES

### 11.1 Función de auto-actualización de `updated_at`

```sql
-- INSTRUCCIÓN PARA AGENTE: esta función debe existir antes de crear los triggers
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 11.2 Triggers de `updated_at` para todas las tablas

```sql
-- Aplicar a cada tabla con columna updated_at
-- INSTRUCCIÓN PARA AGENTE: reemplazar {tabla} por el nombre real de cada tabla

CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_ideas_updated_at
  BEFORE UPDATE ON ideas
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_piezas_updated_at
  BEFORE UPDATE ON piezas_contenido
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_publicaciones_updated_at
  BEFORE UPDATE ON publicaciones
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_prospectos_updated_at
  BEFORE UPDATE ON prospectos
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_patrocinadores_updated_at
  BEFORE UPDATE ON patrocinadores
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_contratos_updated_at
  BEFORE UPDATE ON contratos_comerciales
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_metricas_sem_updated_at
  BEFORE UPDATE ON metricas_semanales
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_radar_updated_at
  BEFORE UPDATE ON radar_briefings
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
```

### 11.3 Función de actualización automática de nivel de colaborador

```sql
-- Se ejecuta cada vez que cambia uc_total en usuarios
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

COMMENT ON FUNCTION fn_actualizar_nivel_colaborador IS 'Recalcula automáticamente el nivel del colaborador cuando cambia su uc_total. Junior 0-20, Creador 21-60, Senior 61-150, Maestro 151+.';
```

### 11.4 Función de acreditación de UC al publicar pieza

```sql
-- Se ejecuta cuando una pieza cambia a estado 'publicada'
CREATE OR REPLACE FUNCTION fn_acreditar_uc_publicacion()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo actúa cuando el estado cambia a 'publicada'
  IF NEW.estado = 'publicada' AND OLD.estado != 'publicada' THEN
    -- Insertar movimiento en el ledger
    INSERT INTO puntos_uc (usuario_id, monto_uc, concepto, tipo, pieza_id)
    VALUES (
      NEW.autor_id,
      NEW.uc_valor,
      'Pieza publicada: ' || NEW.titulo,
      'pieza_publicada',
      NEW.id
    );
    -- Actualizar uc_total en el usuario
    UPDATE usuarios
    SET uc_total = uc_total + NEW.uc_valor
    WHERE id = NEW.autor_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_acreditar_uc
  AFTER UPDATE OF estado ON piezas_contenido
  FOR EACH ROW EXECUTE FUNCTION fn_acreditar_uc_publicacion();

COMMENT ON FUNCTION fn_acreditar_uc_publicacion IS 'Acredita UC automáticamente al autor cuando una pieza cambia a estado publicada.';
```

---

## SECCIÓN 12 — VISTAS ÚTILES PARA EL PANEL INTERNO

### 12.1 Vista director: resumen editorial del día

```sql
CREATE VIEW v_resumen_editorial_hoy AS
SELECT
  (SELECT COUNT(*) FROM ideas  WHERE estado = 'nueva')            AS ideas_sin_revisar,
  (SELECT COUNT(*) FROM ideas  WHERE estado = 'aprobada')         AS ideas_aprobadas_sin_producir,
  (SELECT COUNT(*) FROM piezas_contenido WHERE estado = 'en_revision') AS piezas_en_revision,
  (SELECT COUNT(*) FROM piezas_contenido
   WHERE estado = 'publicada'
   AND DATE(fecha_publicacion) = CURRENT_DATE)                    AS piezas_publicadas_hoy,
  (SELECT COUNT(*) FROM prospectos
   WHERE fecha_proximo_contacto <= CURRENT_DATE
   AND estado_pipeline NOT IN ('cerrado_ganado','cerrado_perdido','inactivo'))
                                                                  AS prospectos_sin_contactar;

COMMENT ON VIEW v_resumen_editorial_hoy IS 'Vista rápida para el dashboard del Director Editorial. Refleja el estado operativo del día.';
```

### 12.2 Vista ranking de colaboradores por UC

```sql
CREATE VIEW v_ranking_colaboradores AS
SELECT
  u.id,
  u.alias,
  u.nombre_completo,
  u.rol,
  u.nivel,
  u.uc_total,
  COUNT(DISTINCT p.id) FILTER (WHERE p.estado = 'publicada') AS piezas_publicadas,
  RANK() OVER (ORDER BY u.uc_total DESC)                      AS posicion_ranking
FROM usuarios u
LEFT JOIN piezas_contenido p ON p.autor_id = u.id
WHERE u.activo = TRUE AND u.deleted_at IS NULL
GROUP BY u.id
ORDER BY u.uc_total DESC;

COMMENT ON VIEW v_ranking_colaboradores IS 'Ranking de colaboradores por Unidades CREA acumuladas. Alimenta la tabla de gamificación del panel.';
```

### 12.3 Vista pipeline comercial activo

```sql
CREATE VIEW v_pipeline_comercial AS
SELECT
  pr.id,
  pr.nombre_empresa,
  pr.nombre_contacto,
  pr.estado_pipeline,
  pr.valor_estimado_mxn,
  pr.fecha_proximo_contacto,
  u.alias AS responsable,
  pc.titulo AS pieza_origen,
  CURRENT_DATE - pr.updated_at::date AS dias_sin_actualizar
FROM prospectos pr
LEFT JOIN usuarios u ON u.id = pr.responsable_id
LEFT JOIN piezas_contenido pc ON pc.id = pr.pieza_origen_id
WHERE pr.deleted_at IS NULL
  AND pr.estado_pipeline NOT IN ('cerrado_ganado','cerrado_perdido','inactivo')
ORDER BY pr.fecha_proximo_contacto ASC NULLS LAST;

COMMENT ON VIEW v_pipeline_comercial IS 'Pipeline de prospectos activos con alerta de días sin actualizar.';
```

---

## SECCIÓN 13 — ORDEN DE EJECUCIÓN DEL SQL

**INSTRUCCIÓN CRÍTICA PARA AGENTES IA:** respetar estrictamente este orden al ejecutar el SQL de creación:

```
1.  Extensiones              (SECCIÓN 1.1)
2.  Tipos ENUM               (SECCIÓN 1.2) — todos antes de cualquier CREATE TABLE
3.  Función fn_set_updated_at (SECCIÓN 11.1) — antes de los triggers
4.  Tabla: categorias_editorial
5.  Tabla: patrocinadores
6.  Tabla: usuarios
7.  Tabla: ideas
8.  Tabla: radar_briefings
9.  Tabla: radar_alertas
10. Tabla: piezas_contenido
11. Tabla: publicaciones
12. Tabla: metricas_piezas
13. Tabla: metricas_semanales
14. Tabla: prospectos
15. Tabla: propuestas_comerciales
16. Tabla: contratos_comerciales
17. Tabla: misiones
18. Tabla: asignaciones_mision
19. Tabla: logros
20. Tabla: logros_usuarios
21. Tabla: puntos_uc
22. Tabla: notificaciones
23. Tabla: audit_log
24. Triggers de updated_at    (SECCIÓN 11.2)
25. Trigger nivel_colaborador (SECCIÓN 11.3)
26. Trigger acreditar_uc      (SECCIÓN 11.4)
27. Vistas                    (SECCIÓN 12)
```

---

## SECCIÓN 14 — NOTAS DE INTEGRACIÓN CON EL STACK CREA

| Integración | Columna de referencia | Observación |
|---|---|---|
| Notion (panel interno) | `ideas.notion_id`, `piezas_contenido.notion_id`, `prospectos.notion_crm_id` | IDs de los registros espejo en Notion durante Fase 1. Se mantienen para sincronización bidireccional. |
| WordPress CMS | `piezas_contenido.wordpress_id`, `piezas_contenido.wordpress_url` | El ID del post y URL se registran al publicar vía API REST de WordPress. |
| Buffer / Later | `publicaciones.buffer_id`, `publicaciones.gestionado_por` | El ID externo de la publicación programada en Buffer. |
| Google Analytics 4 | `metricas_piezas.fuentes_trafico`, `metricas_piezas.raw_payload` | El payload completo de la respuesta GA4 se guarda en JSONB para reprocessing. |
| OpenClaw (agente IA) | `audit_log.origen_sistema = 'openclaw'`, `notificaciones.canal_entregado` | Todas las acciones del agente deben registrarse en `audit_log` con `origen_sistema = 'openclaw'`. |
| Claude / OpenAI API | `piezas_contenido.modelo_ia_usado`, `piezas_contenido.tokens_ia` | Registrar modelo y tokens para control de costos de API. |
| Make / Zapier | `audit_log.origen_sistema = 'make_webhook'` | Las automatizaciones de Make deben identificarse en el log. |

---

## SECCIÓN 15 — VARIABLES DE ENTORNO REQUERIDAS

El sistema espera las siguientes variables de entorno en el servidor VPS (DokPloy):

```env
# Base de datos
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=crea_db
POSTGRES_USER=crea_user
POSTGRES_PASSWORD=<secreto>

# Esquema (opcional, por defecto 'public')
POSTGRES_SCHEMA=public

# Pool de conexiones
DB_POOL_MIN=2
DB_POOL_MAX=10
```

---

*Documento generado para el proyecto CREA — crea-contenidos.com*  
*Perote, Veracruz | 2025*  
*Este esquema debe revisarse y actualizarse al cierre de cada fase del proyecto.*
