---
proyecto: CREA Contenidos
documento: CRM interno — Referencia Pipedrive + HubSpot
tipo: especificacion-funcional
audiencia: agentes IA, desarrolladores, equipo comercial
estado: borrador para ejecucion
fecha: 2026-06-28
stack_db: PostgreSQL 15 (migrations/001_initial_schema.sql)
stack_app: nginx estatico + CRM interno (repositorio unico `crea_web`, modulo `/admin/crm` por definir; documentar ruta exacta al implementar Fase 2)
origen_brief: CREA_CRM_Pipedrive_HubSpot.pdf
---

## Skills relacionadas para agentes IA

Si sos un agente IA trabajando sobre este spec, cargar **en este orden**:

1. **`.opencode/skills/fullstack/SKILL.md`** — estructura del repo y stack.
2. **`.opencode/skills/crea-crm/SKILL.md`** — resumen operativo de este documento (fases + DoD + schemas).

**Regla:** si este spec y la skill se contradicen, gana el spec. Las skills se regeneran con `scripts/sync-skills.sh`.

---

# CREA CONTENIDOS — CRM INTERNO: REFERENCIA PIPEDRIVE + HUBSPOT

Base de alcance para desarrollo y pruebas. Pensado para que un agente IA pueda ejecutar cada fase sin re-preguntar.

---

## 0. Decisiones cerradas (no renegociar)

| # | Decision | Razon |
|---|----------|-------|
| D1 | Pipedrive manda en UX de pipeline (tablero, etapas, drag). | Referencia directa del equipo. |
| D2 | HubSpot manda en automatizacion (tareas, recordatorios, scoring). | Referencia directa del equipo. |
| D3 | NO se reemplaza `prospectos` / `propuestas_comerciales` / `contratos_comerciales` / `patrocinadores`. | Ya existen en `001_initial_schema.sql`. |
| D4 | NO se copia 1:1 Pipedrive ni HubSpot. Solo se toman patrones. | Stack propio, equipo chico. |
| D5 | Una sola fuente de verdad para pipeline: `prospectos.estado_pipeline`. | Evita estados paralelos. |
| D6 | Actividades y tareas viven en tablas nuevas (`prospecto_actividades`, `prospecto_tareas`). | El schema actual no las cubre. |
| D7 | Scoring se calcula al vuelo desde campos del prospecto, no se persiste. | Evita drift entre score y datos reales. |
| D8 | `notion_crm_id` se conserva como puente de migracion historica. | Ya hay prospectos en Notion. |
| D9 | Las fases se ejecutan en orden. Cada fase requiere DoD firmado antes de la siguiente. | Evita retrabajo. |

---

## 1. Objetivo

Convertir el CRM actual de CREA en una herramienta comercial **clara, rapida y util**, tomando de Pipedrive la simplicidad del pipeline y de HubSpot la profundidad de automatizacion. El resultado debe permitir al equipo comercial saber que hacer con cada prospecto sin abrir otra herramienta.

**Fuera de alcance:** reemplazar el sistema contable, facturacion electronica (CFDI), cobranza automatica, integracion telefonica VoIP, multi-moneda.

---

## 2. Brecha actual (problemas a resolver)

Inspeccionado contra `migrations/001_initial_schema.sql`:

| Brecha | Hoy | Despues |
|--------|-----|---------|
| Pipeline visible | Solo un enum `estado_pipeline`, sin vista Kanban. | Tablero con drag & drop por etapa. |
| Actividad por prospecto | No existe tabla. | Timeline con llamadas, mensajes, reuniones, cambios de estado, notas. |
| Tareas y recordatorios | No existen. | Cola de tareas con `fecha_vencimiento` y alerta. |
| Scoring de lead | No existe. | Score 0-100 calculado (relevancia + valor + senal). |
| Conversion prospecto -> contrato | Manual, propensa a perdida de trazabilidad. | `propuestas_comerciales.propuesta_id` enlaza contrato con prospecto de forma obligatoria. |
| Reportes | No hay vistas. | Dashboard: oportunidades por etapa, conversion, tiempo medio por etapa, valor estimado vs cerrado. |

