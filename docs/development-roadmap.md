# Roadmap de Desarrollo — Sistema Interno CREA Contenidos

> **Documento creado:** 6 de abril 2026
> **Estado:** En planificación
> **Audiencia:** Agentes IA, desarrolladores, equipo técnico
> **Versión:** 1.0

---

## Contexto del Proyecto

CREA Contenidos es un ecosistema de medio humano aumentado por IA. El sistema interno gestiona el ciclo de vida completo del contenido: captura de ideas, análisis contextual, producción editorial, aprobación humana, publicación multicanal, métricas, comercialización y gamificación de colaboradores.

### Stack Técnico
| Capa | Tecnología |
|---|---|
| **Infraestructura** | Hostinger VPS KVM 2 (2 vCPU, 8 GB RAM, 100 GB NVMe) |
| **Orquestación** | Docker + Docker Compose |
| **Base de datos** | PostgreSQL 15+ (canónica) |
| **Broker de eventos** | RabbitMQ |
| **Cache/Sesión** | Redis |
| **Proxy** | Nginx (reverse proxy + frontend estático) |
| **Frontend** | HTML5/CSS3/JS vanilla (prototipo actual) |
| **Agentes IA** | OpenClaw runtime (orquestación 24/7) |
| **Monitoreo** | Uptime Kuma (fase inicial), Grafana + Prometheus (escalamiento) |

### Arquitectura de Referencia
- **Patrón:** Event-driven microservicios (9 servicios + infraestructura)
- **Comunicación:** Eventos versionados vía RabbitMQ
- **Base de datos:** PostgreSQL con esquema documentado (22 tablas, 12 enums, triggers, vistas)
- **Principio clave:** Human-in-the-loop obligatorio en decisiones editoriales críticas

### Documentos de Referencia
| Documento | Ubicación | Propósito |
|---|---|---|
| Evaluación Hostinger | `docs/hostinger-evaluation.md` | Infraestructura, costos, capacidad |
| Arquitectura Operativa | `docs/architecture/operating-architecture.md` | Principios, flujo, SLOs, seguridad |
| Fases de Implementación | `docs/architecture/implementation-phases.md` | Plan de corrección y escalado |
| Esquema de Base de Datos | `docs/database/CREA_DB_Schema_PostgreSQL.md` | Fuente de verdad estructural (22 tablas) |
| ADR-0001 | `docs/adr/0001-hybrid-ai-and-editorial-gate.md` | Decisión IA híbrida + gate editorial |
| Runbooks | `docs/runbooks/incidents-and-fallbacks.md` | Incidentes y fallbacks operativos |
| Contratos de Eventos | `packages/contracts/events/*.schema.json` | 9 esquemas JSON de eventos canónicos |
| Policies | `packages/policies/` | Ruteo IA y política editorial |

---

## Estado Actual del Sistema

### ✅ Lo que ya existe

| Componente | Estado | Detalles |
|---|---|---|
| **Frontend web** | ✅ Prototipo funcional | HTML/CSS/JS vanilla en `apps/web/`, desplegable en Vercel |
| **Estructura monorepo** | ✅ Scaffold completo | `apps/`, `services/`, `packages/`, `docs/` |
| **9 servicios (scaffold)** | ✅ READMEs definidos | Cada uno con objetivo, responsabilidades, eventos, dependencias, SLO |
| **9 contratos de eventos** | ✅ JSON Schema v1 | `idea.received.v1`, `radar.brief.ready.v1`, `content.draft.ready.v1`, `editorial.approved.v1`, `publication.completed.v1`, `metrics.snapshot.ready.v1`, `commercial.lead.detected.v1`, `collaborator.points.updated.v1` |
| **Esquema de BD completo** | ✅ SQL documentado | 22 tablas, 12 enums, triggers, funciones, vistas, orden de ejecución |
| **Dockerfile frontend** | ✅ Nginx Alpine | Sirve `apps/web/` estático |
| **docker-compose.yml** | ⚠️ Parcial | Solo servicio `web` con Traefik labels (requiere expansión) |
| **Políticas** | ✅ 2 documentos | `ai-routing-policy.md`, `editorial-gate-policy.md` |
| **ADR** | ✅ 1 documento | IA híbrida con gate editorial |
| **Runbooks** | ✅ 5 escenarios | Caída cloud, cola bloqueada, error publicación, riesgo legal, OpenClaw offline |

