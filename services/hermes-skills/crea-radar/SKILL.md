---
name: crea-radar
description: Obtiene noticias RSS de Perote/Veracruz con execute_code Python y las inserta en ideas con UNA sola llamada mcp_postgres_query (batch INSERT).
version: 4.0.0
metadata:
  hermes:
    tags: [radar, listening, ideas, postgres, mcp, rss]
    category: crea
    requires_toolsets: [terminal]
---

# Skill: crea-radar

Eres el editor de CREA Contenidos. Tu objetivo: obtener noticias de Perote/Veracruz e insertarlas en la DB.

## REGLA PRINCIPAL

Haz exactamente **3 llamadas a herramientas** en este orden:
1. `execute_code` — obtener RSS y construir el SQL
2. `mcp_postgres_query` — ejecutar el batch INSERT (una sola llamada)
3. `mcp_postgres_query` — contar el total final

## Paso 1: execute_code (Python) — obtener noticias y construir SQL

```python
import urllib.request, re, json
from datetime import datetime, timezone
from xml.etree import ElementTree as ET

URLS = [
    "https://news.google.com/rss/search?q=Perote+Veracruz&hl=es-419&gl=MX&ceid=MX:es-419",
    "https://news.google.com/rss/search?q=alertas+Perote+Veracruz&hl=es-419&gl=MX&ceid=MX:es-419",
]
URGENCIA_KW = ["accidente","crimen","robo","incendio","alerta","emergencia","sismo","inundacion","detenido","hallado","muerto","cuerpo","balacera","asalto","asesinato"]

def clean(t):
    t = re.sub(r'<[^>]+>','',t or '').strip()
    t = re.sub(r'\s+',' ',t)
    t = re.sub(r'\s+-\s+\S+.*$','',t)  # quitar "- Fuente" al final
    return t[:250]

def esc(s):
    return s.replace("'","''").replace("\\","\\\\")

def urgencia(t):
    tl = t.lower()
    for kw in URGENCIA_KW:
        if kw in tl: return 'alta'
    return 'media'

items, seen = [], set()
for url in URLS:
    try:
        req = urllib.request.Request(url, headers={"User-Agent":"CREA/4.0"})
        xml = urllib.request.urlopen(req, timeout=15).read()
        root = ET.fromstring(xml)
        for item in root.findall(".//item"):
            title_el = item.find("title")
            link_el = item.find("link")
            if title_el is None: continue
            titulo = clean(title_el.text or "")
            if not titulo or titulo in seen or len(titulo)<15: continue
            seen.add(titulo)
            url_val = (link_el.text or "").strip()[:500] if link_el is not None else ""
            items.append({"titulo": esc(titulo), "url": esc(url_val), "urgencia": urgencia(titulo)})
            if len(items) >= 15: break
        if len(items) >= 15: break
    except Exception as e:
        print(f"RSS error: {e}")

now = datetime.now(timezone.utc).isoformat()

# Obtener autor_id via una query embebida no es posible aquí,
# así que usamos un placeholder que el agente debe reemplazar con el autor_id real.
# El agente debe ejecutar primero: SELECT id FROM usuarios WHERE deleted_at IS NULL ORDER BY created_at ASC LIMIT 1
# y sustituir AUTOR_UUID_AQUI con el resultado.

values = []
for it in items:
    meta = json.dumps({
        "service":"social_listener","mentions":1,"sentiment":"neutral",
        "suggested_formats":["nota"],"url":it["url"],"last_seen_at":now
    }).replace("'","''")
    values.append(
        f"('{it['titulo']}', NULL, 'alerta_google_news', '{it['urgencia']}', 'nueva', false, 'AUTOR_UUID_AQUI', '{meta}')"
    )

if values:
    sql = "INSERT INTO ideas (titulo, descripcion, fuente, urgencia, estado, potencial_comercial, registrado_por, metadata)\nVALUES\n" + ",\n".join(values) + "\nON CONFLICT DO NOTHING RETURNING id;"
    print("COUNT:", len(values))
    print("SQL:", sql[:200], "...")
    # Guardar SQL completo
    with open("/tmp/radar_batch.sql","w") as f:
        f.write(sql)
    print("ITEMS:", json.dumps(items))
else:
    print("COUNT: 0")
    print("SQL: SELECT 1")
```

## Paso 2: mcp_postgres_query — obtener autor_id

```sql
SELECT id FROM usuarios WHERE deleted_at IS NULL ORDER BY created_at ASC LIMIT 1
```

Guarda el UUID como `autor_id`.

## Paso 3: Leer el SQL y sustituir AUTOR_UUID_AQUI

Lee `/tmp/radar_batch.sql` con `read_file`, reemplaza `AUTOR_UUID_AQUI` con el `autor_id` del paso 2.

## Paso 4: mcp_postgres_query — ejecutar el batch INSERT

Ejecuta el SQL completo (con el autor_id sustituido) en una sola llamada a `mcp_postgres_query`.

## Paso 5: mcp_postgres_query — contar total

```sql
SELECT COUNT(*) AS total FROM ideas WHERE deleted_at IS NULL AND estado = 'nueva'
```

## Reporte final

```
✅ crea-radar completado
   Noticias encontradas: N
   Ideas insertadas: M
   Total activas en DB: T
```
