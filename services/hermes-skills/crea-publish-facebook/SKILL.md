---
name: crea-publish-facebook
description: Publica en Facebook las piezas aprobadas y actualiza la DB con pg8000. Sin MCP, sin intervención manual.
version: 2.0.0
metadata:
  hermes:
    tags: [facebook, publicacion, pg8000]
    category: crea
    requires_toolsets: [terminal]
---

# Skill: crea-publish-facebook

Ejecuta este bloque Python con `execute_code`. Hace todo en un solo paso.

```python
import os, json, urllib.request, urllib.parse
import pg8000.native as pg

FB_TOKEN = os.environ.get("FB_PAGE_ACCESS_TOKEN", "")
FB_PAGE_ID = os.environ.get("FB_PAGE_ID", "")
FB_API = os.environ.get("FB_API_VERSION", "v18.0")

if not FB_TOKEN or not FB_PAGE_ID:
    print("❌ FB_PAGE_ACCESS_TOKEN o FB_PAGE_ID no configurados — modo dry-run")
    exit()

# ── Conectar a Postgres ───────────────────────────────────────────────────
c = pg.Connection(
    host=os.environ.get("POSTGRES_HOST","postgres"),
    database=os.environ.get("POSTGRES_DB","crea_db"),
    user=os.environ.get("POSTGRES_USER","crea"),
    password=os.environ.get("POSTGRES_PASSWORD","change_me"),
    port=5432, timeout=10
)

# ── Obtener piezas aprobadas sin publicación en Facebook ─────────────────
piezas = c.run("""
    SELECT pc.id::text, pc.titulo, pc.borrador_ia, pc.contenido_markdown
    FROM piezas_contenido pc
    WHERE pc.deleted_at IS NULL
      AND pc.estado = 'aprobada'
      AND NOT EXISTS (
        SELECT 1 FROM publicaciones p
        WHERE p.pieza_id = pc.id
          AND p.canal = 'facebook'
          AND p.estado IN ('programada','publicada')
          AND p.deleted_at IS NULL
      )
    ORDER BY pc.updated_at DESC
    LIMIT 5
""")

if not piezas:
    print("Sin piezas aprobadas pendientes de publicar.")
    c.close()
    exit()

print(f"Piezas a publicar: {len(piezas)}")

publicadas, fallidas = 0, 0

for pieza in piezas:
    pieza_id, titulo, borrador, contenido = pieza[0], pieza[1], pieza[2], pieza[3]

    # Construir texto del post (solo texto, sin imágenes)
    texto = borrador or contenido or titulo or ""
    # Limpiar Markdown básico
    import re
    texto = re.sub(r'#{1,6}\s*', '', texto)
    texto = re.sub(r'\*{1,2}([^*]+)\*{1,2}', r'\1', texto)
    texto = re.sub(r'\n{3,}', '\n\n', texto).strip()
    texto = texto[:2000]  # límite seguro para FB

    # ── Publicar en Facebook ─────────────────────────────────────────────
    try:
        data = urllib.parse.urlencode({"message": texto, "access_token": FB_TOKEN}).encode()
        req = urllib.request.Request(
            f"https://graph.facebook.com/{FB_API}/{FB_PAGE_ID}/feed",
            data=data, method="POST"
        )
        resp = json.loads(urllib.request.urlopen(req, timeout=15).read())
        fb_post_id = resp.get("id","")

        # ── UPDATE pieza + INSERT publicacion ────────────────────────────
        c.run("""
            UPDATE piezas_contenido
            SET estado = 'publicada', updated_at = NOW()
            WHERE id = :id
        """, id=pieza_id)

        c.run("""
            INSERT INTO publicaciones (pieza_id, canal, estado, publicada_en, id_externo, url_publicacion, gestionado_por, metadata)
            VALUES (:pieza, 'facebook', 'publicada', NOW(), :ext_id, :url, 'hermes',
                    '{"service":"hermes","fb_post_id":":fb_id"}')
        """, pieza=pieza_id, ext_id=fb_post_id,
             url=f"https://www.facebook.com/{fb_post_id.replace('_','/')}",
             fb_id=fb_post_id)

        publicadas += 1
        print(f"✅ Publicado: {titulo[:50]} → {fb_post_id}")

    except Exception as e:
        # Marcar como fallida en DB
        c.run("""
            INSERT INTO publicaciones (pieza_id, canal, estado, gestionado_por, error_detalle, metadata)
            VALUES (:pieza, 'facebook', 'fallida', 'hermes', :err, '{"service":"hermes"}')
        """, pieza=pieza_id, err=str(e)[:500])
        fallidas += 1
        print(f"❌ Error: {titulo[:40]} — {e}")

c.close()
print(f"\n📤 crea-publish-facebook: {publicadas} publicadas | {fallidas} fallidas")
```