### ❌ Lo que falta construir

| Componente | Estado | Prioridad |
|---|---|---|
| **Docker Compose completo** | ❌ Sin infraestructura (PostgreSQL, RabbitMQ, Redis) | 🔴 Crítica |
| **Migraciones de BD** | ❌ SQL documentado pero no implementado | 🔴 Crítica |
| **Microservicios (código)** | ❌ Solo scaffolds con READMEs | 🔴 Crítica |
| **API Gateway / ingest-gateway** | ❌ Sin implementación | 🔴 Crítica |
| **Panel interno (admin UI)** | ❌ Sin desarrollar | 🟡 Alta |
| **Sistema de autenticación** | ❌ Sin implementar | 🟡 Alta |
| **RBAC** | ❌ Sin implementar | 🟡 Alta |
| **Observabilidad** | ❌ Sin dashboards ni alertas | 🟡 Alta |
| **CI/CD pipeline** | ❌ Sin configurar | 🟢 Media |
| **Tests automatizados** | ❌ Sin suite | 🟢 Media |
| **Integraciones externas** | ❌ WhatsApp, Telegram, WordPress, Buffer | 🟢 Media |

---

## Roadmap por Fases de Desarrollo

### Fase 0 — Fundación Operativa
**Duración estimada:** 1-2 semanas
**Objetivo:** Base técnica y operativa controlada

#### Entregables

- [ ] **Infraestructura Docker completa**
  - [ ] `docker-compose.yml` con PostgreSQL, RabbitMQ, Redis, Nginx
  - [ ] Redes y volúmenes persistentes configurados
  - [ ] Variables de entorno centralizadas (`.env.example`)
  - [ ] Health checks para todos los servicios

- [ ] **Base de datos**
  - [ ] Script de migración `001_initial_schema.sql` basado en `docs/database/CREA_DB_Schema_PostgreSQL.md`
  - [ ] Ejecutar extensiones (pgcrypto, pg_trgm)
  - [ ] Crear todos los enums, tablas, índices, triggers y vistas
  - [ ] Seed data mínimo (categorías editoriales, roles, usuario admin)

- [ ] **Contratos de eventos v1**
  - [ ] Validar los 9 JSON Schema existentes
  - [ ] Generar tipos TypeScript desde schemas
  - [ ] Documentar convención de versionado

- [ ] **SLO/SLI y tableros base**
  - [ ] Definir métricas: disponibilidad, latencia p95, pérdida de eventos
  - [ ] Instalar Uptime Kuma
  - [ ] Configurar health endpoints en cada servicio

- [ ] **Políticas documentadas**
  - [x] Política editorial (`packages/policies/editorial-gate-policy.md`)
  - [x] Política de ruteo IA (`packages/policies/ai-routing-policy.md`)

- [ ] **Runbook mínimo de incidentes**
  - [x] 5 escenarios documentados (`docs/runbooks/incidents-and-fallbacks.md`)

#### Criterio de Salida
> Flujo de punta a punta simulado con datos de prueba sin pérdida de eventos.

#### Contexto para Agentes IA
```
- Esquema de BD: docs/database/CREA_DB_Schema_PostgreSQL.md (fuente de verdad)
- Eventos: packages/contracts/events/*.schema.json
- Orden de ejecución SQL: Sección 13 del schema doc
- Convención de eventos: <dominio>.<accion>.v<version>
- Campos obligatorios en eventos: event_id, event_name, occurred_at, producer, payload
```

---

### Fase 1 — MVP Autónomo Supervisado
**Duración estimada:** 2-4 semanas
**Objetivo:** Operar flujo real con aprobación humana obligatoria

#### Entregables

- [ ] **ingest-gateway**
  - [ ] Webhooks para WhatsApp y Telegram
  - [ ] Normalización de mensajes entrantes
  - [ ] Emisión de evento `idea.received.v1`
  - [ ] Idempotencia por `event_id`
  - [ ] Health endpoint `/health`

