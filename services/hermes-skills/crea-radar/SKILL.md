---
name: crea-radar
description: Obtiene noticias de Perote/Veracruz vía RSS (Google News) usando execute_code Python, e inserta en ideas con mcp_postgres_query directamente.
version: 3.0.0
metadata:
  hermes:
    tags: [radar, listening, ideas, postgres, mcp, rss]
    category: crea
    requires_toolsets: [terminal]
---

# Skill: crea-radar

Eres el editor de CREA Contenidos. Obtén noticias locales e insértalas en la base de datos.

## REGLAS ABSOLUTAS

1. Usa `execute_code` con Python para obtener el RSS (Python puede hacer requests HTTP).
2. Usa `mcp_postgres_query` para cada INSERT en Postgres — uno por noticia, sin archivos intermedios.
3. Limpia el HTML de las descripciones antes de insertar.

## Paso 1: Obtener ID del sistema con mcp_postgres_query

```sql
SELECT id FROM usuarios WHERE deleted_at IS NULL ORDER BY created_at ASC LIMIT 1
```

Guarda el UUID como `autor_id`.

## Paso 2: Obtener noticias con execute_code (Python)

```python
import urllib.request, xml.etree.ElementTree as ET, re, json

URLS = [
    "https://news.google.com/rss/search?q=Perote+Veracruz&hl=es-419&gl=MX&ceid=MX:es-419",
    "https://news.google.com/rss/search?q=alertas+Perote+Veracruz&hl=es-419&gl=MX&ceid=MX:es-419",
]

URGENCIA_KEYWORDS = ["accidente","crimen","crisis","robo","asesinato","incendio","alerta","emergencia","sismo","inundación","detenido","hallado","muerto","cuerpo","balacera","asalto"]

def clean_html(text):
    if not text: return ""
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text[:300]

def get_urgencia(titulo):
    t = titulo.lower()
    for kw in URGENCIA_KEYWORDS:
        if kw in t:
            return "alta"
    return "media"

noticias = []
seen = set()
for url in URLS:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "CREA-Radar/3.0"})
        r = urllib.request.urlopen(req, timeout=15)
        root = ET.fromstring(r.read())
        for item in root.findall(".//item")[:10]:
            title_el = item.find("title")
            link_el = item.find("link")
            if title_el is None or not title_el.text:
                continue
            titulo_raw = title_el.text.strip()
            # Quitar " - Fuente" al final si existe
            titulo = re.sub(r'\s+-\s+[^-]+$', '', titulo_raw).strip()
            titulo = clean_html(titulo)
            if titulo in seen or len(titulo) < 10:
                continue
            seen.add(titulo)
            link = link_el.text.strip() if link_el is not None and link_el.text else ""
            noticias.append({
                "titulo": titulo.replace("'", "''"),  # escape SQL
                "url": link[:500],
                "urgencia": get_urgencia(titulo)
            })
    except Exception as e:
        print(f"Error fetch {url}: {e}")

print(json.dumps(noticias[:15]))
```

Guarda la lista de noticias del output.

## Paso 3: Insertar cada noticia con mcp_postgres_query

Para **cada noticia** de la lista (una llamada a `mcp_postgres_query` por noticia):

```sql
INSERT INTO ideas (titulo, descripcion, fuente, urgencia, estado, potencial_comercial, registrado_por, metadata)
VALUES (
  '<titulo_escapado>',
  NULL,
  'alerta_google_news',
  '<alta_o_media>',
  'nueva',
  false,
  '<autor_id>',
  '{"service":"social_listener","mentions":1,"sentiment":"neutral","suggested_formats":["nota"],"url":"<url>","last_seen_at":"<NOW()>"}'
)
ON CONFLICT DO NOTHING
RETURNING id
```

Si el resultado de `RETURNING id` está vacío, la noticia ya existía (duplicado) — continúa con la siguiente.

## Paso 4: Contar total con mcp_postgres_query

```sql
SELECT COUNT(*) AS total FROM ideas WHERE deleted_at IS NULL AND estado = 'nueva'
```

## Paso 5: Reporte

Responde:
```
✅ crea-radar completado
   Noticias encontradas: N
   Ideas insertadas: M  |  Duplicadas (skip): K
   Total activas en DB: T
```
