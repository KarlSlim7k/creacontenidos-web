---
name: crea-radar
description: Obtiene noticias de Perote/Veracruz via RSS y las inserta en Postgres usando pg8000 en un solo bloque execute_code. Rápido, sin MCP, sin archivos intermedios.
version: 5.0.0
metadata:
  hermes:
    tags: [radar, listening, ideas, postgres, pg8000, rss]
    category: crea
    requires_toolsets: [terminal]
---

# Skill: crea-radar

Ejecuta el siguiente bloque Python con `execute_code`. Hace todo en un solo paso: RSS → Postgres.

```python
import urllib.request, re, os, json
from xml.etree import ElementTree as ET
from datetime import datetime, timezone
import pg8000.native as pg

# ── Config ────────────────────────────────────────────────────────────────
FEEDS = [
    "https://news.google.com/rss/search?q=Perote+Veracruz&hl=es-419&gl=MX&ceid=MX:es-419",
    "https://news.google.com/rss/search?q=alertas+Perote+Veracruz&hl=es-419&gl=MX&ceid=MX:es-419",
]
URGENCIA_KW = {"accidente","crimen","robo","incendio","alerta","emergencia","sismo",
               "inundacion","inundación","detenido","hallado","muerto","cuerpo",
               "balacera","asalto","asesinato","secuestro","explosión"}
MAX_ITEMS = 20

# ── Helpers ───────────────────────────────────────────────────────────────
def clean(t):
    t = re.sub(r'<[^>]+>', '', t or '').strip()
    t = re.sub(r'\s+', ' ', t)
    t = re.sub(r'\s+-\s+\S[\S]*\s*$', '', t)  # quitar " - Fuente" al final
    return t[:250]

def urgencia(titulo):
    tl = titulo.lower()
    return 'alta' if any(kw in tl for kw in URGENCIA_KW) else 'media'

# ── Obtener noticias RSS ─────────────────────────────────────────────────
items, seen = [], set()
for url in FEEDS:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "CREA-Radar/5.0"})
        xml = urllib.request.urlopen(req, timeout=15).read()
        root = ET.fromstring(xml)
        for item in root.findall(".//item"):
            t = item.find("title")
            l = item.find("link")
            if t is None or not t.text: continue
            titulo = clean(t.text)
            if not titulo or len(titulo) < 15 or titulo in seen: continue
            seen.add(titulo)
            link = (l.text or "").strip()[:500] if l is not None else ""
            items.append({"titulo": titulo, "url": link, "urgencia": urgencia(titulo)})
            if len(items) >= MAX_ITEMS: break
    except Exception as e:
        print(f"[WARN] Feed error: {e}")

print(f"Noticias encontradas: {len(items)}")

# ── Conectar a Postgres ─────────────────────────────────────────────────
c = pg.Connection(
    host=os.environ.get("POSTGRES_HOST", "postgres"),
    database=os.environ.get("POSTGRES_DB", "crea_db"),
    user=os.environ.get("POSTGRES_USER", "crea"),
    password=os.environ.get("POSTGRES_PASSWORD", "change_me"),
    port=5432, timeout=10
)

# Obtener autor_id
autor_rows = c.run("SELECT id FROM usuarios WHERE deleted_at IS NULL ORDER BY created_at ASC LIMIT 1")
autor_id = str(autor_rows[0][0])
now = datetime.now(timezone.utc).isoformat()

# ── Insertar noticias ─────────────────────────────────────────────────────
inserted, dupes = 0, 0
for it in items:
    meta = json.dumps({
        "service": "social_listener", "mentions": 1, "sentiment": "neutral",
        "suggested_formats": ["nota"], "url": it["url"], "last_seen_at": now
    })
    try:
        rows = c.run(
            """INSERT INTO ideas (titulo, descripcion, fuente, urgencia, estado,
                potencial_comercial, registrado_por, metadata)
               VALUES (:titulo, NULL, 'alerta_google_news', :urgencia, 'nueva',
                false, :autor, :meta)
               ON CONFLICT DO NOTHING RETURNING id""",
            titulo=it["titulo"], urgencia=it["urgencia"], autor=autor_id, meta=meta
        )
        if rows: inserted += 1
        else: dupes += 1
    except Exception as e:
        print(f"[ERROR] Insert failed for '{it['titulo'][:40]}': {e}")

# ── Cleanup (soft-delete >30 días) ───────────────────────────────────────
cleaned = c.run(
    """UPDATE ideas SET deleted_at = NOW()
       WHERE deleted_at IS NULL
         AND metadata->>'service' = 'social_listener'
         AND created_at < NOW() - interval '30 days'"""
)

# ── Reporte ──────────────────────────────────────────────────────────────
total = c.run("SELECT COUNT(*) FROM ideas WHERE deleted_at IS NULL AND estado='nueva'")[0][0]
c.close()

print(f"✅ crea-radar completado")
print(f"   Insertadas: {inserted}  |  Duplicadas: {dupes}  |  Total activas: {total}")
```
