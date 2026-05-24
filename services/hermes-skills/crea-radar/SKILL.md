---
name: crea-radar
description: Detecta temas relevantes de Perote/Veracruz vía web_search + RSS cada 6h e inserta en la tabla ideas de Postgres.
version: 1.0.0
metadata:
  hermes:
    tags: [radar, listening, ideas, postgres]
    category: crea
    requires_toolsets: [web, terminal]
---

# Skill: crea-radar

Eres el editor de CREA Contenidos ejecutando el ciclo de social listening para Perote, Veracruz.

## Procedimiento

### 1. Cargar configuración de fuentes

Lee el archivo de configuración de social listening:

```bash
cat /opt/data/workspace/config/social-listening.json 2>/dev/null \
  || cat /opt/data/workspace/config/social-listening.example.json
```

### 2. Buscar temas via web_search

Usa `web_search` con cada una de estas queries (en paralelo si es posible):

- `"noticias Perote Veracruz hoy"`
- `"alertas Perote Veracruz México"`
- `"eventos municipio Perote hoy"`

Para cada resultado extrae: título, URL, descripción breve.

### 3. Leer RSS feeds

Para cada feed del config, usa `web_extract` para obtener el XML y extrae los `<item>` o `<entry>` con título, link y descripción. Feeds por defecto si el config no está disponible:

- El Universal Veracruz: `https://www.eluniversal.com.mx/rss/veracruz.xml`
- Milenio Veracruz: `https://www.milenio.com/rss/veracruz.xml`

### 4. Analizar y clasificar cada ítem

Para cada resultado (web_search + RSS), determina usando el contexto del texto:

- **sentimiento**: `positive` | `negative` | `neutral`
  - negative → palabras como: accidente, crimen, crisis, protesta, alerta, emergencia, sismo, robo, inundación
  - positive → palabras como: logro, celebración, inauguración, éxito
  - neutral → el resto
- **urgencia**: `alta` si sentimiento=negative, `media` en los demás casos
- **fuente_db**: mapeo obligatorio al enum `fuente_idea` de Postgres:
  - web_search → `perplexity_signal`
  - RSS feeds → `alerta_google_news`

### 5. Deduplicar

Antes de insertar, consulta ideas existentes de los últimos 14 días del servicio:

```sql
SELECT id, titulo, metadata
FROM ideas
WHERE deleted_at IS NULL
  AND metadata->>'service' = 'social_listener'
  AND fuente IN ('perplexity_signal', 'alerta_google_news')
  AND created_at > NOW() - interval '14 days'
ORDER BY created_at DESC
LIMIT 200;
```

Para cada candidato nuevo: si existe un título con distancia Levenshtein ≤18% de la longitud máxima (o ≤6 caracteres), es duplicado → actualizar `metadata.mentions` y `metadata.last_seen_at` en lugar de insertar.

### 6. UPSERT en Postgres

**Para ideas nuevas** (no duplicadas):

```sql
INSERT INTO ideas (
  titulo, descripcion, fuente, urgencia, estado,
  potencial_comercial, registrado_por, metadata
)
VALUES (
  '<titulo>',
  '<descripcion o NULL>',
  '<fuente_db>',   -- solo valores del enum: perplexity_signal | alerta_google_news
  '<urgencia>',    -- alta | media | baja
  'nueva',
  FALSE,
  (SELECT id FROM usuarios WHERE alias = 'sistema' OR rol = 'director_editorial' LIMIT 1),
  '{
    "service": "social_listener",
    "status": "pending",
    "source_raw": "<fuente_original>",
    "mentions": 1,
    "sentiment": "<sentimiento>",
    "suggested_formats": ["nota"],
    "url": "<url o null>",
    "last_seen_at": "<ISO timestamp>"
  }'
)
RETURNING id;
```

**Para duplicados** (UPDATE):

```sql
UPDATE ideas
SET metadata = jsonb_set(
  jsonb_set(metadata, '{mentions}', (COALESCE((metadata->>'mentions')::int, 0) + 1)::text::jsonb),
  '{last_seen_at}', '"<ISO timestamp>"'
)
WHERE id = '<id_existente>';
```

### 7. Cleanup

Soft-delete ideas del servicio con más de 30 días:

```sql
UPDATE ideas
SET deleted_at = NOW()
WHERE deleted_at IS NULL
  AND metadata->>'service' = 'social_listener'
  AND created_at < NOW() - interval '30 days';
```

### 8. Reporte final

Responde con un resumen en español de México:

```
✅ crea-radar completado
   Insertadas: N ideas nuevas
   Actualizadas: M ideas (dedup)
   Eliminadas: K ideas antiguas
   Total activas: T
```

Envía este reporte al canal de Telegram configurado (`TELEGRAM_HOME_CHANNEL`).

## Restricciones

- NUNCA uses valores UI como fuente (`nota`, `post`, `rss`) — solo los valores del enum `fuente_idea`.
- NUNCA insertes en `publicaciones` — ese flujo requiere gate editorial humano.
- Filtra siempre `WHERE deleted_at IS NULL`.
- Si `web_search` no está disponible, continúa solo con RSS.
- Si Postgres no es accesible, loguea el error y termina sin lanzar excepción fatal.
