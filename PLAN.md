# Plan de Desarrollo — CREA Command Center v2

Actualizado con decisiones del usuario. Ref: [CREA_Brief_Desarrollador.md](file:///home/karoldelgado/web-dev/crea_web/docs/updates/CREA_Brief_Desarrollador.md)

## Decisiones Confirmadas

| Pregunta | Decisión |
|----------|----------|
| ¿Sitio público o services IA primero? | **Sitio público dinámico** (prioridad absoluta, §4) |
| ¿JSON temporal o PostgreSQL? | **PostgreSQL directo** (migrar los 17 endpoints una sola vez) |
| ¿API keys disponibles? | **No aún** — services se implementan como wiring listo para activar |
| ¿JWT real o base64? | **JWT real** con firma HMAC-SHA256 |

---

## Proposed Changes

---

### Fase 0 — Seguridad y .env (~30 min)

> [!CAUTION]
> El Brief (§11) dice textualmente: "NUNCA se hardcodean en el repositorio. Usar .env"

#### [MODIFY] [.gitignore](file:///home/karoldelgado/web-dev/crea_web/.gitignore)
- Agregar: `.env`, `data/users.json`, `*.log`, `data/*.json` (los datos locales no deben estar en git)

#### [NEW] `.env` (no se commitea, solo local/servidor)
- Copiar de `.env.example` + agregar:
  ```env
  JWT_SECRET=crea_secret_key_change_me_in_production
  PERPLEXITY_API_KEY=
  ANTHROPIC_API_KEY=
  OPENAI_API_KEY=
  ELEVENLABS_API_KEY=
  FB_PAGE_ACCESS_TOKEN=
  FB_PAGE_ID=
  ```

#### [MODIFY] [.env.example](file:///home/karoldelgado/web-dev/crea_web/.env.example)
- Agregar las variables de API keys como template (sin valores)

#### [MODIFY] [admin/js/auth.js](file:///home/karoldelgado/web-dev/crea_web/admin/js/auth.js)
- Eliminar `HARDCODED_USERS` — el backend PHP ya maneja auth con `data/users.json` + `password_verify()`
- Dejar solo el form handler que hace POST a `/api/auth/login.php`

---

### Fase 1 — Migración a PostgreSQL (~3-4 días)

La base fundacional. Todo el backend pasa de archivos JSON a PostgreSQL. El schema ya existe en [001_initial_schema.sql](file:///home/karoldelgado/web-dev/crea_web/migrations/001_initial_schema.sql) (544 líneas, con enums, triggers, foreign keys).

#### [NEW] `api/lib/database.php`
- Singleton PDO connection a PostgreSQL
- Lee credenciales de variables de entorno (`POSTGRES_HOST`, `POSTGRES_USER`, etc.)
- Funciones helper: `query()`, `fetchAll()`, `fetchOne()`, `insert()`, `update()`, `delete()`
- Manejo de errores y logging

#### [MODIFY] Todos los endpoints PHP (17 archivos)
Cada endpoint cambia de `file_get_contents('data/*.json')` a queries SQL via `database.php`:

| Endpoint | Tabla PostgreSQL | Cambios |
|----------|-----------------|---------|
| `api/auth/login.php` | `usuarios` | `SELECT` por email + JWT |
| `api/auth/logout.php` | — | Invalidar cookie |
| `api/articles/crud.php` | `piezas_contenido` + `ideas` | CRUD completo con JOINs |
| `api/clients/crud.php` | `patrocinadores` | CRUD con soft delete |
| `api/content-proposals/crud.php` | `piezas_contenido` | Filtros por status/format |
| `api/content-proposals/approve.php` | `piezas_contenido` | UPDATE status → 'aprobada' |
| `api/content-proposals/reject.php` | `piezas_contenido` | UPDATE status + motivo |
| `api/content-proposals/schedule.php` | `calendario_publicaciones` | INSERT/UPDATE fecha |
| `api/publications/crud.php` | `calendario_publicaciones` | Listado con JOINs |
| `api/publications/publish.php` | `calendario_publicaciones` | UPDATE status → 'publicada' |
| `api/radar/topics.php` | `ideas` | Filtros por fuente/sentiment |
| `api/newsletter/subscribe.php` | Nueva tabla `suscriptores` | INSERT email |
| `api/newsletter/list.php` | `suscriptores` | SELECT con paginación |
| `api/assets/crud.php` | `assets_multimedia` | CRUD de assets |
| `api/assets/generate.php` | `assets_multimedia` | Trigger generación |
| `api/comercial/metrics.php` | `contratos_comerciales` + JOINs | Agregaciones |
| `api/content/index.php` | `piezas_contenido` | GET/POST páginas estáticas |

#### [NEW] `api/lib/env.php`
- Carga `.env` al inicio (parseo manual, sin dependencia de composer)
- Disponibiliza variables vía `getenv()`

#### [MODIFY] [docker-compose.yml](file:///home/karoldelgado/web-dev/crea_web/docker-compose.yml)
- Agregar servicio `postgres` para desarrollo local (igual que en production)
- Volume para persistencia

#### [NEW] `migrations/002_seed_data.sql`
- Seed del usuario admin (Editor CREA con password hasheado)
- Categorías editoriales iniciales (local, cultura, economía, entretenimiento, deportes, opinión)
- Datos de prueba opcionales

---

### Fase 2 — JWT Real (~1 día)

#### [NEW] `api/lib/jwt.php`
- Implementación JWT pura en PHP (sin composer/dependencias externas):
  - `createJWT($payload, $secret)` — header.payload.signature con HMAC-SHA256
  - `validateJWT($token, $secret)` — verifica firma + expiración
  - `decodeJWT($token)` — extrae payload sin verificar (para debugging)
- Lee `JWT_SECRET` de `.env`

#### [MODIFY] [api/auth/login.php](file:///home/karoldelgado/web-dev/crea_web/api/auth/login.php)
- Reemplazar `base64_encode(json_encode(...))` por `createJWT()`
- Token firmado con HMAC-SHA256

#### [MODIFY] Todos los endpoints con `requireAuth()`
- Actualizar para usar `validateJWT()` — verifica firma + expiración
- Extraer usuario del payload JWT verificado

---

### Fase 3 — Sitio público dinámico (~2-3 días)

**Prioridad absoluta del Brief (§4, módulos 1-2)**. Conectar `apps/web/` al backend para que artículos aprobados se muestren automáticamente.

#### [NEW] `apps/web/assets/js/public-articles.js`
- Módulo JS para el sitio público:
  - `loadRecentArticles(limit)` — homepage con últimos artículos publicados
  - `loadArticlesByCategory(cat, limit)` — páginas de sección
  - `loadArticleById(id)` — página de nota individual
  - `renderArticleCard(article)` — template de card reutilizable
  - `renderArticleFull(article)` — template de nota completa con etiqueta IA

#### [MODIFY] [apps/web/index.html](file:///home/karoldelgado/web-dev/crea_web/apps/web/index.html)
- Reemplazar artículos hardcodeados por contenedores dinámicos
- Cargar últimos 6 artículos publicados vía API
- Mantener el diseño editorial existente

#### [MODIFY] [apps/web/pages/nota.html](file:///home/karoldelgado/web-dev/crea_web/apps/web/pages/nota.html)
- Template dinámico: `nota.html?id=xxx`
- Muestra título, autor, fecha, imagen, contenido HTML
- **Etiqueta IA visible** (100% Humano / Asistido / Generado) — requisito §9

#### [MODIFY] Páginas de sección (6 archivos)
- `seccion.html`, `cultura.html`, `economia.html`, `entretenimiento.html`, `deportes.html`, `opinion.html`
- Cada una carga artículos filtrados por su categoría

#### [MODIFY] [api/articles/crud.php](file:///home/karoldelgado/web-dev/crea_web/api/articles/crud.php)
- Agregar endpoint público `GET /api/articles/crud.php?public=true&estado=publicada`
- No requiere auth (lectura pública)
- Soportar filtros: `?categoria=local&limit=6&offset=0`

---

### Fase 4 — Social Listening wiring (~2-3 días)

Se implementa la lógica completa pero con **modo dry-run** (sin API key = logs sin llamadas reales).

#### [MODIFY] [services/social-listener.js](file:///home/karoldelgado/web-dev/crea_web/services/social-listener.js)
- Implementar `callPerplexityAPI()` — lee `PERPLEXITY_API_KEY` de env
  - Si no hay key → log "[DRY-RUN] Perplexity query skipped" y retornar mock data
  - Si hay key → POST a `https://api.perplexity.ai/chat/completions` con Sonar Pro
- Implementar RSS parser nativo (Node.js `https` + XML parsing) para los 3 feeds configurados
- Deduplicación por título similar (distancia de Levenshtein simplificada)
- **Escribir resultados en PostgreSQL** (tabla `ideas`) en vez de JSON

#### [NEW] `services/lib/db.js`
- Cliente PostgreSQL para Node.js (usa `pg` nativo o conexión directa)
- Compartido por todos los services

#### [NEW] `services/lib/api-clients.js`
- Wrappers para cada API de IA con dry-run automático:
  ```js
  async function callPerplexity(query) {
    const key = process.env.PERPLEXITY_API_KEY;
    if (!key) { log('[DRY-RUN] Perplexity skipped'); return mockData(); }
    // llamada real...
  }
  ```

---

### Fase 5 — Motor de contenidos IA wiring (~3-4 días)

#### [MODIFY] [services/content-generator.js](file:///home/karoldelgado/web-dev/crea_web/services/content-generator.js)
- Implementar `callClaudeAPI()` con dry-run:
  - Lee `ANTHROPIC_API_KEY` de env
  - Usa `system-prompt-crea.md` como system message
  - Si no hay key → genera propuesta mock con título placeholder
- Genera propuestas en los 6 formatos (nota, post, audio, video, meme, infografía)
- Escribe propuestas en PostgreSQL (tabla `piezas_contenido`)

---

### Fase 6 — Distribución a Facebook wiring (~2-3 días)

#### [MODIFY] [services/publication-hub.js](file:///home/karoldelgado/web-dev/crea_web/services/publication-hub.js)
- Implementar `publishToFacebook()` con dry-run:
  - Lee `FB_PAGE_ACCESS_TOKEN` y `FB_PAGE_ID` de env
  - POST a Graph API v18.0 (text + image)
  - Si no hay token → log "[DRY-RUN] Facebook publish skipped"
- Publicación en sitio web: ya funciona vía `api/articles/crud.php`
- Guardar resultado en PostgreSQL (`calendario_publicaciones`)

#### [MODIFY] Panel editorial
- Agregar botón "Publicar en Facebook" en `editorial-editor.html`
- Mostrar estado: programada / publicada / fallida

---

### Fase 7 — DALL-E + ElevenLabs wiring (~2-3 días)

#### [MODIFY] [services/image-generator.js](file:///home/karoldelgado/web-dev/crea_web/services/image-generator.js)
- `callDallEAPI()` con dry-run (lee `OPENAI_API_KEY`)
- Guarda imágenes en `apps/web/assets/img/generated/`
- Registra en PostgreSQL (`assets_multimedia`)

#### [MODIFY] [services/audio-generator.js](file:///home/karoldelgado/web-dev/crea_web/services/audio-generator.js)
- `callElevenLabsAPI()` con dry-run (lee `ELEVENLABS_API_KEY`)
- Guarda MP3 en `apps/web/assets/audio/`
- Botón "Generar audio" en editorial-editor

---

### Fase 8 — Reportes PDF para anunciantes (~4-5 días)

#### [NEW] `services/report-generator.js`
- Template HTML → PDF con Puppeteer
- Datos del reporte (§7 del Brief):
  - Nombre cliente + paquete contratado
  - Tabla de publicaciones del mes
  - Totales: views, interacciones
  - CPM (inversión / views × 1000)
  - Comparativo con mes anterior (% cambio)
  - Número de factura + mensaje de agradecimiento

#### [NEW] `api/reports/generate.php`
- Endpoint: `POST /api/reports/generate.php` con `client_id` + `month` + `year`
- Ejecuta `node services/report-generator.js` 
- Retorna URL del PDF

#### [MODIFY] [admin/clientes.html](file:///home/karoldelgado/web-dev/crea_web/admin/clientes.html)
- Botón "Generar reporte mensual" por cliente
- Selector de mes/año
- Link de descarga del PDF

---

### Fase 9 — Métricas + Calendario Drag & Drop (~3-5 días)

#### [MODIFY] [admin/dashboard.html](file:///home/karoldelgado/web-dev/crea_web/admin/dashboard.html)
- Sección de métricas: views totales, interacciones, seguidores
- Mini-gráficos con Canvas (sin dependencias externas)
- Datos desde PostgreSQL (`calendario_publicaciones` con views/interactions)

#### [MODIFY] [admin/calendario.html](file:///home/karoldelgado/web-dev/crea_web/admin/calendario.html)
- Drag & drop nativo (HTML5 Drag and Drop API)
- Mover publicaciones entre fechas
- PATCH a `/api/content-proposals/schedule.php` al soltar

---

## Cronograma

```
Semana 1:  Fase 0 (seguridad) + Fase 1 (PostgreSQL migration)
Semana 2:  Fase 1 (continúa) + Fase 2 (JWT) + Fase 3 (sitio dinámico)
Semana 3:  Fase 4 (social listening) + Fase 5 (motor IA)
Semana 4:  Fase 6 (distribución FB) + Fase 7 (DALL-E + ElevenLabs)
Semana 5:  Fase 8 (reportes PDF)
Semana 6:  Fase 9 (métricas + drag&drop) + QA general

→ Al finalizar: Emmanuel proporciona API keys → se activan en .env → pruebas reales
```

| Fase | Entregable Brief | Tiempo | Estado keys |
|------|-----------------|--------|-------------|
| **0** | Seguridad §11 | 30 min | No requiere |
| **1** | Infraestructura DB | 3-4 días | No requiere |
| **2** | Auth JWT §5 | 1 día | No requiere |
| **3** | Sitio funcional (1-2) | 2-3 días | No requiere |
| **4** | Social listening (3) | 2-3 días | Dry-run sin key |
| **5** | Motor IA (4) | 3-4 días | Dry-run sin key |
| **6** | Distribución FB (6) | 2-3 días | Dry-run sin key |
| **7** | DALL-E + Audio (8-9) | 2-3 días | Dry-run sin key |
| **8** | Reportes PDF (7) | 4-5 días | No requiere |
| **9** | Métricas + D&D | 3-5 días | No requiere |

**Total: ~5-6 semanas**

---

## Convenciones de Entrega (aplica a cada fase)

> [!IMPORTANT]
> Al finalizar **cada fase**:
> - ❌ No generar documentación `.md`
> - ✅ Respuesta breve en chat con lo que se aplicó
> - ✅ Commit al repositorio con mensaje conciso
> - ❌ No hacer `push` — el push lo hace Emmanuel

## Verification Plan

### Por fase
- **Fase 1**: `psql` queries para verificar tablas creadas, curl a endpoints para validar CRUD
- **Fase 2**: Login → verificar JWT firmado en cookie, intentar acceso con token expirado
- **Fase 3**: Navegación pública en `crea-contenidos.com` muestra artículos desde DB
- **Fases 4-7**: `node services/social-listener.js` ejecuta sin error, logs de dry-run correctos
- **Fase 8**: PDF generado con datos reales de un cliente de prueba
- **Fase 9**: Drag & drop en calendario actualiza fecha en DB

### Browser Testing
- Playwright para validar cada módulo admin después de la migración a PostgreSQL
- Verificar que el sidebar, formularios, y CRUD siguen funcionando