- [ ] **radar-context**
  - [ ] Consumo de `idea.received.v1`
  - [ ] Enriquecimiento contextual (simulado inicialmente)
  - [ ] Emisión de `radar.brief.ready.v1`
  - [ ] Scores de relevancia y audiencia (1-10)

- [ ] **content-orchestrator**
  - [ ] Consumo de `radar.brief.ready.v1`
  - [ ] Generación de borrador IA (simulado o API real)
  - [ ] Emisión de `content.draft.ready.v1`
  - [ ] Registro de modelo IA usado y tokens consumidos

- [ ] **editorial-control**
  - [ ] Panel web interno (UI básica)
  - [ ] Consumo de `content.draft.ready.v1`
  - [ ] Interfaz de revisión: aprobar/rechazar con notas
  - [ ] Emisión de `editorial.approved.v1` o `editorial.rejected.v1`
  - [ ] Gate editorial obligatorio (no se publica sin aprobación)

- [ ] **publication-hub**
  - [ ] Consumo de `editorial.approved.v1`
  - [ ] Publicación en sitio web (WordPress API)
  - [ ] Emisión de `publication.completed.v1`
  - [ ] Registro de URL externa y ID de publicación

- [ ] **Trazabilidad completa**
  - [ ] Cada nota con historial de estados en `audit_log`
  - [ ] Origen de cada acción registrado (openclaw, api_web, panel_interno)
  - [ ] Relación idea → pieza → publicación rastreable

- [ ] **Alertas básicas**
  - [ ] Latencia ingest → draft > 8 min
  - [ ] Tasa de errores > 5%
  - [ ] Notificaciones por Telegram/email

#### Criterio de Salida
> 95% de ideas procesadas sin intervención técnica manual.

#### Contexto para Agentes IA
```
- Flujo operativo: docs/architecture/operating-architecture.md (Sección 4.2)
- Diagrama Mermaid: operating-architecture.md (Sección 5)
- SLOs: p95 ingest->draft <= 8 min, publicación tras aprobación <= 60 seg
- Tablas clave: ideas, radar_briefings, piezas_contenido, publicaciones, audit_log
- Vistas útiles: v_resumen_editorial_hoy (Sección 12 del schema)
- Runbooks relevantes: Caída de modelo cloud, Error en publicación
```

---

### Fase 2 — Optimización y Resiliencia
**Duración estimada:** 3-5 semanas
**Objetivo:** Reducir fallas, costo y tiempos de ciclo

#### Entregables

- [ ] **Dead Letter Queues (DLQ)**
  - [ ] DLQ por dominio en RabbitMQ
  - [ ] Reintento automático con backoff exponencial
  - [ ] Panel de visualización de mensajes en DLQ
  - [ ] Alerta cuando DLQ > umbral

- [ ] **Fallback IA cloud → local**
  - [ ] Circuit breaker para APIs cloud (Claude, OpenAI, Perplexity)
  - [ ] Feature flag de fallback automático
  - [ ] Modelo local para tareas no críticas (transcripción, clasificación)
  - [ ] Modo premium pendiente para re-procesamiento

- [ ] **Cost Observability**
  - [ ] Tracking de tokens y costo por nota
  - [ ] Dashboard de gasto IA por módulo
  - [ ] Alertas cuando costo por nota supere umbral
  - [ ] Registro de `modelo_ia_usado` y `tokens_ia` en cada pieza

- [ ] **Reintentos con backoff**
  - [ ] Configuración de reintentos por tipo de evento
  - [ ] Máximo de reintentos configurable
  - [ ] Logging de cada reintento

- [ ] **Optimización de performance**
  - [ ] p95 ingest → draft <= 8 minutos
  - [ ] Índices de BD revisados y optimizados
  - [ ] Connection pooling configurado

#### Criterio de Salida
> p95 ingest->draft <= 8 minutos y costo medio controlado.

#### Contexto para Agentes IA
```
- Estrategia IA híbrida: operating-architecture.md (Sección 7)
- Reglas de ruteo: packages/policies/ai-routing-policy.md
- SLOs de latencia: operating-architecture.md (Sección 8)
- Tablas de costo: piezas_contenido.modelo_ia_usado, piezas_contenido.tokens_ia
- Runbook relevante: Cola de eventos creciendo sin consumo
```