**Tablas disponibles como base** (NO recrear):
- `prospectos` — incluye `estado_pipeline`, `responsable_id`, `fecha_proximo_contacto`, `brief_comercial_ia`, `notion_crm_id`, `pieza_origen_id`, `valor_estimado_mxn`, `tipo_producto_interes[]`.
- `propuestas_comerciales` — enlazada a `prospectos.id`.
- `contratos_comerciales` — enlazada a `propuestas_comerciales.id` (nullable) y `patrocinadores.id`.
- `patrocinadores` — catalogo de empresas clientes.
- `usuarios` — para `responsable_id`.
- Vista existente: `v_pipeline_comercial` — ya muestra pipeline activo.

---

## 3. Referencias funcionales (lo que se toma, no se copia)

### 3.1 De Pipedrive
- Pipeline con **maximo 7 etapas** (ver §4.1).
- Vista tablero + vista lista conmutables.
- Drag & drop entre etapas.
- Tarjeta de prospecto compacta: empresa, contacto, valor, siguiente accion, responsable.
- Acciones rapidas: llamar, mail, WhatsApp, reagendar.
- Foco en velocidad: cualquier cambio en <2 clicks.

### 3.2 De HubSpot
- Timeline cronologico inverso por prospecto.
- Tareas con `fecha_vencimiento`, `prioridad`, `responsable`.
- Recordatorios automaticos (24h antes de vencer, el dia que vence).
- Scoring combinado (engagement + fit + senal).
- Reportes de conversion por etapa y por responsable.
- Plantillas de comunicacion reutilizables.

---

## 4. Alcance funcional detallado

### 4.1 Pipeline comercial

**Etapas** (mapeadas al enum existente `estado_pipeline`):
1. `identificado` — lead nuevo, sin contacto.
2. `contactado` — primer outreach hecho.
3. `propuesta_enviada` — propuesta comercial generada y enviada.
4. `en_negociacion` — en discusion activa.
5. `cerrado_ganado` — contrato firmado.
6. `cerrado_perdido` — no concretado (motivo obligatorio).
7. `inactivo` — sin movimiento >30 dias, requiere reaccion.

**Columnas del tablero:**
- Por etapa: nombre, conteo, valor total estimado.
- Cards: empresa, contacto, valor MXN, responsable (alias), dias sin contacto, badge de score (Alta/Media/Baja).
- Color de borde segun `fecha_proximo_contacto`: verde (>3d), amarillo (1-3d), rojo (vencido).

**Acciones in-card:** mover etapa (menu), registrar actividad (boton), reagendar contacto, abrir ficha.

### 4.2 Ficha del prospecto

Datos mostrados (campos existentes, NO agregar):
- Empresa, contacto, email, telefono, sector.
- Origen: `pieza_origen_id` (link a la pieza CREA que genero el lead) + `origen_descripcion`.
- Estado pipeline (editable).
- Valor estimado (`valor_estimado_mxn`).
- Producto(s) de interes (`tipo_producto_interes[]`).
- Responsable (`responsable_id` -> `usuarios.alias`).
- Proximo contacto (`fecha_proximo_contacto`).
- Notas libres + `brief_comercial_ia` (resumen generado).

**CTA visibles:**
- Boton "Llamar" (abre `tel:`).
- Boton "Email" (abre `mailto:`).
- Boton "WhatsApp" (abre `wa.me/<tel>`).
- Boton "Crear propuesta" (abre formulario prellenado).
- Boton "Ver contrato" (si existe).

### 4.3 Timeline de actividad

**Nueva tabla** `prospecto_actividades`:
```
id              UUID PK
prospecto_id    UUID FK prospectos(id) ON DELETE CASCADE
tipo            ENUM (llamada, mensaje, reunion, cambio_estado, comentario, email)
descripcion     TEXT
usuario_id      UUID FK usuarios(id)
fecha_evento    TIMESTAMPTZ
metadata        JSONB
created_at      TIMESTAMPTZ
```

**Comportamiento:**
- Cambios de `prospectos.estado_pipeline` insertan automaticamente una actividad `cambio_estado` (trigger SQL).
- Timeline ordenado descendente.
- Filtro por tipo y por rango de fecha.
- Comentarios internos visibles solo para el equipo.

