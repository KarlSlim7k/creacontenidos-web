---
name: crea-image-generation
description: Procesa cola assets_multimedia tipo imagen con image_generate y pg8000 para DB — sin MCP.
version: 2.0.0
metadata:
  hermes:
    tags: [imagen, assets_multimedia, cola, image_generate, pg8000]
    category: crea
    requires_toolsets: [terminal, image_gen]
---

# Skill: crea-image-generation

**IMPORTANTE**: Usa `execute_code` con pg8000 para todas las operaciones DB. No uses MCP.

## Paso 1: Verificar cola con execute_code

```python
import os
import pg8000.native as pg

c = pg.Connection(
    host=os.environ.get("POSTGRES_HOST","postgres"),
    database=os.environ.get("POSTGRES_DB","crea_db"),
    user=os.environ.get("POSTGRES_USER","crea"),
    password=os.environ.get("POSTGRES_PASSWORD","change_me"),
    port=5432, timeout=10
)
rows = c.run("""
    UPDATE assets_multimedia SET estado='processing'
    WHERE id IN (
      SELECT id FROM assets_multimedia
      WHERE deleted_at IS NULL AND estado='queued'
        AND tipo IN ('image','meme','infographic')
      ORDER BY created_at ASC LIMIT 3 FOR UPDATE SKIP LOCKED
    ) RETURNING id::text, tipo, original_prompt
""")
c.close()
import json
print(json.dumps([{"id":r[0],"tipo":r[1],"prompt":r[2]} for r in rows]))
```

Si la lista es vacía, termina: "Cola vacía."

## Paso 2: Para cada asset — generar imagen con image_generate

Llama `image_generate` con el `prompt`.

## Paso 3: Guardar resultado con execute_code

```python
import os
import pg8000.native as pg

c = pg.Connection(
    host=os.environ.get("POSTGRES_HOST","postgres"), database=os.environ.get("POSTGRES_DB","crea_db"),
    user=os.environ.get("POSTGRES_USER","crea"), password=os.environ.get("POSTGRES_PASSWORD","change_me"),
    port=5432, timeout=10
)
# Sustituir ASSET_ID y STATUS con los valores reales
ASSET_ID = "<asset_id>"
SUCCESS = True
FILE_PATH = f"/assets/img/generated/{ASSET_ID}.png"

if SUCCESS:
    c.run("UPDATE assets_multimedia SET estado='generated', file_path=:fp WHERE id=:id",
          fp=FILE_PATH, id=ASSET_ID)
else:
    c.run("UPDATE assets_multimedia SET estado='failed' WHERE id=:id", id=ASSET_ID)
c.close()
print(f"✅ Asset {ASSET_ID}: {'generated' if SUCCESS else 'failed'}")
```

## Pre-condición (wakeAgent gate)

Este skill se activa solo cuando el script de gate detecta ítems pendientes.
Si no hay nada en cola, el cron termina silenciosamente (0 tokens).

## Procedimiento

### 1. Reclamar lote con bloqueo optimista

```sql
UPDATE assets_multimedia
SET estado = 'processing'
WHERE id IN (
  SELECT id FROM assets_multimedia
  WHERE deleted_at IS NULL
    AND estado = 'queued'
    AND tipo IN ('image', 'meme', 'infographic')
  ORDER BY created_at ASC
  LIMIT 5
  FOR UPDATE SKIP LOCKED
)
RETURNING id, tipo, original_prompt, pieza_id, metadata;
```

Si no hay filas, termina silenciosamente.

### 2. Para cada asset

#### 2a. Construir prompt según tipo

- `image` → usar `original_prompt` tal cual
- `meme` → `Meme en formato imagen: texto superior "[top]", texto inferior "[bottom]". Estilo: [descripción del tema]. Sin texto explícito ni ofensivo.`
- `infographic` → `Infografía visual sobre: [original_prompt]. Estilo limpio, colores del medio CREA (azul/blanco). En español.`

#### 2b. Generar imagen con image_generate

Usa la tool `image_generate` con el prompt construido.

#### 2c. Guardar archivo

Escribe la imagen en `/output/img/<asset_id>.png` (bind-mount compartido con crea_web).

#### 2d. Actualizar en Postgres

**Éxito:**
```sql
UPDATE assets_multimedia
SET estado = 'generated',
    file_path = '/assets/img/generated/<asset_id>.png',
    metadata = metadata || '{"dry_run": false}'
WHERE id = '<asset_id>';
```

**Error:**
```sql
UPDATE assets_multimedia
SET estado = 'failed',
    metadata = metadata || '{"error": "<mensaje>"}'
WHERE id = '<asset_id>';
```

### 3. Reporte

```
🖼️ crea-image-generation completado
   Generadas: N  |  Fallidas: M
```

## Restricciones

- Solo procesa `tipo IN ('image', 'meme', 'infographic')` — no tocar `tipo='audio'`.
- El path de destino es `/output/img/` (bind-mount), nunca escribir directamente en `apps/web/`.
- Si `image_generate` no está disponible, marcar `estado='failed'` con `error: 'image_gen toolset not available'`.
- Filtra siempre `WHERE deleted_at IS NULL`.