---

### Fase 3 — Comercial y Crecimiento
**Duración estimada:** 3-6 semanas
**Objetivo:** Monetización asistida por IA sin romper calidad editorial

#### Entregables

- [ ] **commercial-intel**
  - [ ] Consumo de `metrics.snapshot.ready.v1`
  - [ ] Detección de oportunidades de patrocinio
  - [ ] Scoring de prospectos (relevancia, valor estimado)
  - [ ] Emisión de `commercial.lead.detected.v1`
  - [ ] Generación de brief comercial con IA

- [ ] **Pipeline comercial**
  - [ ] CRUD de prospectos en panel interno
  - [ ] Estados auditables: identificado → contactado → propuesta → negociación → cerrado
  - [ ] Propuestas comerciales con PDF generation
  - [ ] Contratos comerciales con fechas y renovación

- [ ] **Integración CRM**
  - [ ] Sincronización con Notion (si aplica)
  - [ ] Registro de `notion_crm_id` en prospectos
  - [ ] Dashboard de pipeline comercial

- [ ] **Métricas comerciales**
  - [ ] Tasa de conversión de oportunidades
  - [ ] Ingresos por semana/mes
  - [ ] MRR (Monthly Recurring Revenue)
  - [ ] Vista `v_pipeline_comercial` activa en panel

#### Criterio de Salida
> Tasa de conversión de oportunidades medible y estable.

#### Contexto para Agentes IA
```
- Tablas comerciales: prospectos, propuestas_comerciales, contratos_comerciales, patrocinadores
- Enums: estado_pipeline, tipo_producto_comercial
- Vista: v_pipeline_comercial (Sección 12.3 del schema)
- Evento: commercial.lead.detected.v1 (packages/contracts/events/)
- Precios referenciales: tipo_producto_comercial enum en schema doc
```

---

### Fase 4 — Colaboradores y Gamificación
**Duración estimada:** 2-4 semanas
**Objetivo:** Escalar red de colaboradores con calidad

#### Entregables

- [ ] **collaborator-gamification**
  - [ ] Consumo de `publication.completed.v1`
  - [ ] Cálculo automático de UC (Unidades CREA)
  - [ ] Trigger `fn_acreditar_uc_publicacion` verificado
  - [ ] Emisión de `collaborator.points.updated.v1`

- [ ] **Sistema de misiones**
  - [ ] CRUD de misiones en panel interno
  - [ ] Asignación de misiones a colaboradores
  - [ ] Seguimiento de completadas/pendientes
  - [ ] Recompensas UC automáticas

- [ ] **Sistema de logros**
  - [ ] Catálogo de badges desbloqueables
  - [ ] Condiciones de desbloqueo automáticas
  - [ ] Notificaciones al desbloquear logro

- [ ] **Ranking y niveles**
  - [ ] Vista `v_ranking_colaboradores` activa
  - [ ] Niveles automáticos: junior → creador → senior → maestro
  - [ ] Trigger `fn_actualizar_nivel_colaborador` verificado

- [ ] **Controles anti-abuso**
  - [ ] Límites de UC por período
  - [ ] Revisión humana para ajustes manuales
  - [ ] Auditoría de todos los movimientos de UC

#### Criterio de Salida
> Retención de colaboradores y calidad editorial sostenidas.

#### Contexto para Agentes IA
```
- Tablas de gamificación: misiones, asignaciones_mision, logros, logros_usuarios, puntos_uc
- Trigger UC: fn_acreditar_uc_publicacion (Sección 11.4 del schema)
- Trigger nivel: fn_actualizar_nivel_colaborador (Sección 11.3 del schema)
- Vista ranking: v_ranking_colaboradores (Sección 12.2 del schema)
- Niveles: junior (0-20 UC), creador (21-60), senior (61-150), maestro (151+)
- UC base: nota_web = 1.0, video = 2.0, bonus viral +1.0
```

---