### 4.4 Tareas y recordatorios

**Nueva tabla** `prospecto_tareas`:
```
id                   UUID PK
prospecto_id         UUID FK prospectos(id) ON DELETE CASCADE
titulo               VARCHAR(200)
descripcion          TEXT
responsable_id       UUID FK usuarios(id)
fecha_vencimiento    TIMESTAMPTZ
prioridad            ENUM (alta, media, baja)
completada           BOOLEAN DEFAULT FALSE
completada_en        TIMESTAMPTZ
origen               ENUM (manual, automatica)
metadata             JSONB
created_at           TIMESTAMPTZ
```

**Reglas automaticas (Fase 3):**
- Crear tarea `contactar` al insertar prospecto nuevo (vencimiento +2 dias habiles).
- Crear tarea `seguimiento_post_propuesta` 7 dias despues de `propuesta_enviada`.
- Crear tarea `renovacion` 30 dias antes de `contratos.fecha_fin`.
- **Validacion al asignar:** el `responsable_id` debe apuntar a un `usuarios.activo = TRUE AND deleted_at IS NULL`. Si no, asignar a `director_editorial` por default y registrar warning en `audit_log`.

### 4.5 Scoring

**Calculo al vuelo** (no persistido), expuesto en `prospectos.score` (vista):
```
score = (relevancia_editorial * 0.4) + (valor_estimado_normalizado * 0.4) + (senal_actividad * 0.2)
```

| Subscore | Rango | Origen |
|----------|-------|--------|
| `relevancia_editorial` | 0-100 | Si `pieza_origen_id` apunta a pieza con score alto. |
| `valor_estimado_normalizado` | 0-100 | `valor_estimado_mxn` mapeado por tramos (<10k=20, 10-50k=50, 50-150k=80, >150k=100). |
| `senal_actividad` | 0-100 | Conteo y frescura de `prospecto_actividades`. |

**Salida:** bucketed: `Alta` (>=70), `Media` (40-69), `Baja` (<40). Solo se muestra, no se persiste.

### 4.6 Reportes

**Vistas SQL nuevas requeridas:**
- `v_pipeline_por_etapa`: COUNT, valor_total, ticket_promedio por `estado_pipeline`.
- `v_conversion_periodo`: prospectos -> propuestas -> contratos, por mes.
- `v_tiempo_por_etapa`: promedio de dias entre transiciones de etapa (calculado desde `prospecto_actividades`).
- `v_ingresos_vs_estimado`: SUM(`contratos_comerciales.monto_mxn`) vs SUM(`prospectos.valor_estimado_mxn`) por mes.

**Dashboard UI:** muestra las 4 vistas + un exportable CSV basico.

---

## 5. Fases de desarrollo

Cada fase tiene: **entradas**, **salidas verificables**, **DoD (Definition of Done)**.

### Fase 0 — Definicion

**Entradas:** este documento, reuniones con equipo comercial.

**Salidas:**
- `docs/crm/fase-0-contrato.md` con etapas finales firmadas.
- Catalogo de campos obligatorios del prospecto.
- Reglas de scoring calibradas con datos reales (no inventadas).
- Lista de campos que faltan en `prospectos` (si los hay) con justificacion.

**DoD:**
- Documento firmado por director editorial y comercial.
- No hay campos nuevos requeridos sin justificacion documentada.

---

### Fase 1 — Modelo de datos

**Entradas:** Salidas de Fase 0.

**Tareas:**
- Crear migracion `002_crm_extendido.sql` con:
  - Tablas `prospecto_actividades` y `prospecto_tareas` (schemas en §4.3 y §4.4).
  - Trigger SQL que registra `cambio_estado` en `prospecto_actividades` al cambiar `prospectos.estado_pipeline`.
  - Vistas `v_pipeline_por_etapa`, `v_conversion_periodo`, `v_tiempo_por_etapa`, `v_ingresos_vs_estimado`.
  - Indices en `prospecto_actividades(prospecto_id, fecha_evento DESC)` y `prospecto_tareas(responsable_id, completada, fecha_vencimiento)`.
- Script de backfill: si existen prospectos en Notion sin `notion_crm_id`, marcar para revision manual.

