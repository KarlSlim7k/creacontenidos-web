---
name: crea-content-generation
description: Para cada idea nueva en Postgres, genera 6 propuestas de contenido (nota, post, audio, video, meme, infografia) usando subagentes paralelos e inserta en piezas_contenido.
version: 1.1.0
metadata:
  hermes:
    tags: [content, propuestas, piezas_contenido, postgres, delegation, mcp]
    category: crea
    requires_toolsets: [terminal, delegation]
---

# Skill: crea-content-generation

Eres el editor de CREA Contenidos generando propuestas de contenido multiformato.

**IMPORTANTE**: Para todas las operaciones de base de datos usa exclusivamente la tool `mcp_postgres_query`.
NO uses psql, terminal ni npm para SQL.

## Procedimiento

### 1. Obtener ideas a procesar

```sql
SELECT i.id, i.titulo, i.descripcion, i.fuente::text AS fuente,
       i.categoria_id, i.metadata, i.created_at
FROM ideas i
WHERE i.deleted_at IS NULL
  AND i.estado IN ('nueva', 'aprobada')
  AND NOT EXISTS (
    SELECT 1 FROM piezas_contenido pc
    WHERE pc.deleted_at IS NULL
      AND pc.idea_id = i.id
      AND (pc.metadata->>'service') = 'content_generator'
  )
ORDER BY i.created_at DESC
LIMIT 3;
```

Si no hay filas, responde: "Sin ideas nuevas para generar contenido." y termina.

### 2. Para cada idea — generar 6 formatos en paralelo con delegate_task

Usa `delegate_task` para lanzar **6 subagentes simultáneos**, uno por formato.
Cada subagente recibe este prompt (sustituir los valores entre `<>`):

```
Eres el editor de CREA Contenidos (Perote, Veracruz). Genera contenido para el siguiente tema:

Título: <idea.titulo>
Descripción: <idea.descripcion o "Sin descripción">
Fuente: <idea.fuente>
Detectada: <idea.created_at>

Formato solicitado: <formato>
<instrucciones_de_formato>

Audiencia: población general de Perote, 25-44 años.
Tono: informativo, cercano, profesional. Sin clickbait. Sin juicios de valor.
Datos verificables únicamente.

Devuelve SOLO un objeto JSON, sin texto adicional:
{
  "title": "string",
  "body": "string",
  "image_prompt": "string|null",
  "ai_label": "asistido"
}
```

**Instrucciones por formato** (sustituir `<instrucciones_de_formato>`):
- `nota` → `Genera una nota informativa: título, subtítulo/bajada, cuerpo (300-500 palabras) y sección de datos útiles (dónde, cuándo, teléfonos).`
- `post` → `Genera un post breve para redes sociales (<280 chars), directo, con emoji moderado, listo para publicar.`
- `audio` → `Genera un guion conversacional para narrar en 60-90 segundos. Incluye indicaciones de pausas y énfasis.`
- `video` → `Genera un guion de video con escenas numeradas, tiempo estimado por escena, locución y sugerencias visuales.`
- `meme` → `Genera un prompt para meme ingenioso y respetuoso (nunca ofensivo). Incluye texto superior e inferior del meme.`
- `infografia` → `Genera estructura para infografía: título, 5-7 datos clave (bullets concisos) y fuentes/referencias.`

### 3. Obtener el ID de usuario del sistema

```sql
SELECT id FROM usuarios
WHERE deleted_at IS NULL
  AND (alias = 'sistema' OR email LIKE '%sistema%' OR rol = 'director_editorial')
ORDER BY created_at ASC
LIMIT 1;
```

### 4. Insertar cada propuesta en piezas_contenido

Para cada JSON devuelto por los subagentes:

**Generar slug único:**
- Base: título en minúsculas, sin acentos, espacios → `-`, caracteres especiales eliminados
- Verificar unicidad:
  ```sql
  SELECT 1 FROM piezas_contenido
  WHERE slug = '<slug>' AND deleted_at IS NULL LIMIT 1;
  ```
- Si existe, añadir `-2`, `-3`, etc. hasta que sea único.

**Mapeo UI format → DB enum** (obligatorio):
| UI format  | formato_contenido (DB) |
|------------|------------------------|
| nota       | nota_web               |
| post       | carrusel_instagram     |
| meme       | carrusel_instagram     |
| infografia | carrusel_instagram     |
| audio      | capsula_audio          |
| video      | guion_video            |

**INSERT:**
```sql
INSERT INTO piezas_contenido (
  idea_id, titulo, slug, categoria_id, formato, estado,
  autor_id, contenido_markdown, borrador_ia,
  modelo_ia_usado, prompt_usado, metadata
) VALUES (
  '<idea.id>',
  '<title>',
  '<slug_unico>',
  <idea.categoria_id o NULL>,
  '<formato_db>',
  'borrador',
  '<autor_id>',
  '<body>',
  '<body>',
  'kimi-k2.6',
  '<prompt_usado>',
  '{
    "is_proposal": true,
    "service": "content_generator",
    "ui_format": "<formato_ui>",
    "ai_label": "<ai_label>",
    "status": "draft",
    "image_prompt": <"string" o null>,
    "idea_id": "<idea.id>"
  }'
)
RETURNING id;
```

**Skip si ya existe propuesta para esta idea+formato:**
```sql
SELECT 1 FROM piezas_contenido
WHERE deleted_at IS NULL
  AND idea_id = '<idea.id>'
  AND (metadata->>'is_proposal') = 'true'
  AND (metadata->>'service') = 'content_generator'
  AND (metadata->>'ui_format') = '<formato_ui>'
LIMIT 1;
```

### 5. Marcar idea como en_produccion

```sql
UPDATE ideas
SET estado = 'en_produccion'
WHERE id = '<idea.id>' AND estado = 'nueva';
```

### 6. Reporte final

```
✅ crea-content-generation completado
   Ideas procesadas: N
   Propuestas creadas: M (6 por idea)
   Skipped (ya existían): K
```

Envía el reporte al canal de Telegram configurado. Incluye los títulos de las notas generadas para que Emmanuel sepa qué revisar.

## Restricciones

- NUNCA uses los valores UI (`nota`, `post`, etc.) directamente en la columna `formato` — usar el enum DB de la tabla.
- NUNCA insertes con `estado` distinto a `'borrador'`.
- NUNCA insertes en `publicaciones` — ese paso requiere aprobación humana.
- Filtra siempre `WHERE deleted_at IS NULL`.
- Si un subagente falla un formato, continúa con los demás — no abortes la idea completa.
- Slugs deben ser únicos entre filas no borradas.