### Fase 5 — Panel Interno Completo
**Duración estimada:** 3-5 semanas
**Objetivo:** Interfaz unificada para todo el equipo CREA

#### Entregables

- [ ] **Autenticación y Autorización**
  - [ ] Login con email/password
  - [ ] RBAC por rol (director_editorial, conductor_reportero, produccion_tecnica, comercial_ventas, colaborador_externo)
  - [ ] Sesiones seguras con refresh tokens
  - [ ] Protección de rutas por rol

- [ ] **Dashboard Director Editorial**
  - [ ] Vista `v_resumen_editorial_hoy` integrada
  - [ ] Ideas sin revisar, aprobadas sin producir, piezas en revisión
  - [ ] Prospectos sin contactar
  - [ ] Métricas del día/semana

- [ ] **Módulo de Ideas**
  - [ ] Lista de ideas con filtros (estado, urgencia, categoría)
  - [ ] Crear idea desde formulario
  - [ ] Detalle de idea con brief de RADAR
  - [ ] Asignación a colaboradores

- [ ] **Módulo de Producción**
  - [ ] Lista de piezas con estado
  - [ ] Editor de contenido (Markdown/HTML)
  - [ ] Vista previa de pieza
  - [ ] Historial de revisiones

- [ ] **Módulo de Publicación**
  - [ ] Programación de publicaciones
  - [ ] Estado por canal
  - [ ] Reintento manual de publicaciones fallidas

- [ ] **Módulo de Métricas**
  - [ ] Dashboard de rendimiento por pieza
  - [ ] Métricas semanales consolidadas
  - [ ] Gráficos de tendencias

- [ ] **Módulo Comercial**
  - [ ] Pipeline CRM visual (kanban)
  - [ ] Detalle de prospectos
  - [ ] Generación de propuestas
  - [ ] Contratos activos

- [ ] **Módulo de Colaboradores**
  - [ ] Ranking de UC
  - [ ] Misiones activas y completadas
  - [ ] Logros desbloqueados
  - [ ] Perfil de colaborador

- [ ] **Módulo de Notificaciones**
  - [ ] Centro de notificaciones interno
  - [ ] Configuración de preferencias
  - [ ] Integración con Telegram/WhatsApp

#### Criterio de Salida
> Todo el equipo opera desde el panel interno sin herramientas externas.

#### Contexto para Agentes IA
```
- Roles: rol_usuario enum en schema doc (5 roles)
- Vistas de dashboard: Sección 12 del schema (3 vistas)
- Notificaciones: tabla notificaciones con tipos y canales
- Audit log: tabla audit_log para trazabilidad completa
- Frontend actual: apps/web/ (prototipo, requiere panel admin separado)
```

---

### Fase 6 — Escalamiento y Producción
**Duración estimada:** 4-6 semanas
**Objetivo:** Producción robusta con alta disponibilidad

#### Entregables

- [ ] **CI/CD Pipeline**
  - [ ] GitHub Actions para build y deploy
  - [ ] Tests automatizados (unitarios, integración)
  - [ ] Linting y formateo automático
  - [ ] Deploy automático a VPS

- [ ] **Observabilidad completa**
  - [ ] Grafana + Prometheus
  - [ ] Dashboards por servicio
  - [ ] Alertas configuradas (Telegram, email)
  - [ ] Logging centralizado

- [ ] **Backups automatizados**
  - [ ] pg_dump diario con retención
  - [ ] Backup de volúmenes Docker
  - [ ] Script de restauración probado
  - [ ] Backups externos (S3/Wasabi)

- [ ] **Escalamiento a KVM 4** (cuando sea necesario)
  - [ ] Réplicas de microservicios críticos
  - [ ] Elasticsearch para búsqueda editorial
  - [ ] Grafana + Prometheus en producción
  - [ ] Migración sin downtime

- [ ] **Integraciones externas completas**
  - [ ] WhatsApp Business API
  - [ ] Telegram Bot API
  - [ ] WordPress REST API
  - [ ] Buffer/Later API
  - [ ] Google Analytics 4
  - [ ] APIs de IA (Claude, OpenAI, Perplexity)

