---
name: crea-publish-facebook
description: Procesa la cola de publicaciones programadas para Facebook (canal='facebook', estado='programada') y las publica vía Graph API.
version: 1.0.0
metadata:
  hermes:
    tags: [facebook, publicacion, cola, graph-api]
    category: crea
    requires_toolsets: [terminal]
---

# Skill: crea-publish-facebook

Eres el editor de CREA Contenidos ejecutando la distribución a Facebook de publicaciones aprobadas.

## Pre-condición (wakeAgent gate)

Este skill solo debe ejecutarse si hay publicaciones pendientes. El cron lo invoca cada 5 minutos
con un script no-agent que verifica la cola antes de despertar al LLM.

## Procedimiento

### 1. Reclamar lote de publicaciones pendientes

```sql
SELECT
  p.id,
  p.pieza_id,
  p.programada_para,
  pc.titulo,
  pc.cuerpo_final,
  pc.metadata
FROM publicaciones p
JOIN piezas_contenido pc ON pc.id = p.pieza_id
WHERE p.deleted_at IS NULL
  AND p.canal = 'facebook'
  AND p.estado = 'programada'
  AND p.programada_para <= NOW()
ORDER BY p.programada_para ASC
LIMIT 5;
```

Si no hay filas, loguea "Sin publicaciones pendientes para Facebook" y termina.

### 2. Para cada publicación

#### 2a. Construir el mensaje

- Texto principal: `pc.cuerpo_final` (si es muy largo, truncar a 63,000 chars — límite Graph API).
- Si `pc.metadata->>'ui_format' = 'post'`: usar el cuerpo tal cual.
- Si es `nota_web`: incluir título + primeras 280 chars del cuerpo + URL del artículo si existe.

#### 2b. Publicar vía Graph API

```bash
curl -s -X POST \
  "https://graph.facebook.com/${FB_API_VERSION}/${FB_PAGE_ID}/feed" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "<texto_escapado>",
    "access_token": "'"${FB_PAGE_ACCESS_TOKEN}"'"
  }'
```

Variables de entorno requeridas (ya en `.env`):
- `FB_PAGE_ACCESS_TOKEN`
- `FB_PAGE_ID`
- `FB_API_VERSION` (default: `v18.0`)

#### 2c. Interpretar respuesta

- **Éxito** → respuesta contiene `"id"`:
  ```sql
  UPDATE publicaciones
  SET estado = 'publicada',
      id_externo = '<fb_post_id>',
      url_publicacion = 'https://www.facebook.com/<fb_post_id>',
      published_at = NOW()
  WHERE id = '<publicacion_id>';
  ```

- **Error** → respuesta contiene `"error"`:
  ```sql
  UPDATE publicaciones
  SET estado = 'fallida',
      error_detalle = '<mensaje_error_de_fb>'
  WHERE id = '<publicacion_id>';
  ```
  Notificar a Telegram: "⚠️ Error publicando en Facebook: `<error>`"

### 3. Reporte final

```
📤 crea-publish-facebook completado
   Publicadas: N
   Fallidas: M
```

## Restricciones

- NUNCA cambies `estado = 'publicada'` sin haber recibido un `id` válido de la Graph API.
- NUNCA publiques piezas con `estado != 'aprobada'` en `piezas_contenido` — el gate editorial es previo.
- Si `FB_PAGE_ACCESS_TOKEN` está vacío, loguea "FB_PAGE_ACCESS_TOKEN no configurado — modo dry-run" y termina sin error.
- Filtra siempre `WHERE deleted_at IS NULL`.
