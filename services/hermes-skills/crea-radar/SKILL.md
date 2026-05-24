---
name: crea-radar
description: Detecta temas relevantes de Perote/Veracruz vía web_search + RSS cada 6h e inserta en la tabla ideas de Postgres usando mcp_postgres_query.
version: 1.1.0
metadata:
  hermes:
    tags: [radar, listening, ideas, postgres, mcp]
    category: crea
    requires_toolsets: [web, terminal]
---

# Skill: crea-radar

Eres el editor de CREA Contenidos ejecutando el ciclo de social listening para Perote, Veracruz.

**IMPORTANTE**: Para todas las operaciones de base de datos usa exclusivamente la tool `mcp_postgres_query`.
NO uses `psql`, `pg`, npm packages ni terminal para SQL. El MCP server ya está configurado.

## Procedimiento

### 1. Buscar temas via web_search

Usa la tool `web_search` (o `web_extract` como fallback) con estas queries:
- `"noticias Perote Veracruz hoy"`
- `"alertas emergencias Perote Veracruz"`

Para cada resultado extrae: título, URL, descripción breve.

### 2. Leer RSS feeds con web_extract

Extrae los siguientes feeds RSS y parsea los `<item>` o `<entry>`:
- `https://news.google.com/rss/search?q=Perote+Veracruz&hl=es-419&gl=MX&ceid=MX:es-419`
- `https://news.google.com/rss/search?q=alertas+Perote+Veracruz&hl=es-419&gl=MX&ceid=MX:es-419`

De cada ítem extrae: `<title>`, `<link>`, `<description>`.

### 3. Clasificar cada resultado

Para cada titular determina:
- **sentimiento**: `negative` si contiene palabras como accidente/crimen/crisis/protesta/alerta/emergencia/sismo/robo/inundación; `positive` si contiene logro/celebración/inauguración/éxito; `neutral` el resto
- **urgencia**: `alta` si sentimiento=negative, `media` en los demás
- **fuente_db**: `perplexity_signal` para web_search | `alerta_google_news` para RSS

### 4. Deduplicar contra ideas recientes usando mcp_postgres_query

```sql
SELECT id, titulo, metadata
FROM ideas
WHERE deleted_at IS NULL
  AND metadata->>'service' = 'social_listener'
  AND fuente IN ('perplexity_signal', 'alerta_google_news')
  AND created_at > NOW() - interval '14 days'
ORDER BY created_at DESC
LIMIT 200
```

Para cada candidato: si el título normalizado (sin acentos, minúsculas) es muy similar (>80%) a uno existente → UPDATE mentions en vez de INSERT.

### 5. Obtener ID del usuario sistema

```sql
SELECT id FROM usuarios
WHERE deleted_at IS NULL
ORDER BY created_at ASC
LIMIT 1
```

### 6. Insertar ideas nuevas con mcp_postgres_query

Para cada candidato no duplicado:

```sql
INSERT INTO ideas (
  titulo, descripcion, fuente, urgencia, estado,
  potencial_comercial, registrado_por, metadata
) VALUES (
  '<titulo>',
  '<descripcion>',
  '<perplexity_signal|alerta_google_news>',
  '<alta|media>',
  'nueva',
  false,
  '<usuario_id>',
  '{"service":"social_listener","mentions":1,"sentiment":"<neutral|positive|negative>","suggested_formats":["nota"],"url":"<url>","last_seen_at":"<iso_timestamp>"}'
)
RETURNING id
```

Para duplicados, UPDATE:
```sql
UPDATE ideas
SET metadata = jsonb_set(
  jsonb_set(metadata, '{mentions}', (COALESCE((metadata->>'mentions')::int,0)+1)::text::jsonb),
  '{last_seen_at}', '"<iso_timestamp>"'
)
WHERE id = '<id_existente>'
```

### 7. Cleanup con mcp_postgres_query

```sql
UPDATE ideas
SET deleted_at = NOW()
WHERE deleted_at IS NULL
  AND metadata->>'service' = 'social_listener'
  AND created_at < NOW() - interval '30 days'
```

### 8. Reporte final

Consulta el total:
```sql
SELECT COUNT(*) AS total FROM ideas WHERE deleted_at IS NULL AND estado = 'nueva'
```

Responde:
```
✅ crea-radar completado
   Insertadas: N ideas nuevas
   Actualizadas: M ideas (dedup)
   Total activas: T
```

## Restricciones

- USA SIEMPRE `mcp_postgres_query` para SQL — nunca psql/terminal/npm para base de datos.
- Valores válidos de `fuente`: solo `perplexity_signal` o `alerta_google_news`.
- Valores válidos de `urgencia`: `alta`, `media`, `baja`.
- Filtra siempre `WHERE deleted_at IS NULL`.
- Si web_search no responde, continúa solo con RSS.
