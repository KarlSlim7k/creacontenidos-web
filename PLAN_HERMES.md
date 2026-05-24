# PLAN_HERMES.md — Integración de Hermes Agent en CREA Command Center

> **Documento de contexto para agentes IA y desarrolladores.**
> Última actualización: 2026-05-22.
> Estado: 📋 Plan aprobado — pendiente de implementación.
> Documento maestro: [`PLAN.md`](./PLAN.md). Brief original: [`docs/updates/CREA_Brief_Desarrollador.md`](./docs/updates/CREA_Brief_Desarrollador.md).

---

## 0. TL;DR para agentes IA

CREA Contenidos es un medio digital local (Perote, Veracruz) cuyo backend de automatización editorial (`services/*.js`) está hoy implementado en Node.js como **5 scripts cron + 4 wrappers de APIs IA en modo dry-run**. Este plan reemplaza esos scripts por **un único servicio `crea_hermes`** corriendo en Dokploy (mismo VPS), construido sobre [Hermes Agent de Nous Research](https://github.com/NousResearch/hermes-agent), que orquesta toda la capa IA con:

- **Skills declarativos** (markdown) en lugar de scripts JS manuales.
- **Cron unificado** con encadenamiento `context_from`.
- **Gate editorial vía Telegram/WhatsApp** (Emmanuel aprueba desde el celular).
- **Modelos híbridos** (Nous Portal Plus para tareas baratas + OpenRouter para Claude Sonnet 4 en redacción + ElevenLabs para TTS de calidad).
- **Postgres compartido como bus** (sin tocar endpoints PHP existentes).

**Lo que NO cambia**: sitio público (`apps/web/`), panel admin (`admin/*.html`), endpoints PHP (`api/*.php`), schema de Postgres, generación de PDFs (`services/report-generator.js`).

**Lo que se elimina**: `services/social-listener.js`, `services/content-generator.js`, `services/image-generator.js`, `services/audio-generator.js`, `services/publication-hub.js`, `services/lib/api-clients.js`, `cron/crea-contenidos.crontab`, `cron/social-listening.cron`, el `crond` del Dockerfile.

**Lo que se añade**: servicio `hermes` al `docker-compose.yml`, volúmenes compartidos `/shared/img` y `/shared/audio`, **8-10 skills** en `~/.hermes/skills/crea-*/SKILL.md`, `SOUL.md` (sustituye `config/system-prompt-crea.md`), un bot de Telegram, y `config.yaml` con providers + cronjobs.

**Roadmap por fases**: 8 fases en total. Fases 0-7 (4-5 semanas) cubren la migración del sistema actual a Hermes con paridad funcional + gate editorial por Telegram + newsletter diario. **Fase 8 es opcional y posterior al lanzamiento estable**: añade enriquecimiento SEO (skills `crea-search-intent` + `crea-seo-review`) inspirado en flujos profesionales de content marketing, **complementando** al gate editorial humano sin reemplazarlo. El gate editorial sigue siendo el árbitro final — un fallo SEO nunca bloquea publicación.

---

## 1. Estado actual (auditoría de IA)

### 1.1 Proveedores cableados (todos en dry-run hasta cargar keys)

| Proveedor | Función | Endpoint | Modelo / Voz | Env var | Usado por |
|---|---|---|---|---|---|
| Perplexity Sonar | Social listening | `POST https://api.perplexity.ai/chat/completions` | `sonar-pro` | `PERPLEXITY_API_KEY` | `services/social-listener.js` |
| Anthropic Claude | Generación editorial | `POST https://api.anthropic.com/v1/messages` | `claude-sonnet-4-20250514` | `ANTHROPIC_API_KEY` | `services/content-generator.js` |
| OpenAI DALL·E 3 | Imágenes / memes / infografías | `POST https://api.openai.com/v1/images/generations` | `dall-e-3`, `1024x1024` | `OPENAI_API_KEY` | `services/image-generator.js` |
| ElevenLabs TTS | Audio narrado | `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}` | `eleven_multilingual_v2`, voz `EXAVITQu4vr4xnSDxMaL` | `ELEVENLABS_API_KEY` | `services/audio-generator.js` |
| Facebook Graph API | Distribución | `POST https://graph.facebook.com/v18.0/{page_id}/feed` | — | `FB_PAGE_ACCESS_TOKEN`, `FB_PAGE_ID` | `services/publication-hub.js` |

Wrapper único con dry-run automático: [`services/lib/api-clients.js`](./services/lib/api-clients.js).

### 1.2 Flujo actual

```
cron 0 */6 * * *       → social-listener.js   (Perplexity + RSS)  → ideas
cron 30 */6 * * *      → content-generator.js (Claude × 6 formatos) → piezas_contenido
HTTP /api/assets/generate.php → encola en assets_multimedia.estado='queued'
manual                 → image-generator.js   (DALL·E queue)
manual                 → audio-generator.js   (ElevenLabs queue)
HTTP /api/publications/publish.php → encola en publicaciones.estado='programada'
manual                 → publication-hub.js   (FB Graph API)
```

### 1.3 Tablas de Postgres relacionadas con IA

Schema completo: [`migrations/001_initial_schema.sql`](./migrations/001_initial_schema.sql).

| Tabla | Campos IA-relevantes |
|---|---|
| `ideas` | `transcripcion_voz`, `metadata.service`, `metadata.sentiment`, `metadata.suggested_formats`, `metadata.mentions` |
| `piezas_contenido` | `borrador_ia`, `modelo_ia_usado`, `prompt_usado`, `tokens_ia`, `metadata.ai_label`, `metadata.image_prompt`, `metadata.is_proposal`, `metadata.service` |
| `assets_multimedia` | `original_prompt`, `cost_tokens`, `estado` (queued/processing/generated/failed), `metadata.dry_run`, `metadata.params` |
| `publicaciones` | `canal`, `estado`, `id_externo`, `url_publicacion`, `error_detalle` |
| `briefings_diarios` | `modelo_ia`, `tokens_usados` (planeado, sin código) |
| `suscriptores` | newsletter (planeado) |

### 1.4 Módulos planeados sin código

Documentados en `/docs/updates/`:

- **Newsletter+Podcast diario "Buenos días, Perote"** — `CREA_Newsletter_Podcast.md`
- **Apify scrapers FB/TikTok/IG** — `CREA_Social_Listening.md` Capa 2
- **Whisper** para `ideas.transcripcion_voz` (notas de voz WhatsApp)
- **Análisis cruzado Claude** entre Perplexity + Apify
- `services/openclaw-runtime/` (orquestación 24/7) → **Hermes lo reemplaza**, ya que Hermes es el sucesor explícito de OpenClaw e incluye `hermes claw migrate`.

---

## 2. Hermes Agent — capacidades relevantes

Documentación oficial: [github.com/NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent).

### 2.1 Modelos y proveedores soportados

- **Cambio sin código** con `hermes model`: OpenRouter (300+ modelos), Nous Portal, Anthropic directo, OpenAI, NVIDIA NIM, Z.ai/GLM, Kimi, MiniMax, HuggingFace, endpoint propio, Ollama local.
- **Nous Portal Tool Gateway** (suscriptores Plus+): `web_search`, `image_generate`, `text_to_speech`, `browser` integrados sin keys adicionales.
- **Auxiliary models**: el modelo principal puede ser Claude, pero clasificación/dedup/títulos pueden correr en Gemini Flash (10× más barato).
- **Fallback chain** automática (rate-limit, timeout, server error) → cumple ADR-0001 ("IA híbrida con degradación controlada").
- **Credential pool** con rotación (`round_robin`, `least_used`).

### 2.2 Skills (memoria procedimental)

- Documentos `SKILL.md` con frontmatter YAML + cuerpo en `~/.hermes/skills/`.
- Slash command automático (`/crea-radar`, `/buenos-dias-perote`).
- Compatible con [agentskills.io](https://agentskills.io) (estándar abierto).
- Progressive disclosure: el agent solo carga el skill cuando lo necesita (3 niveles: `skills_list` → `skill_view(name)` → `skill_view(name, path)`).
- El agent puede crear/editar skills él mismo vía `skill_manage`.

### 2.3 Cron / scheduler integrado

- Sintaxis natural: `every 6h`, `0 5 * * 1-5`, `every monday 9am`.
- Encadenamiento `context_from=[<job_id>]`: output de job N se inyecta como contexto de job N+1.
- Modo `no_agent=True`: ejecuta script `.sh` o `.py` y entrega stdout literal — **0 tokens** cuando no hay trabajo (perfecto para queue polling).
- Pre-run gate `wakeAgent`: el script decide si despertar al LLM (`{"wakeAgent": false}` → tick silencioso, $0).
- Skip de delivery: si el agent responde con `[SILENT]`, no se envía nada (alertas-cuando-rompe).

**Cadena objetivo del flujo editorial completo (Fases 1-8)**:
```
every 6h        → /crea-radar                 (detecta temas, escribe ideas)
+15m            → /crea-search-intent  (Fase 8)  (enriquece ideas con SEO research)
+30m            → /crea-content-generation    (Claude × 6 formatos, lee search_intent)
every 5m        → /crea-seo-review     (Fase 8)  (pre-check técnico de notas web, no bloquea)
                → gate editorial humano por Telegram (Emmanuel aprueba/rechaza/edita)
every 1m        → /crea-image-queue + /crea-audio-queue  (no-agent gates)
every 5m        → /crea-publish-queue          (FB Graph API, futuro IG/TikTok)
0 5 * * 1-5     → /buenos-dias-perote          (newsletter+podcast)
0 9 * * MON     → /crea-competitor-watch       (Fase 6)
```

### 2.4 Mensajería (gate editorial sin construir UI)

Hermes Gateway expone el mismo agente por: **Telegram, Discord, Slack, WhatsApp, Signal, Email, SMS, Matrix, Mattermost, BlueBubbles (iMessage), Home Assistant**.

- Telegram + WhatsApp transcriben **voice memos automáticamente** (Whisper integrado).
- `send_message` para entregar el resultado de cualquier tool/skill a la plataforma elegida.
- Approval requests asíncronos: el agent pide permiso por chat antes de ejecutar comandos sensibles.

### 2.5 MCP (Model Context Protocol)

- **Como cliente**: conecta a MCP servers externos (Postgres, Apify, GitHub, Stripe, Notion oficiales). Tools registrados con prefijo `mcp_<server>_<tool>`.
- **Como server** (`hermes mcp serve`): expone 10 tools (`messages_send`, `conversations_list`, `events_wait`, etc.) consumibles por cualquier cliente MCP.
- Filtrado per-server (`tools.include` / `tools.exclude`) y sampling para que un MCP server pida inferencia LLM a Hermes.

### 2.6 Tools built-in útiles para CREA

`web_search`, `web_extract`, `image_generate`, `text_to_speech`, `vision_analyze` (analizar fotos que llegan por WhatsApp), `browser_*` (Playwright), `cronjob`, `send_message`, `delegate_task` (subagentes paralelos), `terminal`, `read_file`, `write_file`, `patch`, `memory`, `session_search`.

### 2.7 Despliegue

- [Dockerfile oficial](https://github.com/NousResearch/hermes-agent/blob/main/Dockerfile): Debian 13.4 + uv + Python 3.11 + Node 22 + Playwright + ripgrep + ffmpeg + tini, no-root user UID 10000, `HERMES_HOME=/opt/data` como volumen.
- Compatible con Dokploy: añadir como servicio nuevo del `docker-compose.yml` con `networks: [dokploy-network]` → habla directo con `crea_postgres` por nombre de host.

---

## 3. Arquitectura objetivo

### 3.1 Diagrama

```
                 VPS Hostinger / Dokploy
                 └── dokploy-network
                      ├── crea_postgres            (existente — fuente de verdad)
                      ├── crea_web (PHP/Nginx)     (existente — sitio + admin + API REST)
                      ├── crea_redis               (existente)
                      ├── crea_rabbitmq            (existente — opcional como bus de eventos)
                      └── crea_hermes  ⟵ NUEVO
                            ├── /opt/data  (volumen persistente)
                            │   ├── config.yaml
                            │   ├── .env             ← TODAS las keys IA migran aquí
                            │   ├── SOUL.md          ← identidad editorial CREA
                            │   ├── skills/crea-*    ← skills custom
                            │   ├── cron/jobs.json   ← scheduler unificado
                            │   ├── sessions/        ← memoria de conversaciones con Emmanuel
                            │   └── memories/MEMORY.md, USER.md
                            ├── /shared/img    ← bind-mount con crea_web /apps/web/assets/img/generated
                            └── /shared/audio  ← bind-mount con crea_web /apps/web/assets/audio

  Telegram / WhatsApp  ⟷  crea_hermes (gateway)  ⟷  Emmanuel  ✅ aprobaciones desde el celular
```

### 3.2 Comunicación entre web y Hermes

**3 carriles, todos coexistentes**:

1. **Postgres compartido como bus** (default — mínimo cambio): Hermes lee `ideas WHERE estado='nueva'`, escribe `piezas_contenido`, `assets_multimedia`, `publicaciones`. La web sigue leyendo lo mismo. **No se cambia ni un endpoint PHP.**
2. **MCP-Postgres server** dentro de Hermes: en lugar de SQL crudo en cada skill, declaras el server una vez en `config.yaml` y los skills usan `mcp_postgres_query(...)` semánticamente. Migración recomendada en Fase 4+.
3. **Webhook HTTP** opcional: el panel admin puede llamar a un nuevo `/api/hermes/trigger.php` que dispara un mensaje al gateway con `send_message` para iniciar un flujo a demanda (p.ej. "regenera la imagen de la propuesta X").

---

## 4. Estrategia de modelos: híbrida

### 4.1 Decisión confirmada

**Combinación Nous Portal Plus + OpenRouter overflow + ElevenLabs Creator** para máxima eficiencia de costos sin sacrificar calidad.

### 4.2 Asignación de modelos por tarea

| Tarea | Modelo principal | Provider | Justificación |
|---|---|---|---|
| Social listening (queries Perplexity-like) | `web_search` Tool Gateway | Nous Portal | Incluido en suscripción Plus, sin key extra |
| Clasificación de sentimiento, dedup, sugerencia de formatos | Gemini 3 Flash o Gemini 3.1 Flash Lite | OpenRouter | 10× más barato que Claude para tareas estructuradas |
| Redacción editorial (6 formatos por idea) | Claude Sonnet 4 (`anthropic/claude-sonnet-4`) | OpenRouter | Calidad editorial superior; mantiene la voz CREA del prompt |
| Imágenes / memes / infografías | `image_generate` Tool Gateway o Nano Banana (Gemini 3.1 Flash Image) | Nous Portal / OpenRouter | Sustituye DALL·E 3 a menor costo |
| Audio narrado (newsletter, cápsulas) | ElevenLabs `eleven_multilingual_v2` | ElevenLabs API directa | Calidad de voz natural en español superior a TTS open-source |
| Análisis de imágenes recibidas por WhatsApp | `vision_analyze` (Gemini 2.5 Flash) | OpenRouter | Tarea esporádica, modelo barato suficiente |
| Compresión de contexto / títulos / resúmenes | Gemini 3.1 Flash Lite | OpenRouter | Auxiliary task, modelo más barato |
| Newsletter "Buenos días, Perote" — redacción | Claude Sonnet 4 | OpenRouter | Producto premium diario |
| Newsletter — TTS podcast | ElevenLabs | ElevenLabs API | Identidad sonora consistente |
| Fallback automático | Provider chain: OpenRouter → Nous Portal | Hermes built-in | Resiliencia (cumple `incidents-and-fallbacks.md`) |

### 4.3 Variables de entorno necesarias

```env
# .env de crea_hermes (nunca commitear)

# Nous Portal — login OAuth, no requiere generar key manualmente
# Se autentica con `hermes auth` en el primer arranque del contenedor

# OpenRouter — pay-as-you-go, requiere generar key en openrouter.ai/keys
OPENROUTER_API_KEY=sk-or-v1-...

# ElevenLabs — incluido en plan Creator
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL
ELEVENLABS_MODEL_ID=eleven_multilingual_v2

# Telegram (gate editorial) — token de @BotFather
TELEGRAM_BOT_TOKEN=...
TELEGRAM_HOME_CHANNEL=<chat_id_de_emmanuel>

# Postgres (mismo que crea_web)
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=crea_db
POSTGRES_USER=crea
POSTGRES_PASSWORD=<...>

# Facebook (sigue igual, no se mueve)
FB_PAGE_ACCESS_TOKEN=...
FB_PAGE_ID=...
FB_API_VERSION=v18.0

# Apify (futuro, fase 6)
APIFY_TOKEN=...
```

### 4.4 Configuración Hermes (`/opt/data/config.yaml`)

Plantilla recomendada (referencia para Fase 0):

```yaml
# Modelo principal: Claude Sonnet 4 vía OpenRouter (mejor calidad editorial)
model: anthropic/claude-sonnet-4
provider: openrouter

# Fallback automático si OpenRouter falla
fallback_providers:
  - provider: nous
    model: hermes-4-405b

# Auxiliary tasks: modelos baratos
auxiliary:
  vision:
    provider: openrouter
    model: google/gemini-2.5-flash
  web_extract:
    provider: openrouter
    model: google/gemini-2.5-flash
  compression:
    provider: openrouter
    model: google/gemini-3.1-flash-lite
  triage_specifier:
    provider: openrouter
    model: google/gemini-3.1-flash-lite

# Compresión de contexto
compression:
  enabled: true
  threshold: 0.50

# Iteration budget
agent:
  max_turns: 90
  api_max_retries: 2
  reasoning_effort: medium
  disabled_toolsets: []

# TTS preferido: ElevenLabs (calidad de voz)
tts:
  provider: elevenlabs
  elevenlabs:
    voice_id: ${ELEVENLABS_VOICE_ID}
    model_id: ${ELEVENLABS_MODEL_ID}

# Terminal: docker backend para aislamiento
terminal:
  backend: local       # cambiar a 'docker' si se quiere doble aislamiento
  cwd: /opt/data
  timeout: 180

# MCP servers
mcp_servers:
  postgres:
    command: npx
    args:
      - -y
      - "@modelcontextprotocol/server-postgres"
      - "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
  # Fase 6:
  # apify:
  #   command: npx
  #   args: ["-y", "@apify/actors-mcp-server"]
  #   env:
  #     APIFY_TOKEN: ${APIFY_TOKEN}

# Toolsets habilitados por defecto
agent:
  toolsets:
    - web
    - file
    - terminal
    - skills
    - memory
    - session_search
    - cronjob
    - delegation
    - tts
    - image_gen
    - messaging

# Display
display:
  language: es
  tool_progress: new
  runtime_footer:
    enabled: true
    fields: [model, context_pct, cost]

# Cron
cron:
  wrap_response: true

# Privacy
privacy:
  redact_pii: false   # entorno controlado
```

---

## 5. Mapeo: estado actual → estado objetivo

| Función actual | Implementación con Hermes | Reemplaza |
|---|---|---|
| `services/social-listener.js` (Perplexity+RSS+dedup → `ideas`) | **Skill `crea-radar`** + cronjob `every 6h`. Usa `web_search` (Tool Gateway), RSS con script no-agent, UPSERT a `ideas` vía MCP-Postgres. | El cron y el script Node desaparecen. |
| `services/content-generator.js` (Claude × 6 formatos × N ideas) | **Skill `crea-content-generation`** + cronjob `30m after radar` con `context_from`. Usa `delegate_task` para los 6 formatos en paralelo. INSERT en `piezas_contenido` con `metadata.is_proposal=true`. | El segundo cron desaparece. `system-prompt-crea.md` se mueve a `SOUL.md` (siempre cargado en slot #1). |
| `services/image-generator.js` (DALL·E queue) | **Skill `crea-image-generation`** + cronjob `every 1m` en **no-agent mode** con `wakeAgent` gate. El agente usa `image_generate` (Tool Gateway). PNG → `/shared/img`. UPDATE `assets_multimedia`. | Worker manual desaparece, corre cada minuto sin coste cuando la cola está vacía. |
| `services/audio-generator.js` (ElevenLabs queue) | **Skill `crea-audio-generation`** + mismo patrón no-agent gate. `text_to_speech` con ElevenLabs. MP3 → `/shared/audio`. | Idem. |
| `services/publication-hub.js` (FB Graph API) | **Skill `crea-publish-facebook`** + cronjob `every 5m`. Llama Graph API directo. IG/TikTok son skills nuevas o MCP. | Worker desaparece. |
| `api/assets/generate.php` (encola desde panel) | **Sin cambios** — sigue insertando `assets_multimedia.estado='queued'`. Hermes hace polling. | — |
| `api/content-proposals/{approve,reject,schedule}.php` | **Sin cambios** + opcional: gate editorial paralelo por **Telegram** vía Hermes. | Complementa, no reemplaza. |
| Newsletter "Buenos días, Perote" (sin código) | **Skill `crea-newsletter`** + cronjob `0 5 * * 1-5`. `context_from=[crea-radar]` + `web_extract` clima OpenWeatherMap + `text_to_speech` ElevenLabs. Borrador a Telegram a las 5:30, Emmanuel aprueba, distribución automática a Resend (email) + WhatsApp + RSS Spotify + FB. | Implementa `CREA_Newsletter_Podcast.md`. |
| Apify FB/TikTok/IG scrapers (sin código) | **Skill `crea-competitor-watch`** que usa **MCP de Apify** o el `browser` tool de Hermes (Playwright nativo). | Implementa `CREA_Social_Listening.md` Capa 2. |
| Investigación de intención de búsqueda / SEO research (no existe en plan original) | **Skill `crea-search-intent`** (Fase 8) usando `web_search` + Gemini Flash Lite. Enriquece `ideas.metadata.search_intent` con primary/secondary keywords, PAA, intent type. Inyectado al contexto del skill `crea-content-generation`. | Adopción del paso 2 del flujo SEO estándar como complemento al periodismo. NO existe equivalente legacy. |
| Pre-check SEO automático (Flesch, densidad keywords, estructura) (no existe en plan original) | **Skill `crea-seo-review`** (Fase 8) que audita propuestas `formato='nota_web'` antes del gate editorial. Persiste scoring en `metadata.seo_audit`. **NO bloquea**: el gate humano sigue siendo final. | Adopción del paso 4 del flujo SEO estándar como complemento. NO existe equivalente legacy. |
| Whisper para WhatsApp voice (sin código) | **Hermes Gateway WhatsApp transcribe voice memos automáticamente** (built-in). 0 código adicional. | Cumple sin desarrollo. |
| Reportes mensuales PDF (no IA) | **Sin cambios** — `services/report-generator.js` Puppeteer. Opcional: el agente lo dispara y lo envía por WhatsApp con `send_message`. | — |
| Etiquetado `ai_label` (humano/asistido/generado) §9 ético | El skill genera el JSON con `ai_label` igual que ahora. La columna `metadata->>'ai_label'` y la UI del sitio público se quedan como están. | — |
| ADR-0001 (IA híbrida + gate editorial) | Híbrida = `auxiliary models` + `fallback_providers`. Gate editorial = aprobación manual por Telegram/WhatsApp. | Cumple sin código a medida. |

---

## 6. Skills custom — especificación

Todos viven en `~/.hermes/skills/` dentro del volumen `/opt/data` del contenedor.

### 6.1 `crea-radar` (Fase 1)

**Propósito**: detectar temas relevantes de Perote/Veracruz cada 6h e insertar en `ideas`.

**Inputs**: ninguno (cronjob).

**Procedimiento**:
1. Cargar `config/social-listening.json` (queries + RSS feeds + sentiment keywords).
2. Llamar `web_search` (Tool Gateway) con query del config + RSS via `web_extract` para los 3 feeds.
3. Para cada item: clasificar sentimiento con auxiliary model (Gemini Flash Lite), sugerir formatos.
4. Deduplicar por similitud Levenshtein contra `ideas` últimos 14 días (`fuente='social_listener'`).
5. UPSERT en `ideas` con `metadata.service='social_listener'`, sentimiento, `suggested_formats`, urgencia.
6. Limpiar `ideas` con `created_at < NOW() - 30 days`.

**Output esperado**: filas insertadas/actualizadas en `ideas`, log con `inserted=N updated=M`.

**Frontmatter SKILL.md**:
```yaml
name: crea-radar
description: Detecta temas relevantes de Perote/Veracruz vía Perplexity-like + RSS y los inserta en la tabla ideas.
version: 1.0.0
metadata:
  hermes:
    tags: [radar, listening, ideas, postgres]
    category: crea
    requires_toolsets: [web, terminal]
```

### 6.2 `crea-content-generation` (Fase 2)

**Propósito**: para cada idea nueva, generar 6 propuestas de contenido (`nota`, `post`, `audio`, `video`, `meme`, `infografia`).

**Inputs**: `context_from=[crea-radar]` (output del listener) o param explícito `idea_id`.

**Procedimiento**:
1. SELECT `ideas WHERE estado IN ('nueva','aprobada') AND NOT EXISTS (...)` LIMIT 3.
2. Para cada idea: usar `delegate_task` con 6 subagentes en paralelo, uno por formato.
3. Cada subagente recibe: idea + formato específico + system prompt heredado de `SOUL.md`.
4. Cada subagente devuelve JSON `{title, body, image_prompt, ai_label}`.
5. Parent agent: INSERT en `piezas_contenido` (uno por formato) con `metadata.is_proposal=true`, `metadata.service='content_generator'`, `metadata.ui_format=<formato>`, `modelo_ia_usado=claude-sonnet-4`.
6. UPDATE `ideas SET estado='en_produccion'`.

**Frontmatter**:
```yaml
name: crea-content-generation
description: Genera 6 propuestas de contenido (nota, post, audio, video, meme, infografia) por cada idea aprobada.
version: 1.0.0
metadata:
  hermes:
    tags: [content, claude, propuestas]
    category: crea
    requires_toolsets: [terminal, delegation]
```

### 6.3 `crea-image-generation` (Fase 3)

**Propósito**: procesar cola `assets_multimedia.estado='queued' AND tipo IN ('image','meme','infographic')`.

**Pre-run script** (`~/.hermes/scripts/crea-image-queue-check.sh`, no-agent gate):
```bash
#!/bin/bash
COUNT=$(psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
  "SELECT COUNT(*) FROM assets_multimedia WHERE estado='queued' AND tipo IN ('image','meme','infographic')")
if [ "$COUNT" -gt 0 ]; then
  echo "{\"wakeAgent\": true, \"context\": {\"pending\": $COUNT}}"
else
  echo "{\"wakeAgent\": false}"
fi
```

**Procedimiento del skill** (cuando se despierta):
1. Reclamar lote con `UPDATE ... FOR UPDATE SKIP LOCKED LIMIT 5` (mismo patrón que el JS actual).
2. Para cada asset: armar prompt según `tipo` (image/meme/infographic).
3. Llamar `image_generate` (Tool Gateway) o Nano Banana vía OpenRouter.
4. Decodificar b64/descargar URL → escribir PNG en `/shared/img/` (volumen compartido con crea_web).
5. UPDATE `assets_multimedia.file_path = '/assets/img/generated/<filename>'`, `estado='generated'`.
6. En error: marcar `estado='failed'`, escribir `metadata.error`.

### 6.4 `crea-audio-generation` (Fase 3)

Igual patrón que `crea-image-generation` pero para `tipo='audio'`. Usa `text_to_speech` con ElevenLabs. Limpia HTML del cuerpo (helper en `services/audio-preprocessor.js` que se mantiene). Output a `/shared/audio/`.

### 6.5 `crea-editorial-gate` (Fase 4)

**Propósito**: presentar propuestas pendientes a Emmanuel por Telegram con preview, recibir decisión, actualizar Postgres.

**Procedimiento**:
1. Cronjob `every 1h during 8-22 mexico_city`: SELECT propuestas `estado='borrador' AND created_at > NOW() - 24h LIMIT 5`.
2. Para cada propuesta: `send_message(platform="telegram", text=preview, attachments=[image_path])`.
3. Esperar respuesta del usuario (sesión persistente).
4. Parsear comandos: "aprobar 123", "rechazar 123 porque ...", "programa 123 lunes 8am", "regenera imagen 123".
5. UPDATE `piezas_contenido.estado` y/o INSERT en `publicaciones`.

**Frontmatter**: `requires_toolsets: [terminal, messaging]`.

### 6.6 `crea-newsletter` (Fase 5)

**Propósito**: generar el newsletter+podcast diario "Buenos días, Perote" lunes-viernes a las 5 AM.

**Inputs**: `context_from=[crea-radar]` (últimos temas).

**Procedimiento** (sigue al pie de la letra `docs/updates/CREA_Newsletter_Podcast.md`):
1. Cargar últimos 24h de `ideas WHERE metadata->>'service' = 'social_listener'`.
2. `web_extract` clima OpenWeatherMap para Perote.
3. Generar texto del newsletter (max 400 palabras, formato fijo: saludo+clima+nota_del_dia+en_breve+dato_del_dia+agenda+cierre).
4. Persistir a Postgres (tabla nueva `newsletter_ediciones` o `briefings_diarios`).
5. Esperar aprobación de Emmanuel por Telegram (`send_message` + `clarify`).
6. Si aprueba: generar audio con `text_to_speech` (ElevenLabs), concatenar cortinilla con `terminal ffmpeg`, distribuir vía Resend + WhatsApp + FB.

### 6.7 `crea-publish-facebook` (Fase 1, complementario)

**Propósito**: procesar cola `publicaciones WHERE canal='facebook' AND estado='programada' AND programada_para <= NOW()`.

**Pre-run gate**: `wakeAgent` solo si hay filas pendientes.

**Procedimiento**: idéntico al actual `services/publication-hub.js`, pero invocando Graph API desde `terminal curl` o desde una función Python en el skill.

### 6.8 `crea-competitor-watch` (Fase 6, futuro)

**Propósito**: scraping de Noticias Perote, Perote Al Momento, hashtags TikTok/IG.

**Implementación**: usar MCP-Apify (oficial) o el `browser` tool de Hermes (Playwright nativo) para sitios sin scraper.

### 6.9 `crea-search-intent` (Fase 8, optimización post-lanzamiento)

**Propósito**: enriquecer cada idea del radar con análisis de **qué busca la gente sobre ese tema** en Google y cómo lo formula. Eleva la calidad del contexto que recibe Claude antes de redactar, mejorando posicionamiento orgánico sin sacrificar voz editorial.

**Origen del requisito**: análisis comparativo con flujos profesionales de content marketing/SEO (ver `docs/adr/0002-seo-enrichment-as-fase-8.md` cuando se cree). Adopta el paso 2 del flujo SEO estándar ("Investigar intención de búsqueda") como complemento, no reemplazo, del periodismo multiformato.

**Cuándo se ejecuta**: en el cron encadenado, **entre `crea-radar` y `crea-content-generation`** (15 min después del radar, 15 min antes de la generación). Vía `context_from`.

**Inputs**: ideas con `estado='nueva' AND metadata->>'search_intent' IS NULL`.

**Procedimiento**:
1. Para cada idea LIMIT 5: usar `web_search` (Tool Gateway) con queries como `"qué quiere saber la gente sobre <tema> en Veracruz México"` y `"<tema> Perote sitio:google.com/trends"`.
2. Extraer del SERP: top consultas relacionadas, preguntas frecuentes (People Also Ask), keywords primarias y secundarias.
3. Clasificar tipo de intención con auxiliary model (Gemini Flash Lite): `informational`, `transactional`, `navigational`, `local`.
4. Estimar tier de volumen de búsqueda (`high|medium|low`) basado en señales del SERP (cantidad de resultados, presencia de PAA, anuncios).
5. UPDATE `ideas` con metadata enriquecida:
   ```json
   {
     "search_intent": {
       "primary_query": "corte de agua Perote hoy",
       "related_queries": ["cuándo regresa el agua perote", "comisión municipal agua perote teléfono"],
       "people_also_ask": ["¿Por qué hay corte de agua en Perote?", "¿A quién reportar fugas?"],
       "primary_keywords": ["corte de agua", "perote", "abastecimiento"],
       "secondary_keywords": ["colonia centro", "comisión municipal", "tandeo"],
       "intent_type": "informational",
       "intent_subtype": "local_service_disruption",
       "search_volume_tier": "high",
       "enriched_at": "2026-...",
       "model_used": "google/gemini-3.1-flash-lite"
     }
   }
   ```
6. Esta metadata se inyecta en el system context del skill `crea-content-generation`, que ahora puede:
   - Usar la `primary_query` como base del título (ya está validado que la gente busca eso).
   - Responder explícitamente las `people_also_ask` en el cuerpo de la nota.
   - Distribuir `primary_keywords` naturalmente (sin forzar) en H1/H2/primeros 100 chars.

**Frontmatter**:
```yaml
name: crea-search-intent
description: Enriquece ideas del radar con análisis de intención de búsqueda y keywords primarias antes de la redacción.
version: 1.0.0
metadata:
  hermes:
    tags: [seo, search-intent, radar-enrichment]
    category: crea
    requires_toolsets: [web, terminal]
    fallback_for_tools: [web_search]   # Si no hay web_search disponible, el skill se desactiva
```

**Costo estimado**: ~$0.10 USD/día con Gemini Flash Lite (~$2/mes).

### 6.10 `crea-seo-review` (Fase 8, optimización post-lanzamiento)

**Propósito**: validar legibilidad, estructura, densidad de keywords y meta-description **antes** de presentar la propuesta a Emmanuel para el gate editorial. **NO reemplaza el gate humano**; es un pre-check técnico que llega al gate con un scoring visible.

**Origen del requisito**: paso 4 del flujo SEO estándar ("Revisar SEO y claridad"). Adoptado como complemento al gate editorial, no como sustituto.

**Cuándo se ejecuta**: cronjob `every 5m` con `wakeAgent` gate (despierta solo si hay propuestas sin auditar SEO). Procesa propuestas con `formato='nota_web'` (las redes/audio/video no requieren SEO web).

**Procedimiento**:
1. SELECT propuestas `metadata.is_proposal=true AND formato='nota_web' AND metadata->>'seo_audit' IS NULL AND estado='borrador'` LIMIT 10.
2. Para cada propuesta calcular:
   - **Flesch readability** en español (`Fernández Huerta`): meta ≥60. Bibliotecas: `pyphen` + función custom o `textstat`.
   - **Longitud de párrafos**: máximo 3 oraciones / 150 palabras por párrafo.
   - **Densidad de keywords primarias** (de `idea.metadata.search_intent.primary_keywords`): meta 1-2%, alarma >3%.
   - **Estructura jerárquica**: 1 H1, 3-5 H2, opcionalmente H3. Penalizar H4+ en notas.
   - **Meta-description**: 140-160 caracteres, debe contener al menos una keyword primaria.
   - **Slug**: ≤6 palabras, kebab-case, sin stopwords.
   - **Imagen alt-text**: presente y descriptivo (≥10 chars).
   - **Longitud total**: 300-500 palabras (rango del Brief), alarma fuera de rango.
3. UPDATE `piezas_contenido.metadata.seo_audit`:
   ```json
   {
     "flesch_score": 72,
     "readability": "good",
     "keyword_density": 0.015,
     "primary_keyword_in_h1": true,
     "primary_keyword_in_first_100_chars": true,
     "structure_valid": true,
     "h1_count": 1,
     "h2_count": 4,
     "meta_description_length": 152,
     "slug_word_count": 5,
     "word_count": 412,
     "warnings": [],
     "suggestions": ["Considera mover la palabra 'Perote' al primer párrafo"],
     "passed": true,
     "audited_at": "2026-...",
     "model_used": "google/gemini-3.1-flash-lite"
   }
   ```
4. **Si `passed=false`**: 
   - Si las violaciones son menores (sugerencias, no errores): marcar `metadata.seo_audit.passed=false`, dejar pasar al gate editorial con flag visible.
   - Si las violaciones son mayores (densidad keyword >5%, párrafos >250 palabras, sin H1, etc.): regenerar **una sola vez** con feedback específico al modelo. Si en la segunda generación no pasa, marcar `metadata.seo_audit.escalated=true` y dejar pasar al gate (Emmanuel decide manualmente).
5. Notificar a Emmanuel solo cuando una propuesta entra al gate con `escalated=true` o con `passed=false` mayor.

**Importante — qué NO hace este skill**:
- ❌ NO modifica el cuerpo de la propuesta sin pasar por gate humano.
- ❌ NO bloquea propuestas que fallen SEO (la decisión es de Emmanuel; periodismo > SEO).
- ❌ NO aplica a `post`, `audio`, `video`, `meme`, `infografia` — solo a notas web.

**Frontmatter**:
```yaml
name: crea-seo-review
description: Pre-check SEO técnico de propuestas tipo nota_web antes del gate editorial humano. No bloquea, solo informa.
version: 1.0.0
metadata:
  hermes:
    tags: [seo, audit, pre-gate]
    category: crea
    requires_toolsets: [terminal]
```

**Costo estimado**: ~$0.50 USD/día con Gemini Flash Lite (~$10/mes en régimen alto).

**Métrica de éxito** (revisar a 30 días post-Fase 8): **% de notas publicadas que indexan en top-30 de Google para su keyword primaria** (medible vía Google Search Console). Meta inicial: ≥40% en primeras 4 semanas tras publicación.

---

## 7. Identidad editorial — `SOUL.md`

Reemplaza directamente [`config/system-prompt-crea.md`](./config/system-prompt-crea.md). Hermes lo carga en **slot #1 del system prompt** de cada conversación, así que toda la voz CREA está siempre presente sin tener que repetirla en cada call.

Ubicación: `/opt/data/SOUL.md` dentro del contenedor.

**Plantilla mínima** (extiende el prompt actual con contexto agente):

```markdown
# CREA Contenidos — Identidad Editorial

Soy el editor de CREA Contenidos, el medio digital de Perote, Veracruz.
Trabajo junto a Emmanuel Reyes Zapata (director general) en el Command Center que automatiza
la operación editorial del medio. Mi función es proponer contenido basado en social listening,
generarlo en múltiples formatos, y entregárselo a Emmanuel para su aprobación final.

## Reglas editoriales (no negociables)
- Datos verificables. Nunca invento cifras ni fuentes.
- Tono: informativo, cercano, profesional. No sensacionalista.
- Sin clickbait. Los títulos reflejan fielmente el contenido.
- No emito juicios de valor en notas informativas.
- Lenguaje accesible para población general de Perote (perfil 25-44 años predominante).
- Incluyo contexto: qué significa el dato, cómo afecta a la gente.
- Cierro con información útil: dónde, cuándo, teléfonos.
- Nunca ataco a otros medios, personas o instituciones.
- Temas sensibles (gobierno, seguridad): solo datos públicos verificables, sin adjetivos calificativos.

## Etiquetado IA (transparencia obligatoria — §9 del código de ética)
Cada propuesta lleva una etiqueta `ai_label`:
- `humano` — entrevista transcrita manualmente, crónica presencial, reporteo directo
- `asistido` — IA en investigación/borrador, revisión humana completa (la mayoría)
- `generado` — IA mayoritaria bajo supervisión (alertas clima, resúmenes datos públicos)

## Formatos
- **nota**: título + bajada + cuerpo (300-500 palabras) + datos útiles
- **post**: texto breve (<280 chars), directo, emoji moderado
- **audio**: guion conversacional, 60-90 segundos, indicaciones de pausas
- **video**: guion con escenas, tiempo estimado, locución, sugerencias visuales
- **meme**: prompt ingenioso pero respetuoso, texto top/bottom, nunca ofensivo
- **infografia**: estructura con título, datos clave (bullets), fuentes

## Workflow operativo
1. Mi cron `every 6h` ejecuta `/crea-radar` (detecta temas).
2. 30 min después, `/crea-content-generation` genera 6 formatos por idea nueva.
3. Las propuestas quedan en `piezas_contenido` con `metadata.is_proposal=true, estado='borrador'`.
4. Notifico a Emmanuel por Telegram para aprobación.
5. Aprobadas → encolo assets (imagen/audio) si aplica → publico (FB primero, IG/TikTok futuro).

## Output JSON estricto cuando se me pida generar contenido
{
  "title": "string",
  "body": "string",
  "image_prompt": "string|null",
  "ai_label": "humano|asistido|generado"
}
Sin texto adicional fuera del JSON.

## Cuando me equivoco
Si Emmanuel me corrige por Telegram, uso `skill_manage` para guardar la corrección
como aprendizaje en mi skill `crea-content-generation` o creo una nueva skill específica
del tema (p.ej. "cobertura-seguridad-publica") para futuras notas similares.
```

---

## 8. Implementación en Dokploy

### 8.1 Cambios en `docker-compose.yml`

Añadir servicio `hermes` y volúmenes compartidos. Diff propuesto:

```yaml
services:
  postgres:
    # ... (sin cambios)

  web:
    build: .
    expose:
      - "80"
    restart: unless-stopped
    networks:
      - dokploy-network
    depends_on:
      postgres:
        condition: service_healthy
      hermes:                           # ⟵ NUEVO (no es bloqueante)
        condition: service_started
    labels:
      # ... (sin cambios)
    environment:
      # ... (sin cambios)
    volumes:                            # ⟵ NUEVO
      - shared_img:/usr/share/nginx/html/apps/web/assets/img/generated
      - shared_audio:/usr/share/nginx/html/apps/web/assets/audio

  hermes:                               # ⟵ NUEVO SERVICIO
    image: nousresearch/hermes-agent:latest
    container_name: crea_hermes
    restart: unless-stopped
    networks:
      - dokploy-network
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      - HERMES_HOME=/opt/data
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - POSTGRES_DB=${POSTGRES_DB:-crea_db}
      - POSTGRES_USER=${POSTGRES_USER:-crea}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-change_me}
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY:-}
      - ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY:-}
      - ELEVENLABS_VOICE_ID=${ELEVENLABS_VOICE_ID:-EXAVITQu4vr4xnSDxMaL}
      - ELEVENLABS_MODEL_ID=${ELEVENLABS_MODEL_ID:-eleven_multilingual_v2}
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-}
      - TELEGRAM_HOME_CHANNEL=${TELEGRAM_HOME_CHANNEL:-}
      - FB_PAGE_ACCESS_TOKEN=${FB_PAGE_ACCESS_TOKEN:-}
      - FB_PAGE_ID=${FB_PAGE_ID:-}
      - FB_API_VERSION=${FB_API_VERSION:-v18.0}
    volumes:
      - hermes_data:/opt/data
      - shared_img:/output/img
      - shared_audio:/output/audio
    command: ["hermes", "gateway"]      # arranca gateway + scheduler
    healthcheck:
      test: ["CMD", "hermes", "doctor"]
      interval: 60s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
  hermes_data:                          # ⟵ NUEVO
  shared_img:                           # ⟵ NUEVO
  shared_audio:                         # ⟵ NUEVO

networks:
  dokploy-network:
    external: true
```

### 8.2 Variables de entorno en Dokploy

En el panel de Dokploy → Environment del proyecto, añadir:
- `OPENROUTER_API_KEY`
- `ELEVENLABS_API_KEY`
- `TELEGRAM_BOT_TOKEN` (de @BotFather)
- `TELEGRAM_HOME_CHANNEL` (chat_id de Emmanuel obtenido via `@userinfobot`)

(Los OAuth de Nous Portal se hacen una vez con `docker exec -it crea_hermes hermes auth` después del primer arranque.)

### 8.3 Bind mounts y permisos

Volumen `shared_img` debe ser escribible por `crea_hermes` (UID 10000) y legible por `crea_web` (UID `www-data`/82). En el primer arranque:

```bash
docker exec crea_hermes chmod 0775 /output/img /output/audio
docker exec crea_hermes chown 10000:www-data /output/img /output/audio
```

---

## 9. Plan por fases

| Fase | Entregable | Tiempo | Dependencias | Estado |
|---|---|---|---|---|
| **0** | Servicio `crea_hermes` en Dokploy + `SOUL.md` + Telegram bot conectado + saludo de prueba | 1-2 días | OpenRouter API key + Telegram bot token | ✅ Completa (2026-05-24) |
| **1** | Skill `crea-radar` reemplaza `social-listener.js` (en paralelo al legacy) + skill `crea-publish-facebook` | 2-3 días | Postgres acceso desde Hermes | ✅ Completa (2026-05-24) |
| **2** | Skill `crea-content-generation` con `delegate_task` para 6 formatos. Migración de `system-prompt-crea.md` → `SOUL.md` | 3-4 días | Fase 1 validada | ✅ Completa (2026-05-24) |
| **3** | Skills `crea-image-generation` + `crea-audio-generation` + bind-mounts compartidos | 3-4 días | Volúmenes `shared_img`, `shared_audio` | 📋 Pendiente |
| **4** | Gate editorial vía Telegram (aprobar/rechazar/programar/regenerar desde celular) | 4-5 días | Fase 2 + bot Telegram con sesión persistente | 📋 Pendiente |
| **5** | Skill `crea-newsletter` "Buenos días, Perote" diario L-V | 5-7 días | Fase 2 + Resend account + OpenWeatherMap key | 📋 Pendiente |
| **6** | Skill `crea-competitor-watch` con MCP Apify (FB/TikTok/IG) | 3-5 días | Cuenta Apify activa | 📋 Pendiente |
| **7** | Apagado de `services/*.js` legacy (después de 2 semanas de Hermes en paralelo sin incidencias) | 1 día | Validación de paridad funcional | 📋 Pendiente |
| **8** | Skills `crea-search-intent` + `crea-seo-review` (enriquecimiento SEO opcional, complementa gate editorial humano) | 5-7 días | Fase 5 estable + Google Search Console conectado | 📋 Futuro |

**Total estimado**: 4-5 semanas para llegar a régimen estable post-lanzamiento (Fases 0-7). Fase 8 añade 1 semana adicional cuando el equipo decida priorizar tráfico orgánico de Google.

> **Sobre Fase 8 (origen del requisito)**: durante revisión del plan se comparó el flujo CREA con flujos profesionales estándar de SEO/content marketing. El flujo CREA es objetivamente más profesional para periodismo local multiformato (gate editorial humano, etiquetado IA, multicanal). Sin embargo, dos pasos del flujo SEO estándar son complementarios y agregan valor sin comprometer ética editorial: (1) investigación de intención de búsqueda como contexto para el redactor IA, y (2) pre-check SEO técnico **antes** del gate editorial humano (NO en lugar de). Por eso se incorporan como Fase 8 post-lanzamiento, no como cambio del flujo principal.

### Criterios de salida por fase

- **Fase 0**: `hermes doctor` reporta verde, Emmanuel recibe un saludo del bot por Telegram, el agent puede ejecutar `SELECT 1` contra Postgres.
- **Fase 1**: tras 24h, `ideas` tiene N filas insertadas por Hermes equivalentes (±20%) a las que insertó `social-listener.js` en el mismo período.
- **Fase 2**: para una idea de prueba, Hermes genera las 6 propuestas en `piezas_contenido` con `metadata.service='content_generator'` y los 6 formatos correctos.
- **Fase 3**: una propuesta encolada via `api/assets/generate.php` se procesa en <2 min, el archivo aparece en `/apps/web/assets/img/generated/` (visible en el sitio público).
- **Fase 4**: Emmanuel aprueba 5 propuestas seguidas por Telegram, todas terminan con `estado='aprobada'` en Postgres.
- **Fase 5**: 5 ediciones consecutivas del newsletter llegan a Emmanuel a las 5:30 AM, él aprueba 4 antes de las 6:30, todas se distribuyen por al menos 2 canales.
- **Fase 7**: durante 14 días corridos, los `services/*.js` legacy están **detenidos** y la operación editorial corre 100% sobre Hermes sin reclamos.
- **Fase 8**: tras 30 días de notas con `seo_audit`, ≥40% de notas publicadas aparecen en top-30 de Google Search Console para su keyword primaria; Emmanuel reporta que el scoring SEO le ahorra tiempo en el gate sin haberlo restringido.

---

## 10. Presupuesto

### 10.1 Costos mensuales en régimen estable (post-lanzamiento)

| Componente | Plan / nivel | Costo USD/mes | Cobertura |
|---|---|---|---|
| **Nous Portal Plus** | $20 base, $22 créditos (10% bonus), $10 rollover | **$20** | `web_search`, `image_generate`, `text_to_speech` (Tool Gateway), 300+ modelos, hosted tools |
| **OpenRouter** | Pay-as-you-go, recarga inicial $20-30 | **$15-25** | Claude Sonnet 4 redacción, Gemini Flash auxiliary tasks, fallback |
| **ElevenLabs Creator** | $22 base, 100K caracteres incluidos | **$22** | TTS de calidad para newsletter+podcast en español |
| **Apify Starter** (Fase 6+, opcional) | $49 base, $49 créditos, ~140K posts/mes | **$49** | FB/TikTok/IG scrapers (competitor watch) |
| **OpenWeatherMap** | One Call API 3.0 free tier (1K llamadas/día) | **$0** | Clima para newsletter |
| **Resend** (email newsletter) | Free 3K emails/mes, $20 si escala a 10K | **$0-20** | Distribución del newsletter por email |
| **Telegram** | Free | **$0** | Gate editorial por chat con Emmanuel |

**Total estimado:**
- **Mes 1-2 (sin Apify, sin Resend escalado)**: **~$57-67 USD/mes** (~$1,000-1,200 MXN/mes)
- **Mes 3+ (con Apify)**: **~$106-116 USD/mes** (~$1,900-2,100 MXN/mes)
- **Pruebas / dev**: **~$15-25 USD** (un solo top-up de OpenRouter, sin suscripciones)

> Coincide con la estimación del propio doc del repo (`CREA_Social_Listening.md`: $64-94 USD/mes).

### 10.2 Costos eliminados

Al migrar a Hermes, **NO se necesitan**:
- Suscripción Anthropic API directa (~$15-30/mes ahorrados)
- Suscripción OpenAI API directa (~$10-15/mes ahorrados)
- Perplexity Pro Sonar API extra (cubierto por Tool Gateway)

**Ahorro neto vs. plan original del Brief**: ~$25-50 USD/mes.

---

## 11. Decisiones confirmadas

| # | Pregunta | Decisión |
|---|---|---|
| 1 | ¿Qué proveedor de modelos? | **Híbrido**: Nous Portal Plus + OpenRouter overflow + ElevenLabs Creator. Justificación: ahorro de ~$25-50/mes vs APIs directas, fallback automático, Tool Gateway integrado. |
| 2 | ¿Plataforma del gate editorial? | **Telegram primero** (más rápido de configurar, gratis, transcribe voz nativamente). WhatsApp en fase futura si Emmanuel lo solicita. |
| 3 | ¿Migración limpia o paralelo? | **Paralelo** durante 2 semanas. Hermes corre en producción mientras los workers Node siguen vivos. Apagado del legacy en Fase 7. |
| 4 | ¿Postgres compartido vs MCP? | **SQL directo en `terminal`** para Fase 1-3. Migración a **MCP-Postgres server** en Fase 4+ cuando los skills crezcan. |
| 5 | ¿Volúmenes compartidos `/shared/img` y `/shared/audio`? | **Sí**, definidos como named volumes en `docker-compose.yml`, montados en ambos contenedores (`crea_web` y `crea_hermes`). |
| 6 | ¿Se adopta el flujo SEO-first del content marketing estándar como reemplazo del flujo CREA? | **NO**. El flujo CREA (multiformato + gate editorial + etiquetado IA + multicanal) es objetivamente más profesional para un medio de comunicación local que para un blog de marketing. **Sí** se adoptan dos pasos complementarios (search intent + pre-check SEO) en Fase 8 como enriquecimiento, NO como reemplazo. El gate editorial humano sigue siendo el árbitro final; un fallo SEO nunca bloquea publicación. |

---

## 12. Decisiones pendientes (a confirmar antes de Fase 0)

- [ ] **Cuenta Nous Portal**: ¿Emmanuel ya tiene una o se crea nueva? Email asociado.
- [ ] **OpenRouter API key**: ¿Quién genera la key (Karol/Emmanuel)? ¿Qué método de pago se asocia?
- [ ] **ElevenLabs**: ¿Usar la cuenta existente de Emmanuel o crear una organizacional para CREA? ¿Plan Creator o Pro?
- [ ] **Telegram bot**: ¿Qué nombre/handle? Sugerencias: `@CreaCommandBot`, `@RadarCreaBot`, `@CreaContenidosBot`.
- [ ] **OpenWeatherMap**: free tier (1K calls/día) es suficiente. Confirmar email para registrar.
- [ ] **Resend**: confirmar dominio para autenticación SPF/DKIM (probablemente `crea-contenidos.com`).
- [ ] **Apify**: posponer hasta Fase 6 (post-lanzamiento estable).
- [ ] **Google Search Console** (Fase 8): registrar `crea-contenidos.com` antes de la Fase 8 para tener métricas históricas cuando se active el enriquecimiento SEO. Es gratis, solo requiere verificación de dominio.
- [ ] **Activar Fase 8**: decidir cuándo (cuando la operación lleve ≥30 días estable y Emmanuel reporte que quiere mejorar ranking en Google). NO es obligatoria, NO está bloqueada por presupuesto.

---

## 13. Contexto operativo para agentes IA

### 13.1 Archivos clave del repo (lectura obligatoria antes de implementar)

| Archivo | Por qué importa |
|---|---|
| [`PLAN.md`](./PLAN.md) | Plan maestro del proyecto. Esta integración es una extensión, no un reemplazo. |
| [`docs/updates/CREA_Brief_Desarrollador.md`](./docs/updates/CREA_Brief_Desarrollador.md) | Brief original del cliente. Define alcance, prioridades y restricciones (etiquetado IA, gate humano). |
| [`docs/updates/CREA_Social_Listening.md`](./docs/updates/CREA_Social_Listening.md) | Spec del módulo de listening. Define qué scrapers, qué frecuencias, qué tabla `competitor_posts`. |
| [`docs/updates/CREA_Newsletter_Podcast.md`](./docs/updates/CREA_Newsletter_Podcast.md) | Spec del newsletter "Buenos días, Perote". Formato fijo, prompt completo, distribución. |
| [`docs/architecture/operating-architecture.md`](./docs/architecture/operating-architecture.md) | Arquitectura operativa (eventos `idea.received.v1` etc.). Hermes implementa esto vía `context_from`. |
| [`docs/adr/0001-hybrid-ai-and-editorial-gate.md`](./docs/adr/0001-hybrid-ai-and-editorial-gate.md) | ADR de IA híbrida + gate editorial. Esta integración LO IMPLEMENTA. |
| [`docs/runbooks/incidents-and-fallbacks.md`](./docs/runbooks/incidents-and-fallbacks.md) | Runbook de fallback. Hermes lo cumple con `fallback_providers`. |
| [`config/system-prompt-crea.md`](./config/system-prompt-crea.md) | Prompt editorial actual. Se mueve a `SOUL.md` (con extensiones). |
| [`config/social-listening.example.json`](./config/social-listening.example.json) | Configuración de fuentes y keywords. Skill `crea-radar` la lee. |
| [`config/ai-config.json`](./config/ai-config.json) | Configuración de modelos por proveedor. Reemplazada por `~/.hermes/config.yaml`. |
| [`migrations/001_initial_schema.sql`](./migrations/001_initial_schema.sql) | Schema completo. Define enums (`fuente_idea`, `formato_pieza`, `estado_pieza`, etc.) que los skills DEBEN respetar. |
| [`services/lib/api-clients.js`](./services/lib/api-clients.js) | Wrappers actuales de Perplexity/Claude/DALL-E/ElevenLabs. Referencia para qué payloads exactos usar. |
| [`services/social-listener.js`](./services/social-listener.js) | Lógica de dedup Levenshtein, sugerencia de formatos, mapeo `fuente_db`. Skill `crea-radar` debe replicar. |
| [`services/content-generator.js`](./services/content-generator.js) | Mapeo `ui_format` ↔ `formato_db` (`uiFormatToDbFormat`). Skill `crea-content-generation` debe usarlo. |
| [`services/audio-preprocessor.js`](./services/audio-preprocessor.js) | Limpieza de HTML, chunking ≤150 palabras, cálculo de duración. Reusar tal cual. |
| [`Dockerfile`](./Dockerfile) | Imagen actual de `crea_web`. Se mantiene; el `crond` se desactiva en Fase 7. |
| [`docker-compose.yml`](./docker-compose.yml) | Compose de Dokploy. Aquí se añade el servicio `hermes`. |
| [`docker-compose.production.yml`](./docker-compose.production.yml) | Compose alternativo. Mismo cambio aplica. |

### 13.2 Convenciones del proyecto

- **Idioma**: español de México. Todos los logs, prompts, mensajes a Emmanuel y comentarios en español. Nombres de variables y funciones en inglés.
- **Etiquetado IA**: TODA propuesta y artículo lleva `metadata.ai_label IN ('humano','asistido','generado')`. Es un requisito ético §9 del Brief, no decorativo.
- **Gate humano**: NADA se publica sin aprobación de Emmanuel. El skill puede generar y encolar, pero el INSERT en `publicaciones.estado='programada'` sucede solo tras aprobación humana.
- **Soft delete**: la mayoría de tablas tienen `deleted_at TIMESTAMP NULL`. Los skills deben respetar `WHERE deleted_at IS NULL` en queries.
- **Slugs únicos**: `piezas_contenido.slug` debe ser único entre filas no-borradas. Hay helper `ensureUniqueSlug` en el JS actual; replicar en el skill.
- **Enum `fuente`**: `ideas.fuente` es un enum Postgres. Valores permitidos: `telegram`, `whatsapp_texto`, `whatsapp_voz`, `alerta_google_news`, `perplexity_signal`, `director_editorial`, `colaborador_externo`. Skill `crea-radar` mapea fuentes externas a estos valores.
- **Enum `formato`**: `piezas_contenido.formato`: `nota_web`, `carrusel_instagram`, `guion_video`, `capsula_audio`, `newsletter`. El UI usa `nota|post|audio|video|meme|infografia`; mapeo está en `uiFormatToDbFormat`.
- **JSON estricto**: cuando el LLM debe devolver JSON, el prompt termina con `Devuelve SOLO JSON. Sin texto adicional.` y el skill parsea con `safeJsonExtractObject` (ver `api-clients.js` líneas 130-145).

### 13.3 Errores comunes a evitar

1. **NO usar `nota|post|audio|video|meme|infografia` directamente como `formato` en `piezas_contenido`** — esos son valores UI. Usa el enum DB (`nota_web`, etc.) y guarda el UI format en `metadata.ui_format`.
2. **NO crear filas en `publicaciones` con `estado='publicada'` directamente** — el flujo es `programada` → worker publica → `publicada` o `fallida`. Saltarse la cola rompe el audit trail.
3. **NO commitear `.env` ni hardcodear API keys**. El Brief §11 lo prohíbe explícitamente. Todo en Dokploy environment.
4. **NO escribir directamente a `apps/web/assets/img/generated/` desde el contenedor de Hermes** — usar el bind-mount `/output/img` (que apunta al mismo path en `crea_web`). Si se escribe directo, el contenedor de Hermes no puede ver `/usr/share/nginx/html/...` porque no es su filesystem.
5. **NO ignorar `metadata.is_proposal=true`** al filtrar `piezas_contenido` en queries — si lo omites, mezclas propuestas IA con artículos finales del flujo manual.
6. **NO usar `master` para el branch de implementación** — Hermes implementation va en `feat/hermes-*` branches, PR contra `master`.

### 13.4 Comandos útiles para validación durante desarrollo

```bash
# Conectarse al contenedor Hermes
docker exec -it crea_hermes bash

# Verificar config y conectividad
hermes doctor
hermes config show

# Listar skills
hermes skills list

# Probar un skill manualmente
hermes chat -q "/crea-radar"

# Listar/ver cronjobs
hermes cron list
hermes cron status

# Ejecutar un cronjob a la fuerza (para test)
hermes cron run <job_id>

# Ver logs
hermes logs --follow --level INFO
hermes logs --session <session_id>

# Validar conexión a Postgres
docker exec crea_hermes psql -h postgres -U crea -d crea_db -c "SELECT COUNT(*) FROM ideas WHERE deleted_at IS NULL;"

# Validar paridad con legacy (Fase 1-2)
docker exec crea_postgres psql -U crea -d crea_db -c "
  SELECT
    metadata->>'service' AS service,
    COUNT(*) AS total,
    MIN(created_at) AS first,
    MAX(created_at) AS last
  FROM ideas
  WHERE deleted_at IS NULL
    AND created_at > NOW() - interval '24 hours'
  GROUP BY metadata->>'service';
"
```

### 13.5 Prompts de ejemplo para iniciar implementación

Si un agente IA toma este plan y va a empezar la **Fase 0**, su primer mensaje debería ser equivalente a:

> Estoy implementando la Fase 0 del plan en `PLAN_HERMES.md`. Voy a:
> 1. Editar `docker-compose.yml` para añadir el servicio `hermes` con el bloque definido en §8.1.
> 2. Crear `config/hermes/config.yaml` con la plantilla de §4.4.
> 3. Crear `config/hermes/SOUL.md` con la plantilla de §7.
> 4. Documentar el procedimiento de primer arranque en `docs/runbooks/hermes-bootstrap.md`.
> 5. NO modificar nada de `apps/web/`, `admin/`, `api/`, ni los servicios legacy.
> 6. Validar con `hermes doctor` y un saludo de prueba antes de marcar la fase como completa.

Para **Fase 1** (skill `crea-radar`):

> Voy a crear el skill `~/.hermes/skills/crea-radar/SKILL.md` siguiendo §6.1. Lo equivalente lógico está en `services/social-listener.js`. Debo replicar:
> - Carga de `config/social-listening.json`.
> - Llamada a `web_search` (Tool Gateway) con la query del config.
> - Parser RSS de los 3 feeds (puedo usar `web_extract` en lugar del parser nativo Node).
> - `analyzeSentiment` y `suggestFormats` (líneas 140-180 del JS).
> - Dedup Levenshtein contra `ideas` últimos 14 días (líneas 200-260).
> - UPSERT con mismo schema (`fuente`, `urgencia`, `estado='nueva'`, `metadata.service='social_listener'`).
> - Cleanup `WHERE created_at < NOW() - 30 days`.
> Voy a correr el skill manualmente con `hermes chat -q "/crea-radar"` y comparar la salida con la del JS legacy.

---

## 14. Referencias externas

- **Hermes Agent**: https://github.com/NousResearch/hermes-agent
- **Hermes Agent docs (markdown raw)**:
  - `website/docs/getting-started/installation.md`
  - `website/docs/user-guide/configuration.md`
  - `website/docs/user-guide/features/skills.md`
  - `website/docs/user-guide/features/tools.md`
  - `website/docs/user-guide/features/cron.md`
  - `website/docs/user-guide/features/mcp.md`
- **agentskills.io**: estándar abierto de skills (https://agentskills.io/specification)
- **Nous Portal**: https://portal.nousresearch.com/manage-subscription
- **OpenRouter pricing**: https://openrouter.ai/models
- **MCP Postgres server oficial**: https://github.com/modelcontextprotocol/servers/tree/main/src/postgres
- **MCP Apify oficial**: https://github.com/apify/actors-mcp-server
- **Dokploy docs**: https://dokploy.com/docs

---

## 15. Glosario

- **Hermes Agent**: agente IA open-source de Nous Research, sucesor de OpenClaw. Provee modelos agnósticos, skills, cron, MCP, gateway multi-plataforma.
- **Skill**: documento `SKILL.md` con frontmatter YAML que el agent puede invocar como un slash command. Estándar `agentskills.io`.
- **Tool Gateway**: servicio incluido en Nous Portal Plus+ que provee `web_search`, `image_generate`, `text_to_speech`, `browser` sin keys adicionales.
- **MCP** (Model Context Protocol): protocolo abierto de Anthropic para que un agent consuma tools externos vía servers stdio o HTTP.
- **`context_from`**: parámetro de `cronjob` en Hermes que inyecta el output del último run de otro job como contexto del job actual. Permite encadenar pipelines sin bus de eventos.
- **`wakeAgent`**: directiva en pre-run scripts (`{"wakeAgent": false}` en stdout) que evita despertar al LLM cuando no hay trabajo. 0 tokens consumidos.
- **`SOUL.md`**: archivo en `~/.hermes/` que define la identidad del agente. Ocupa el slot #1 del system prompt, reemplaza la identidad default.
- **Dokploy**: plataforma de despliegue self-hosted (alternativa open-source a Heroku/Vercel) que orquesta contenedores Docker con Traefik.
- **`ai_label`**: etiqueta de transparencia (`humano|asistido|generado`) requerida por el código de ética §9 del Brief, visible al público en cada artículo.
- **Gate editorial**: paso obligatorio de aprobación humana antes de publicar. En Hermes, se implementa enviando la propuesta por Telegram a Emmanuel y esperando su decisión.

---

**Mantenimiento de este documento**: actualizar la tabla de §9 (estado de fases) cada vez que se complete una. Marcar §12 (decisiones pendientes) cuando se confirmen. Si la estrategia de modelos cambia, actualizar §4 y §10 al mismo tiempo. Cualquier cambio sustantivo va por PR — no editar `master` directamente.
