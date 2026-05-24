---
name: crea-content-generation
description: Lee ideas nuevas con pg8000, genera los 6 formatos en UNA sola respuesta del LLM (JSON array), inserta con pg8000. Rápido y sin subagentes.
version: 3.0.0
metadata:
  hermes:
    tags: [content, propuestas, piezas_contenido, pg8000]
    category: crea
    requires_toolsets: [terminal]
---

# Skill: crea-content-generation

## Paso 1: Leer ideas con execute_code (pg8000)

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
    ORDER BY i.created_at DESC LIMIT 2
""")
autor = c.run("SELECT id::text FROM usuarios WHERE deleted_at IS NULL ORDER BY created_at ASC LIMIT 1")[0][0]
c.close()
if not ideas:
    print("Sin ideas nuevas.")
else:
    print("AUTOR:", autor)
    print("IDEAS:", json.dumps([{"id":r[0],"titulo":r[1],"desc":r[2],"fuente":r[3],"cat":r[4]} for r in ideas]))
```

Si `Sin ideas nuevas.` → termina aquí.

## Paso 2: Para cada idea — generar los 6 formatos en UNA sola llamada

Responde al usuario con este prompt interno (no uses delegate_task):

> Eres el editor de CREA Contenidos (Perote, Veracruz). Para la siguiente noticia, genera los 6 formatos en un solo JSON array.
>
> Noticia: **<idea.titulo>**
> Fuente: <idea.fuente>
>
> Devuelve SOLO un JSON array con exactamente 6 objetos, uno por formato:
> ```json
> [
>   {"formato": "nota",       "title": "...", "body": "...(300-500 palabras, informativo, sin clickbait)...", "image_prompt": null, "ai_label": "asistido"},
>   {"formato": "post",       "title": "...", "body": "...(< 280 chars, emoji moderado)...", "image_prompt": null, "ai_label": "asistido"},
>   {"formato": "audio",      "title": "...", "body": "...(guion 60-90s con pausas)...", "image_prompt": null, "ai_label": "asistido"},
>   {"formato": "video",      "title": "...", "body": "...(guion con escenas numeradas)...", "image_prompt": null, "ai_label": "asistido"},
>   {"formato": "meme",       "title": "...", "body": "...(prompt + texto top/bottom)...", "image_prompt": "...", "ai_label": "asistido"},
>   {"formato": "infografia", "title": "...", "body": "...(título + 5-7 bullets + fuentes)...", "image_prompt": null, "ai_label": "asistido"}
> ]
> ```
> Sin texto adicional fuera del JSON.

Guarda el JSON array resultante.

## Paso 3: Insertar propuestas con execute_code (pg8000)

```python
import os, json, re, unicodedata
import pg8000.native as pg

AUTOR_ID = "<autor_id_del_paso_1>"
IDEA_ID  = "<idea_id_del_paso_1>"
CAT_ID   = None  # o el cat_id si existe

# Sustituir con el JSON array del Paso 2
PROPUESTAS = [
    {"formato":"nota",       "title":"...", "body":"...", "image_prompt":None, "ai_label":"asistido"},
    {"formato":"post",       "title":"...", "body":"...", "image_prompt":None, "ai_label":"asistido"},
    {"formato":"audio",      "title":"...", "body":"...", "image_prompt":None, "ai_label":"asistido"},
    {"formato":"video",      "title":"...", "body":"...", "image_prompt":None, "ai_label":"asistido"},
    {"formato":"meme",       "title":"...", "body":"...", "image_prompt":"...", "ai_label":"asistido"},
    {"formato":"infografia", "title":"...", "body":"...", "image_prompt":None, "ai_label":"asistido"},
]

FORMAT_MAP = {
    "nota":"nota_web","post":"carrusel_instagram","meme":"carrusel_instagram",
    "infografia":"carrusel_instagram","audio":"capsula_audio","video":"guion_video"
}

def slugify(t):
    t = unicodedata.normalize("NFD", (t or "sin-titulo").lower())
    t = re.sub(r'[\u0300-\u036f]','',t)
    t = re.sub(r'[^a-z0-9\s-]','',t)
    return re.sub(r'[\s-]+','-',t).strip('-')[:80] or "propuesta"

c = pg.Connection(
    host=os.environ.get("POSTGRES_HOST","postgres"),
    database=os.environ.get("POSTGRES_DB","crea_db"),
    user=os.environ.get("POSTGRES_USER","crea"),
    password=os.environ.get("POSTGRES_PASSWORD","change_me"),
    port=5432, timeout=10
)

saved = 0
for p in PROPUESTAS:
    exists = c.run(
        "SELECT 1 FROM piezas_contenido WHERE deleted_at IS NULL AND idea_id=:iid "
        "AND (metadata->>'service')='content_generator' AND (metadata->>'ui_format')=:fmt LIMIT 1",
        iid=IDEA_ID, fmt=p["formato"]
    )
    if exists: continue

    base = slugify(p["title"])
    slug, n = base, 1
    while c.run("SELECT 1 FROM piezas_contenido WHERE slug=:s AND deleted_at IS NULL LIMIT 1", s=slug):
        slug = f"{base}-{n}"; n += 1

    meta = json.dumps({"is_proposal":True,"service":"content_generator","ui_format":p["formato"],
                       "ai_label":p["ai_label"],"status":"draft","image_prompt":p["image_prompt"],"idea_id":IDEA_ID})
    c.run("""INSERT INTO piezas_contenido
               (idea_id, titulo, slug, categoria_id, formato, estado, autor_id,
                contenido_markdown, borrador_ia, modelo_ia_usado, metadata)
             VALUES (:iid,:titulo,:slug,:cat,:fmt,'borrador',:autor,:body,:body,'kimi-k2.6',:meta)""",
          iid=IDEA_ID, titulo=(p["title"] or "Sin título")[:400], slug=slug, cat=CAT_ID,
          fmt=FORMAT_MAP.get(p["formato"],"nota_web"), autor=AUTOR_ID,
          body=p["body"] or "", meta=meta)
    saved += 1

c.run("UPDATE ideas SET estado='en_produccion' WHERE id=:iid AND estado='nueva'", iid=IDEA_ID)
c.close()
print(f"✅ Insertadas {saved} propuestas para idea {IDEA_ID[:8]}")
```

Repite Pasos 2-3 para cada idea del Paso 1.