- [ ] **Seguridad**
  - [ ] HTTPS con Let's Encrypt
  - [ ] Cifrado en tránsito y reposo
  - [ ] Secret management
  - [ ] Rate limiting
  - [ ] CORS configurado

#### Criterio de Salida
> Plataforma operativa 99.5% mensual con monitoreo, backups y recuperación probados.

#### Contexto para Agentes IA
```
- Trigger de migración: hostinger-evaluation.md (Sección 4.5)
- KVM 4 specs: 4 vCPU, 16 GB RAM, 200 GB NVMe
- Elasticsearch: solo en KVM 4 (requiere ~2 GB RAM)
- SLOs finales: 99.5% disponibilidad, 0 pérdida de eventos
- Checklist de producción: operating-architecture.md (Sección 11)
```

---

## Resumen de Fases

| Fase | Nombre | Duración | Prioridad | Dependencias |
|---|---|---|---|---|
| **Fase 0** | Fundación Operativa | 1-2 semanas | 🔴 Crítica | Infraestructura, BD, contratos |
| **Fase 1** | MVP Autónomo Supervisado | 2-4 semanas | 🔴 Crítica | Fase 0 completa |
| **Fase 2** | Optimización y Resiliencia | 3-5 semanas | 🟡 Alta | Fase 1 operativa |
| **Fase 3** | Comercial y Crecimiento | 3-6 semanas | 🟡 Alta | Fase 1 operativa |
| **Fase 4** | Colaboradores y Gamificación | 2-4 semanas | 🟢 Media | Fase 1 operativa |
| **Fase 5** | Panel Interno Completo | 3-5 semanas | 🟡 Alta | Fases 1-4 funcionales |
| **Fase 6** | Escalamiento y Producción | 4-6 semanas | 🟢 Media | Todas las fases anteriores |

**Duración total estimada:** 18-32 semanas (4.5-8 meses)

---

## Guía para Agentes IA

### Cómo usar este documento

1. **Antes de trabajar en una fase:** Leer el contexto específico de esa fase
2. **Consultar documentos de referencia:** Los enlaces a documentos existentes son la fuente de verdad
3. **Respetar convenciones:** Seguir las convenciones del esquema de BD y contratos de eventos
4. **Validar con criterios de salida:** Cada fase tiene un criterio de salida claro

### Convenciones de Nomenclatura

| Elemento | Convención | Ejemplo |
|---|---|---|
| **Eventos** | `<dominio>.<accion>.v<version>` | `idea.received.v1` |
| **Tablas** | `snake_case`, plural | `piezas_contenido` |
| **Columnas** | `snake_case` | `fecha_publicacion` |
| **IDs** | UUID con `gen_random_uuid()` | `a1b2c3d4-e5f6-...` |
| **Timestamps** | `created_at`, `updated_at`, `deleted_at` | TIMESTAMPTZ |
| **Enums** | `snake_case`, singular | `estado_idea` |
| **Servicios** | `kebab-case` | `ingest-gateway` |

### Estructura de Eventos

```json
{
  "event_id": "uuid",
  "event_name": "idea.received.v1",
  "occurred_at": "2026-04-06T10:00:00Z",
  "producer": "ingest-gateway",
  "payload": {
    // dominio específico
  }
}
```

### Recursos Clave

| Recurso | Ubicación | Uso |
|---|---|---|
| Esquema de BD | `docs/database/CREA_DB_Schema_PostgreSQL.md` | Crear tablas, migraciones, queries |
| Eventos | `packages/contracts/events/` | Validar payloads, generar tipos |
| Políticas | `packages/policies/` | Ruteo IA, gate editorial |
| Arquitectura | `docs/architecture/operating-architecture.md` | Flujo operativo, principios |
| Fases | `docs/architecture/implementation-phases.md` | Plan original de fases |
| Runbooks | `docs/runbooks/incidents-and-fallbacks.md` | Respuesta a incidentes |
| Infraestructura | `docs/hostinger-evaluation.md` | Specs del servidor, costos |

---

*Documento generado para el proyecto CREA Contenidos — crea-contenidos.com*
*Perote, Veracruz | 2026*
*Este roadmap debe actualizarse al cierre de cada fase del proyecto.*
