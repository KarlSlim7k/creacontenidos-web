---
name: crea-editorial-gate
description: Presenta propuestas pendientes a Emmanuel por Telegram, espera su decisión y actualiza Postgres (aprobar/rechazar/programar/regenerar).
version: 1.0.0
metadata:
  hermes:
    tags: [gate, editorial, telegram, aprobacion, piezas_contenido]
    category: crea
    requires_toolsets: [terminal, messaging]
---

# Skill: crea-editorial-gate

Eres el editor de CREA Contenidos presentando propuestas para aprobación editorial.

## Procedimiento

### 1. Obtener propuestas pendientes de revisión

```sql
SELECT
  pc.id,
  pc.titulo,
  pc.formato::text AS formato,
  pc.borrador_ia,
  pc.contenido_markdown,
  pc.metadata,
  i.titulo AS idea_titulo,
  i.fuente::text AS fuente
FROM piezas_contenido pc
LEFT JOIN ideas i ON i.id = pc.idea_id
WHERE pc.deleted_at IS NULL
  AND pc.estado = 'borrador'
  AND (pc.metadata->>'is_proposal') = 'true'
  AND pc.created_at > NOW() - interval '24 hours'
ORDER BY pc.created_at DESC
LIMIT 5;
```

Si no hay propuestas, responde: "Sin propuestas pendientes de revisión." y termina.

### 2. Para cada propuesta — enviar preview por Telegram

Usa `send_message` hacia `telegram:${TELEGRAM_HOME_CHANNEL}` con este formato:

```
📋 *Propuesta para revisión*

🏷️ *Formato:* <formato_ui> (ej: Nota Web)
💡 *Tema:* <idea_titulo>
📰 *Título:* <pc.titulo>

<primeras 300 chars del borrador_ia o contenido_markdown>
[...]

---
🆔 ID corto: `<primeros 8 chars del pc.id>`

Responde con:
✅ `aprobar <id>` — publicar en los canales asignados
❌ `rechazar <id> <motivo>` — descartar esta propuesta
📅 `programar <id> <fecha>` — ej: programar abc12345 lunes 8am
🔄 `regenerar <id>` — generar nueva versión de esta propuesta
```

Envía un mensaje por propuesta (máximo 5 en el mismo ciclo).

### 3. Esperar respuesta de Emmanuel

Usa `clarify` o espera respuesta en la sesión activa de Telegram.

Parsear comandos recibidos:

| Comando | Acción |
|---------|--------|
| `aprobar <id>` | Aprobar propuesta → INSERT en publicaciones |
| `rechazar <id> [motivo]` | Rechazar → UPDATE estado='rechazada' |
| `programar <id> <fecha>` | Programar → INSERT en publicaciones con fecha |
| `regenerar <id>` | Trigger nueva generación de contenido para esa idea |

El `<id>` puede ser los primeros 8 caracteres del UUID — buscar con `WHERE id::text LIKE '<id>%'`.

### 4. Ejecutar la acción según respuesta

#### APROBAR

```sql
-- Actualizar estado de la pieza
UPDATE piezas_contenido
SET estado = 'aprobada'
WHERE id = '<pieza_id>' AND deleted_at IS NULL;

-- Insertar en publicaciones para Facebook (canal principal)
INSERT INTO publicaciones (pieza_id, canal, estado, programada_para, gestionado_por)
VALUES (
  '<pieza_id>',
  'facebook',
  'programada',
  NOW() + interval '5 minutes',
  'hermes'
);
```

Confirmar: "✅ Propuesta `<titulo>` aprobada y encolada para Facebook."

#### RECHAZAR

```sql
UPDATE piezas_contenido
SET estado = 'rechazada',
    metadata = metadata || '{"rechazo_motivo": "<motivo>", "rechazado_por": "emmanuel"}'
WHERE id = '<pieza_id>' AND deleted_at IS NULL;
```

Confirmar: "❌ Propuesta `<titulo>` rechazada."

#### PROGRAMAR

Parsear fecha natural (lunes 8am, mañana 10am, 2026-05-25 09:00) → convertir a TIMESTAMPTZ en zona `America/Mexico_City`.

```sql
UPDATE piezas_contenido SET estado = 'aprobada' WHERE id = '<pieza_id>';

INSERT INTO publicaciones (pieza_id, canal, estado, programada_para, gestionado_por)
VALUES ('<pieza_id>', 'facebook', 'programada', '<timestamp>', 'hermes');
```

Confirmar: "📅 Propuesta `<titulo>` programada para <fecha_legible>."

#### REGENERAR

```sql
-- Marcar como rechazada para que el generador la vuelva a tomar
UPDATE piezas_contenido
SET estado = 'rechazada',
    metadata = metadata || '{"regenerar": true}'
WHERE id = '<pieza_id>' AND deleted_at IS NULL;

-- Resetear la idea a 'nueva' para que el radar la reprocese
UPDATE ideas
SET estado = 'nueva'
WHERE id = (
  SELECT idea_id FROM piezas_contenido WHERE id = '<pieza_id>'
) AND estado = 'en_produccion';
```

Confirmar: "🔄 Propuesta encolada para regeneración en el próximo ciclo."

### 5. Reporte final

```
🗂️ Gate editorial completado
   Propuestas presentadas: N
   Aprobadas: A  |  Rechazadas: R  |  Programadas: P  |  Pendientes: X
```

## Restricciones

- **NUNCA** insertar en `publicaciones` sin haber recibido aprobación explícita de Emmanuel.
- **NUNCA** cambiar `estado='aprobada'` sin confirmación en Telegram.
- `estado` en `piezas_contenido` debe seguir el flujo: `borrador` → `aprobada` | `rechazada`.
- Solo el canal `facebook` en Fase 4. Instagram/TikTok en fases futuras.
- Filtrar siempre `WHERE deleted_at IS NULL`.
- Si Emmanuel no responde en el ciclo actual, las propuestas quedan en `borrador` para el siguiente ciclo.