**DoD:**
- Migracion corre limpio en DB de staging.
- Las 4 vistas devuelven resultados coherentes con datos seed.
- Trigger de cambio_estado probado (UPDATE manual -> INSERT en actividades).
- Indice usado en `EXPLAIN` para query tipica de timeline.

---

### Fase 2 — UX del pipeline

**Entradas:** Modelo de datos de Fase 1.

**Tareas:**
- Pantalla `/crm` con tablero Kanban (7 columnas).
- Drag & drop actualiza `prospectos.estado_pipeline` via PATCH.
- Vista lista conmutables (toggle tablero/lista).
- Ficha lateral o modal del prospecto con campos de §4.2.
- Filtros: responsable, etapa, score, fecha_proximo_contacto.

**Stack sugerido:** frontend existente (`apps/web`) para el backoffice CRM (definir ruta, ej. `/admin/crm`). No romper sitio publico.

**DoD:**
- Crear prospecto nuevo y verlo en tablero en <30 segundos.
- Mover entre etapas por drag sin recargar pagina.
- Filtros combinables funcionan.
- Responsive: tablero legible en tablet (minimo 768px), scroll horizontal en mobile.

---

### Fase 3 — Automatizacion

**Entradas:** UX de Fase 2.

**Tareas:**
- Implementar reglas de creacion automatica de tareas (ver §4.4).
- Job diario (cron o pg_cron si disponible) que marca tareas vencidas como `vencida` (campo derivado en vista).
- Recordatorios: 24h antes y el dia del vencimiento (notificacion in-app via `notificaciones`).
- Sugerencia de siguiente accion en la ficha del prospecto basada en etapa y dias sin actividad.
- Trigger de actualizacion de score al insertar actividad.

**DoD:**
- Crear prospecto -> tarea `contactar` aparece automaticamente.
- Propuesta enviada -> tarea `seguimiento_post_propuesta` aparece 7 dias despues.
- Notificacion llega al responsable en `/admin/crm/notificaciones`.
- Score se actualiza en UI tras registrar actividad (sin recargar).

---

### Fase 4 — Reportes y control

**Entradas:** Datos y automatizaciones de Fase 3.

**Tareas:**
- Pantalla `/crm/reportes` con las 4 vistas de §4.6.
- Filtro por rango de fechas y responsable.
- Exportable CSV de cada vista.
- Vista de contratos activos con monto, fecha_fin, dias para vencer.
- Indicador de cobertura: % de prospectos con `fecha_proximo_contacto` vencida.

**DoD:**
- Reportes cargan en <2 segundos con 1000 prospectos seed.
- CSV se genera con headers correctos y encoding UTF-8.
- Contratos activos muestran badge rojo cuando `fecha_fin - today < 30d`.

---

### Fase 5 — Pruebas y ajuste

**Entradas:** Producto completo de Fases 1-4.

**Tareas (ver §6 para detalle):**
- Pruebas funcionales, de negocio y de usabilidad.
- Ajustar scoring con datos reales (si el rango de salida es muy comprimido o muy disperso, recalibrar pesos).
- Ajustar etapas si el flujo real no encaja (agregar/quitar con justificacion).

**DoD:**
- Todos los casos de prueba de §6 pasan.
- Sin errores 500 en logs del backend durante 5 dias de uso real.
- Equipo comercial firma aceptacion.

---

## 6. Plan de pruebas

### 6.1 Pruebas funcionales (checklist)

| # | Caso | Resultado esperado | OK |
|---|------|--------------------|----|
| F1 | Crear prospecto con campos minimos. | Aparece en etapa `identificado` del tablero. | [ ] |
| F2 | Crear prospecto sin `nombre_contacto`. | Se permite (es opcional), pero ficha muestra aviso. | [ ] |
| F3 | Mover prospecto de etapa por drag. | Estado actualizado, actividad `cambio_estado` registrada con timestamp y usuario. | [ ] |
| F4 | Crear propuesta desde ficha. | Propuesta vinculada al prospecto, etapa NO cambia a `propuesta_enviada` hasta marcar `enviada_en`. | [ ] |
| F5 | Marcar propuesta como aceptada. | Prospecto pasa a `cerrado_ganado`, contrato se puede crear. | [ ] |
| F6 | Registrar actividad manual (llamada). | Aparece en timeline en orden cronologico inverso. | [ ] |
| F7 | Asignar tarea con vencimiento manana. | Aparece en cola del responsable. | [ ] |
| F8 | Filtrar tablero por responsable X. | Solo muestra prospectos de X. | [ ] |
| F9 | Filtrar por score `Alta`. | Solo muestra prospectos con score >=70. | [ ] |
| F10 | Buscar prospecto por nombre empresa. | Resultados en <500ms. | [ ] |

