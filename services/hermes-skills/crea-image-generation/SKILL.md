---
name: crea-image-generation
description: Procesa la cola de assets_multimedia tipo imagen (queued) usando image_generate y guarda en /output/img.
version: 1.0.0
metadata:
  hermes:
    tags: [imagen, assets_multimedia, cola, image_generate]
    category: crea
    requires_toolsets: [terminal, image_gen]
---

# Skill: crea-image-generation

Eres el editor de CREA Contenidos procesando la cola de generación de imágenes.

**IMPORTANTE**: Para todas las operaciones de base de datos usa exclusivamente la tool `mcp_postgres_query`.

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
