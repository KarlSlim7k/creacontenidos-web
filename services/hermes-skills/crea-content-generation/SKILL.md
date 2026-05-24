---
name: crea-content-generation
description: Lee ideas nuevas de Postgres con pg8000, genera 6 propuestas con delegate_task, e inserta en piezas_contenido con pg8000 directamente.
version: 2.0.0
metadata:
  hermes:
    tags: [content, propuestas, piezas_contenido, postgres, pg8000, delegation]
    category: crea
    requires_toolsets: [terminal, delegation]
---

# Skill: crea-content-generation

## Paso 1: Leer ideas nuevas con execute_code (pg8000)

```python
import os, json
import pg8000.native as pg

c = pg.Connection(
    host=os.environ.get("POSTGRES_HOST","postgres"),
    database=os.environ.get("POSTGRES_DB","crea_db"),
    user=os.environ.get("POSTGRES_USER","crea"),
    password=os.environ.get("POSTGRES_PASSWORD","change_me"),
    port=5432, timeout=10
)

ideas = c.run("""
    SELECT i.id::text, i.titulo, i.descripcion, i.fuente::text, i.categoria_id::text
    FROM ideas i
    WHERE i.deleted_at IS NULL AND i.estado IN ('nueva','aprobada')
      AND NOT EXISTS (
        SELECT 1 FROM piezas_contenido pc
        WHERE pc.deleted_at IS NULL AND pc.idea_id = i.id
          AND (pc.metadata->>'service') = 'content_generator'
      )
    ORDER BY i.created_at DESC LIMIT 3
""")

autor = c.run("SELECT id::text FROM usuarios WHERE deleted_at IS NULL ORDER BY created_at ASC LIMIT 1")[0][0]
c.close()

print("AUTOR:", autor)
print("IDEAS:", json.dumps([{"id":r[0],"titulo":r[1],"descripcion":r[2],"fuente":r[3],"cat":r[4]} for r in ideas]))
```

Si no hay ideas, termina con: "Sin ideas nuevas para procesar."

## Paso 2: Para cada idea — generar 6 formatos con delegate_task

Usa `delegate_task` con este prompt para cada subagente (un subagente por formato):

```
Genera contenido para CREA Contenidos (Perote, Veracruz).

Tema: <idea.titulo>
Fuente: <idea.fuente>
Formato: <formato>

Instrucciones según formato:
- nota: título + bajada + cuerpo (300-500 palabras) + datos útiles. Tono informativo, sin clickbait.
- post: texto <280 chars, emoji moderado, listo para publicar.
- audio: guion conversacional 60-90 segundos, con indicaciones de pausas.
- video: guion con escenas numeradas, tiempo estimado, locución, sugerencias visuales.
- meme: prompt ingenioso y respetuoso + texto top/bottom.
- infografia: título + 5-7 bullets de datos clave + fuentes.

Devuelve SOLO JSON sin texto adicional:
{"title":"...","body":"...","image_prompt":null,"ai_label":"asistido"}
```

## Paso 3: Insertar propuestas con execute_code (pg8000)

```python
import os, json, re, unicodedata
import pg8000.native as pg

# Datos del paso anterior — sustituir con los resultados reales
AUTOR_ID = "<autor_id_del_paso_1>"
PROPUESTAS = [
    # {"idea_id":"...","titulo":"...","body":"...","formato_ui":"nota","image_prompt":null,"ai_label":"asistido","cat_id":null},
    # ... (6 por idea)
]

FORMAT_MAP = {
    "nota": "nota_web", "post": "carrusel_instagram",
    "meme": "carrusel_instagram", "infografia": "carrusel_instagram",
    "audio": "capsula_audio", "video": "guion_video"
}

def slugify(t):
    t = unicodedata.normalize("NFD", t.lower())
    t = re.sub(r'[\u0300-\u036f]', '', t)
    t = re.sub(r'[^a-z0-9\s-]', '', t)
    return re.sub(r'[\s-]+', '-', t).strip('-')[:80]

c = pg.Connection(
    host=os.environ.get("POSTGRES_HOST","postgres"),
    database=os.environ.get("POSTGRES_DB","crea_db"),
    user=os.environ.get("POSTGRES_USER","crea"),
    password=os.environ.get("POSTGRES_PASSWORD","change_me"),
    port=5432, timeout=10
)

saved, skipped = 0, 0
for p in PROPUESTAS:
    # Skip si ya existe
    exists = c.run(
        "SELECT 1 FROM piezas_contenido WHERE deleted_at IS NULL AND idea_id=:iid "
        "AND (metadata->>'service')='content_generator' AND (metadata->>'ui_format')=:fmt LIMIT 1",
        iid=p["idea_id"], fmt=p["formato_ui"]
    )
    if exists: skipped += 1; continue

    # Slug único
    base_slug = slugify(p["titulo"])
    slug = base_slug
    n = 1
    while c.run("SELECT 1 FROM piezas_contenido WHERE slug=:s AND deleted_at IS NULL LIMIT 1", s=slug):
        slug = f"{base_slug}-{n}"; n += 1

    meta = json.dumps({
        "is_proposal": True, "service": "content_generator",
        "ui_format": p["formato_ui"], "ai_label": p["ai_label"],
        "status": "draft", "image_prompt": p.get("image_prompt"),
        "idea_id": p["idea_id"]
    })

    c.run("""
        INSERT INTO piezas_contenido
          (idea_id, titulo, slug, categoria_id, formato, estado, autor_id,
           contenido_markdown, borrador_ia, modelo_ia_usado, metadata)
        VALUES (:iid,:titulo,:slug,:cat,:fmt,'borrador',:autor,:body,:body,'kimi-k2.6',:meta)
    """, iid=p["idea_id"], titulo=p["titulo"][:400], slug=slug,
        cat=p.get("cat_id"), fmt=FORMAT_MAP.get(p["formato_ui"],"nota_web"),
        autor=AUTOR_ID, body=p["body"], meta=meta)
    saved += 1

    # Marcar idea como en_produccion
    c.run("UPDATE ideas SET estado='en_produccion' WHERE id=:iid AND estado='nueva'", iid=p["idea_id"])

c.close()
print(f"✅ crea-content-generation: {saved} propuestas guardadas, {skipped} skipped")
```