### 6.2 Pruebas de negocio

| # | Caso | Resultado esperado | OK |
|---|------|--------------------|----|
| N1 | Trazabilidad oportunidad -> contrato. | Cada `contratos_comerciales` con `propuesta_id` resuelve a un `prospecto_id` unico. | [ ] |
| N2 | No duplicar prospectos. | DB constraint UNIQUE o validacion al insertar por `(nombre_empresa, email_contacto)`. | [ ] |
| N3 | Score consistente. | Para los mismos inputs, score estable entre recargas (calculo deterministico). | [ ] |
| N4 | Reportes coherentes. | `v_ingresos_vs_estimado` mes a mes cuadra con conteo manual de contratos. | [ ] |
| N5 | Cambio de etapa sin actividad. | Imposible: trigger SQL fuerza INSERT en `prospecto_actividades`. | [ ] |

### 6.3 Pruebas de usabilidad

| # | Caso | Criterio | OK |
|---|------|----------|----|
| U1 | Tablero entendible. | Usuario nuevo entiende el flujo en <1 min (test con 3 personas). | [ ] |
| U2 | Siguiente accion visible. | Cada card muestra `fecha_proximo_contacto` y responsable. | [ ] |
| U3 | Tareas pendientes obvias. | Cola de tareas muestra badge con conteo en nav. | [ ] |
| U4 | Velocidad desktop. | Cualquier accion (mover, crear, registrar) <2s. | [ ] |
| U5 | Velocidad mobile. | Tablero scrollea y permite mover en viewport 375px. | [ ] |

---

## 7. Criterios de exito

| Criterio | Metrica | Meta |
|----------|---------|------|
| Pipeline entendible | Tiempo hasta primera accion de un usuario nuevo. | <5 min. |
| Trazabilidad completa | % de contratos con `propuesta_id` no nulo. | 100%. |
| Conversion medible | Reportes generados automaticamente sin SQL manual. | Si. |
| Reduccion de prospectos perdidos | Prospectos en `inactivo` por mes. | <10% del pipeline activo. |
| Adopcion del equipo | % del equipo comercial que usa el CRM diariamente. | >80% en 30 dias post-launch. |

---

## 8. Punto de partida tecnico (contrato de datos)

**Tablas existentes (base, NO modificar su estructura salvo Fase 1):**
- `prospectos` — `001_initial_schema.sql:247`
- `propuestas_comerciales` — `001_initial_schema.sql:271`
- `contratos_comerciales` — `001_initial_schema.sql:288`
- `patrocinadores` — `001_initial_schema.sql:47`
- `usuarios` — `001_initial_schema.sql:62`

**Vistas existentes reutilizables:**
- `v_pipeline_comercial` — `001_initial_schema.sql:533` (ya muestra pipeline activo con dias sin actualizar).

**Tablas a crear en Fase 1:**
- `prospecto_actividades` (schema en §4.3).
- `prospecto_tareas` (schema en §4.4).

**Vistas a crear en Fase 1:**
- `v_pipeline_por_etapa`, `v_conversion_periodo`, `v_tiempo_por_etapa`, `v_ingresos_vs_estimado` (ver §4.6).

---

## 9. Regla de diseno

**Pipedrive manda en simplicidad. HubSpot manda en automatizacion.**

Si una funcion complica el flujo diario sin aportar conversion, **no entra en Fase 1**. Se propone, se discute, y se agrega despues solo con caso de uso documentado.

**Principio adicional:** nada de campos speculative. Si un campo no se usa en una vista o filtro, no se persiste. YAGNI aplica.