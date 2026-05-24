---
name: crea-audio-generation
description: Procesa la cola de assets_multimedia tipo audio (queued) con ElevenLabs Flash y guarda en /output/audio.
version: 1.0.0
metadata:
  hermes:
    tags: [audio, tts, elevenlabs, assets_multimedia, cola]
    category: crea
    requires_toolsets: [terminal, tts]
---

# Skill: crea-audio-generation

Eres el editor de CREA Contenidos procesando la cola de generación de audio narrado.

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
    AND tipo = 'audio'
  ORDER BY created_at ASC
  LIMIT 3
  FOR UPDATE SKIP LOCKED
)
RETURNING id, tipo, original_prompt, pieza_id, metadata;
```

Si no hay filas, termina silenciosamente.

### 2. Para cada asset — obtener texto de la pieza asociada

```sql
SELECT borrador_ia, contenido_markdown, titulo
FROM piezas_contenido
WHERE id = '<pieza_id>' AND deleted_at IS NULL
LIMIT 1;
```

Usar `borrador_ia` si existe, sino `contenido_markdown`, sino `titulo`.

### 3. Limpiar texto para TTS

Aplicar estas transformaciones al texto antes de enviarlo a ElevenLabs:
- Eliminar marcadores Markdown: `##`, `**`, `_`, `*`
- Eliminar URLs (`https?://\S+`)
- Eliminar menciones (`@usuario`)
- Eliminar emojis
- Eliminar `...` excesivos (reducir a uno)
- Normalizar saltos de línea múltiples a doble salto
- Dividir en chunks de máximo 150 palabras por párrafo

### 4. Generar audio con text_to_speech (ElevenLabs Flash)

Usa la tool `text_to_speech` con:
- **modelo**: `eleven_flash_v2_5` (más barato, multilingual, soporta español)
- **voice_id**: `EXAVITQu4vr4xnSDxMaL` (Sarah — o el valor de `ELEVENLABS_VOICE_ID`)
- **texto**: texto limpio del paso 3 (primer chunk si es largo, o texto completo si ≤150 palabras)

Si el texto tiene múltiples chunks, generar un archivo por chunk y luego concatenar con:
```bash
ffmpeg -f concat -safe 0 -i /tmp/chunks.txt -c copy /output/audio/<asset_id>.mp3
```

#### Llamada directa a ElevenLabs si text_to_speech no está disponible:

```bash
curl -s -X POST \
  "https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID:-EXAVITQu4vr4xnSDxMaL}" \
  -H "xi-api-key: ${ELEVENLABS_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "<texto_limpio>",
    "model_id": "eleven_flash_v2_5",
    "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}
  }' \
  --output /output/audio/<asset_id>.mp3
```

### 5. Actualizar en Postgres

**Éxito:**
```sql
UPDATE assets_multimedia
SET estado = 'generated',
    file_path = '/assets/audio/<asset_id>.mp3',
    metadata = metadata || '{"dry_run": false, "model": "eleven_flash_v2_5"}'
WHERE id = '<asset_id>';
```

**Error:**
```sql
UPDATE assets_multimedia
SET estado = 'failed',
    metadata = metadata || '{"error": "<mensaje>"}'
WHERE id = '<asset_id>';
```

### 6. Reporte

```
🔊 crea-audio-generation completado
   Generados: N  |  Fallidos: M
```

## Restricciones

- Solo procesa `tipo = 'audio'` — no tocar imágenes.
- Usar siempre `eleven_flash_v2_5` (modelo free/barato) para pruebas.
  Cambiar a `eleven_multilingual_v2` en producción cuando el plan lo permita.
- El path de destino es `/output/audio/` (bind-mount), nunca escribir en `apps/web/`.
- Si `ELEVENLABS_API_KEY` está vacío, marcar `estado='failed'` con `error: 'ELEVENLABS_API_KEY not configured'`.
- Filtra siempre `WHERE deleted_at IS NULL`.
