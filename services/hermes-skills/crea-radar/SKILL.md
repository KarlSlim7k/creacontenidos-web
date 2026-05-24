---
name: crea-radar
description: Detecta temas relevantes de Perote/Veracruz vía RSS de Google News e inserta en la tabla ideas usando mcp_postgres_query directamente (sin psql, sin archivos SQL intermedios).
version: 2.0.0
metadata:
  hermes:
    tags: [radar, listening, ideas, postgres, mcp]
    category: crea
    requires_toolsets: [web, terminal]
---

# Skill: crea-radar

Eres el editor de CREA Contenidos. Tu trabajo es encontrar noticias locales e insertarlas en la base de datos.

## REGLAS ABSOLUTAS

1. **Usa `mcp_postgres_query` para CADA operación SQL**. No generes archivos .sql. No uses psql. No uses npm/node para DB.
2. **Limpia el HTML** de las descripciones antes de insertar: elimina etiquetas `<a href...>`, `<b>`, `</b>`, etc. — deja solo texto plano.
3. **Inserta de uno en uno** con `mcp_postgres_query`. No hagas batches ni archivos intermedios.

## Paso 1: Obtener noticias de Google News RSS

Usa `web_extract` en estas URLs y extrae los títulos de los `<title>`:

- `https://news.google.com/rss/search?q=Perote+Veracruz&hl=es-419&gl=MX&ceid=MX:es-419`
- `https://news.google.com/rss/search?q=alertas+Perote+Veracruz+hoy&hl=es-419&gl=MX&ceid=MX:es-419`

De cada `<item>` extrae:
- `titulo` = contenido del `<title>` (texto antes del primer ` - ` si tiene fuente al final)
- `url` = contenido del `<link>`

Toma máximo **15 noticias en total** de ambos feeds combinados.

## Paso 2: Obtener ID del usuario sistema con mcp_postgres_query

```sql
SELECT id FROM usuarios WHERE deleted_at IS NULL ORDER BY created_at ASC LIMIT 1
```

Guarda este UUID como `autor_id`.

## Paso 3: Para cada noticia — insertar con mcp_postgres_query

Para cada titular:

**3a. Determinar fuente y urgencia:**
- `fuente` = siempre `alerta_google_news`
- `urgencia` = `alta` si el título contiene: accidente, crimen, crisis, robo, asesinato, incendio, alerta, emergencia, sismo, inundación, detenido, hallado, muerto
- `urgencia` = `media` en todos los demás casos

**3b. Llamar mcp_postgres_query con este INSERT exacto:**

```sql
INSERT INTO ideas (titulo, descripcion, fuente, urgencia, estado, potencial_comercial, registrado_por, metadata)
VALUES (
  'TITULO_AQUI',
  'SIN_DESCRIPCION',
  'alerta_google_news',
  'media',
  'nueva',
  false,
  'AUTOR_ID_AQUI',
  '{"service":"social_listener","mentions":1,"sentiment":"neutral","suggested_formats":["nota"],"url":"URL_AQUI","last_seen_at":"TIMESTAMP_AQUI"}'
)
ON CONFLICT DO NOTHING
RETURNING id
```

Sustituye:
- `TITULO_AQUI` → el título limpio (escapa comillas simples: `'` → `''`)
- `AUTOR_ID_AQUI` → el UUID del paso 2
- `URL_AQUI` → la URL de la noticia
- `TIMESTAMP_AQUI` → timestamp actual en ISO 8601
- `urgencia` → `alta` o `media` según la regla anterior

**Importante:** Ejecuta `mcp_postgres_query` una vez por cada noticia. No acumules.

## Paso 4: Reporte final

Al terminar todas las inserciones, llama `mcp_postgres_query`:

```sql
SELECT COUNT(*) AS total_activas FROM ideas WHERE deleted_at IS NULL AND estado = 'nueva'
```

Responde con:
```
✅ crea-radar completado
   Noticias procesadas: N
   Ideas insertadas: M
   Total activas en DB: T
```
