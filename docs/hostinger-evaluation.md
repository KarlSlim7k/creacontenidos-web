# Evaluación Hostinger VPS — KVM 2 + KVM 4

## Plan de Lanzamiento — CREA Contenidos (Anexo)

> Documento creado: 30 de marzo 2026
> Estado: Evaluación técnica
> Fuente: hostinger.com (datos oficiales marzo 2026)
> Tipo de cambio referencia: 1 USD = $17.50 MXN

---

## 1. Hostinger — Datos Generales del Proveedor

| Campo | Detalle |
|---|---|
| **Proveedor** | Hostinger |
| **Fundado** | 2004 (+21 años de experiencia) |
| **Usuarios** | 4+ millones de sitios web |
| **Datacenters** | Norteamérica, Sudamérica, Europa, Asia |
| **Panel** | hPanel (panel propietario) |
| **Soporte** | 24/7 chat en vivo, base de conocimiento, tutoriales en video |
| **SLA** | 99.9% uptime |
| **Garantía** | 30 días de devolución |
| **Servidores** | AMD EPYC, NVMe SSD, red 1 Gbps |
| **Virtualización** | KVM (Kernel-based Virtual Machine) — recursos 100% dedicados |
| **Ratings** | Google 4.8/5 (1,237 reseñas), HostAdvice 4.6/5 (2,432), WPBeginner 4.7 (874) |
| **Soporte en español** | ✅ Sí (hostinger.com/mx) |

---

## 2. Por qué VPS y no Shared Hosting

Los planes de shared/cloud hosting de Hostinger (incluyendo Business) **no sirven para la arquitectura de CREA Contenidos** por limitaciones fundamentales:

| Limitación | Impacto |
|---|---|
| Sin PostgreSQL | La arquitectura especifica PostgreSQL como base canónica |
| Sin Docker | No se pueden desplegar contenedores para los 9 microservicios |
| Sin acceso root | No se puede instalar RabbitMQ, NATS, ni configurar el servidor |
| Node.js limitado | Solo 5 apps gestionadas, no procesos persistentes event-driven |
| Recursos compartidos | RAM y CPU no son dedicados, rendimiento impredecible |

**Los VPS KVM resuelven todo esto**: recursos dedicados, acceso root, Docker nativo, cualquier tecnología instalable.

---

## 3. VPS KVM 2 — Plan de Inicio (MVP / Phase 1-2)

### 3.1 Especificaciones

| Recurso | Valor |
|---|---|
| **vCPU cores** | **2 dedicados** |
| **Memoria RAM** | **8 GB dedicada** |
| **Almacenamiento** | **100 GB NVMe SSD** |
| **Ancho de banda** | **8 TB/mes** |
| **Red** | 1 Gbps |
| **IPv4 / IPv6** | 1 cada una |
| **Inodes** | Ilimitados |
| **I/O** | 300 MB/s |
| **Procesador** | AMD EPYC |
| **Backups** | Semanales gratuitos + snapshots manuales |
| **Dominio gratis** | ✅ 1 año |
| **API** | ✅ Hostinger API pública |
| **AI assistant** | ✅ Integrado (MCP-powered) |

### 3.2 Precios

| Período | Precio mensual | Total a pagar | En MXN (total) |
|---|---|---|---|
| **Promo (24 meses)** | $8.99/mo | **$215.76 USD** | **$3,776 MXN** |
| **Renovación (24 meses)** | $14.99/mo | **$359.76 USD** | **$6,296 MXN** |
| **Anual (promo)** | $8.99/mo | **$107.88 USD/año** | **$1,888 MXN/año** |
| **Anual (renovación)** | $14.99/mo | **$179.88 USD/año** | **$3,148 MXN/año** |

### 3.3 Capacidad Estimada de Usuarios

| Rol | Cantidad estimada | Notas |
|---|---|---|
| **Usuarios lectores** | ~5,000-10,000/mo | Tráfico web estático + API lectura |
| **Editores** | 3-5 | Revisión y aprobación de contenidos |
| **Colaboradores** | 10-20 | Envío de ideas, contribuciones |
| **Administradores** | 2-3 | Gestión de plataforma |
| **Soporte** | 1-2 | Atención vía WhatsApp/Telegram |
| **Comercial** | 2-3 | Gestión de sponsors y leads |
| **OpenClaw (agente IA)** | 1 | Orquestación 24/7 |
| **Total usuarios con acceso** | **~20-35** | Concurrentes reales: mucho menos |

### 3.4 Qué Corre en Este Servidor

```
┌─────────────────────────────────────────────┐
│  VPS KVM 2 — 2 vCPU / 8 GB RAM / 100 GB    │
│  Ubuntu 24.04 + Docker + Docker Compose     │
│                                              │
│  Infraestructura:                            │
│  ├── PostgreSQL (Docker)        ~1.5 GB     │
│  ├── RabbitMQ (Docker)          ~0.5 GB     │
│  ├── Redis (Docker)             ~0.5 GB     │
│  ├── Nginx (reverse proxy)      ~0.2 GB     │
│                                              │
│  Microservicios:                             │
│  ├── ingest-gateway             ~0.3 GB     │
│  ├── radar-context              ~0.3 GB     │
│  ├── content-orchestrator       ~0.5 GB     │
│  ├── editorial-control          ~0.3 GB     │
│  ├── publication-hub            ~0.3 GB     │
│  ├── metrics-analytics          ~0.3 GB     │
│  ├── commercial-intel           ~0.2 GB     │
│  ├── collaborator-gamification  ~0.2 GB     │
│  ├── openclaw-runtime           ~0.5 GB     │
│                                              │
│  Frontend:                                   │
│  └── CREA web (estático/Nginx)  ~0.2 GB     │
│                                              │
│  Monitoreo:                                  │
│  ├── Uptime Kuma                ~0.3 GB     │
│  └── Grafana (opcional)         ~0.5 GB     │
│                                              │
│  Total estimado: ~7.0 GB / 8 GB             │
│  Disco estimado: ~25-40 GB / 100 GB         │
└─────────────────────────────────────────────┘
```

### 3.5 Veredicto KVM 2

> **Suficiente para MVP y Phase 1-3.** Los 8 GB RAM dedicados y 2 vCPU AMD EPYC pueden manejar todos los 9 microservicios + PostgreSQL + RabbitMQ + OpenClaw + frontend + monitoreo. El cuello de botella potencial son los 100 GB de disco si se almacena mucho multimedia local.

---

## 4. VPS KVM 4 — Plan de Escalamiento (Phase 3+)

### 4.1 Especificaciones

| Recurso | Valor |
|---|---|
| **vCPU cores** | **4 dedicados** |
| **Memoria RAM** | **16 GB dedicada** |
| **Almacenamiento** | **200 GB NVMe SSD** |
| **Ancho de banda** | **16 TB/mes** |
| **Red** | 1 Gbps |
| **IPv4 / IPv6** | 1 cada una |
| **Inodes** | Ilimitados |
| **I/O** | 300 MB/s |
| **Procesador** | AMD EPYC |
| **Backups** | Semanales gratuitos + snapshots manuales |
| **Dominio gratis** | ✅ 1 año |
| **API** | ✅ Hostinger API pública |
| **AI assistant** | ✅ Integrado (MCP-powered) |

### 4.2 Precios

| Período | Precio mensual | Total a pagar | En MXN (total) |
|---|---|---|---|
| **Promo (24 meses)** | $12.99/mo | **$311.76 USD** | **$5,456 MXN** |
| **Renovación (24 meses)** | $28.99/mo | **$695.76 USD** | **$12,176 MXN** |
| **Anual (promo)** | $12.99/mo | **$155.88 USD/año** | **$2,728 MXN/año** |
| **Anual (renovación)** | $28.99/mo | **$347.88 USD/año** | **$6,088 MXN/año** |

### 4.3 Capacidad Estimada de Usuarios (Escalado)

| Rol | Cantidad estimada | Notas |
|---|---|---|
| **Usuarios lectores** | ~25,000-50,000/mo | Tráfico web + API + push notifications |
| **Editores** | 5-10 | Múltiples secciones, validación doble |
| **Colaboradores** | 30-50 | Red de colaboradores regional expandida |
| **Administradores** | 3-5 | Gestión avanzada, analytics |
| **Soporte** | 2-4 | Múltiples canales, horarios extendidos |
| **Comercial** | 3-5 | CRM activo, campañas de sponsors |
| **OpenClaw (agente IA)** | 1-2 | Orquestación + agentes especializados |
| **Total usuarios con acceso** | **~50-80** | Concurrentes reales: ~10-20 |

### 4.4 Qué Corre en Este Servidor

```
┌──────────────────────────────────────────────┐
│  VPS KVM 4 — 4 vCPU / 16 GB RAM / 200 GB    │
│  Ubuntu 24.04 + Docker + Docker Compose      │
│                                               │
│  Infraestructura (más robusta):              │
│  ├── PostgreSQL (Docker)         ~3 GB       │
│  ├── RabbitMQ (Docker)           ~1 GB       │
│  ├── Redis (Docker)              ~1 GB       │
│  ├── Nginx (reverse proxy)       ~0.3 GB     │
│  ├── Elasticsearch (búsqueda)    ~2 GB       │
│                                               │
│  Microservicios (con réplicas):              │
│  ├── ingest-gateway (x2)         ~0.6 GB     │
│  ├── radar-context (x2)          ~0.6 GB     │
│  ├── content-orchestrator (x2)   ~1 GB       │
│  ├── editorial-control           ~0.3 GB     │
│  ├── publication-hub             ~0.3 GB     │
│  ├── metrics-analytics           ~0.5 GB     │
│  ├── commercial-intel            ~0.3 GB     │
│  ├── collaborator-gamification   ~0.3 GB     │
│  ├── openclaw-runtime            ~0.5 GB     │
│                                               │
│  Frontend:                                   │
│  └── CREA web (estático/Nginx)   ~0.3 GB     │
│                                               │
│  Monitoreo y ops:                            │
│  ├── Uptime Kuma               ~0.3 GB       │
│  ├── Grafana + Prometheus      ~1 GB         │
│  └── GitLab CI (opcional)      ~1 GB         │
│                                               │
│  Total estimado: ~14.5 GB / 16 GB            │
│  Disco estimado: ~50-80 GB / 200 GB          │
└──────────────────────────────────────────────┘
```

### 4.5 Cuándo Migrar de KVM 2 a KVM 4

| Señal | Acción |
|---|---|
| RAM consistentemente > 85% | Migrar a KVM 4 |
| CPU > 70% sostenido | Migrar a KVM 4 |
| Disco > 70 GB usado | Migrar a KVM 4 o agregar S3 externo |
| +20 usuarios admin/editores activos | Migrar a KVM 4 |
| Tráfico > 15,000 visitas/mes | Migrar a KVM 4 |
| Necesidad de Elasticsearch | Migrar a KVM 4 |
| Múltiples agentes OpenClaw | Migrar a KVM 4 |

### 4.6 Veredicto KVM 4

> **El salto natural cuando CREA Contenidos crece.** Duplica CPU, duplica RAM y disco. Permite réplicas de microservicios críticos, agregar Elasticsearch para búsqueda editorial, y soportar una red de 50+ colaboradores con tráfico de 25,000+ visitas mensuales. El upgrade es directo desde hPanel sin migración manual.

---

## 5. OpenClaw Integrado

Hostinger ofrece **OpenClaw con 1-click install** en todos los VPS KVM. Para CREA Contenidos hay dos enfoques:

### Opción A: OpenClaw en el mismo VPS (Recomendada)

- Se instala como un contenedor Docker más dentro del Docker Compose
- **Costo adicional**: $0
- **Ventaja**: Todo centralizado, comunicación interna por red Docker (más rápida y segura)
- **RAM usada**: ~500 MB adicionales

### Opción B: OpenClaw Managed (Separado)

| Plan | Precio Promo | Renovación |
|---|---|---|
| **Managed OpenClaw** | $5.99/mo ($143.76/2 años) | $11.99/mo |
| **Self-managed (KVM 2 pre-config)** | $8.99/mo ($215.76/2 años) | $14.99/mo |

- **Ventaja**: Zero maintenance, AI credits incluidos, dashboard visual
- **Desventaja**: Costo adicional, separado del backend

**Recomendación**: Opción A. Los 8 GB del KVM 2 sobran para OpenClaw y ahorras $5.99-8.99/mo.

---

## 6. Comparativa KVM 2 vs KVM 4

| Característica | KVM 2 | KVM 4 | Diferencia |
|---|---|---|---|
| **vCPU** | 2 | 4 | 2x más |
| **RAM** | 8 GB | 16 GB | 2x más |
| **Disco** | 100 GB NVMe | 200 GB NVMe | 2x más |
| **Bandwidth** | 8 TB/mo | 16 TB/mo | 2x más |
| **Promo (24 meses)** | $215.76 USD | $311.76 USD | +$96 USD |
| **Anual promo** | $107.88 USD | $155.88 USD | +$48 USD |
| **Anual promo MXN** | ~$1,888 MXN | ~$2,728 MXN | +$840 MXN |
| **Renovación anual** | $179.88 USD | $347.88 USD | +$168 USD |
| **Renovación anual MXN** | ~$3,148 MXN | ~$6,088 MXN | +$2,940 MXN |
| **Usuarios lectores** | ~10,000/mo | ~50,000/mo | 5x más |
| **Usuarios admin** | ~20-35 | ~50-80 | 2-3x más |
| **Microservicios** | 1 instancia c/u | Réplicas posibles | Alta disponibilidad |
| **Búsqueda** | PostgreSQL full-text | Elasticsearch | Mejor UX editorial |

---

## 7. Costo Total por Escenario

### Escenario 1: Solo KVM 2 (MVP — Recomendado para inicio)

| Componente | USD/año (promo) | MXN/año (promo) |
|---|---|---|
| VPS KVM 2 | $107.88 | ~$1,888 |
| Dominio creacontenidos.com | Gratis (1er año) | $0 |
| **Total** | **$107.88** | **~$1,888** |

| Componente | USD/año (renovación) | MXN/año (renovación) |
|---|---|---|
| VPS KVM 2 | $179.88 | ~$3,148 |
| Dominio creacontenidos.com | ~$15.99 | ~$280 |
| **Total** | **$195.87** | **~$3,428** |

### Escenario 2: Solo KVM 4 (Producción escalada)

| Componente | USD/año (promo) | MXN/año (promo) |
|---|---|---|
| VPS KVM 4 | $155.88 | ~$2,728 |
| Dominio creacontenidos.com | Gratis (1er año) | $0 |
| **Total** | **$155.88** | **~$2,728** |

| Componente | USD/año (renovación) | MXN/año (renovación) |
|---|---|---|
| VPS KVM 4 | $347.88 | ~$6,088 |
| Dominio creacontenidos.com | ~$15.99 | ~$280 |
| **Total** | **$363.87** | **~$6,368** |

### Escenario 3: KVM 2 + OpenClaw Managed (Separado)

| Componente | USD/año (promo) | MXN/año (promo) |
|---|---|---|
| VPS KVM 2 | $107.88 | ~$1,888 |
| Managed OpenClaw | $71.88 | ~$1,258 |
| Dominio | Gratis (1er año) | $0 |
| **Total** | **$179.76** | **~$3,146** |

---

## 8. Arquitectura Recomendada

### Fase 1-2: KVM 2 (MVP)

```
┌──────────────────────────────────────────────────┐
│  HOSTINGER VPS KVM 2 — $8.99/mo                  │
│  Datacenter: USA (menor latencia a México)       │
│                                                   │
│  ┌────────────────────────────────────────────┐   │
│  │  Docker Compose                             │   │
│  │                                             │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │   │
│  │  │PostgreSQL│  │ RabbitMQ │  │  Redis   │  │   │
│  │  └──────────┘  └──────────┘  └──────────┘  │   │
│  │                                             │   │
│  │  ┌──────────────────────────────────┐       │   │
│  │  │  9 Microservicios + OpenClaw     │       │   │
│  │  │  ingest-gateway                  │       │   │
│  │  │  radar-context                   │       │   │
│  │  │  content-orchestrator            │       │   │
│  │  │  editorial-control               │       │   │
│  │  │  publication-hub                 │       │   │
│  │  │  metrics-analytics               │       │   │
│  │  │  commercial-intel                │       │   │
│  │  │  collaborator-gamification       │       │   │
│  │  │  openclaw-runtime                │       │   │
│  │  └──────────────────────────────────┘       │   │
│  │                                             │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │   │
│  │  │  Nginx   │  │ Uptime   │  │ Frontend │  │   │
│  │  │ (proxy)  │  │  Kuma    │  │  estático│  │   │
│  │  └──────────┘  └──────────┘  └──────────┘  │   │
│  └────────────────────────────────────────────┘   │
│                                                    │
│  Dominio: creacontenidos.com (gratis 1er año)     │
│  SSL: Let's Encrypt (automático)                  │
└──────────────────────────────────────────────────┘
```

### Fase 3+: KVM 4 (Escalamiento)

```
┌──────────────────────────────────────────────────┐
│  HOSTINGER VPS KVM 4 — $12.99/mo                 │
│  Datacenter: USA (menor latencia a México)       │
│                                                   │
│  ┌────────────────────────────────────────────┐   │
│  │  Docker Compose (con réplicas)             │   │
│  │                                             │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │   │
│  │  │PostgreSQL│  │ RabbitMQ │  │  Redis   │  │   │
│  │  └──────────┘  └──────────┘  └──────────┘  │   │
│  │                                             │   │
│  │  ┌──────────────────────────────────┐       │   │
│  │  │  ingest-gateway (x2 réplicas)    │       │   │
│  │  │  radar-context (x2 réplicas)     │       │   │
│  │  │  content-orchestrator (x2)       │       │   │
│  │  │  editorial-control               │       │   │
│  │  │  publication-hub                 │       │   │
│  │  │  metrics-analytics               │       │   │
│  │  │  commercial-intel                │       │   │
│  │  │  collaborator-gamification       │       │   │
│  │  │  openclaw-runtime                │       │   │
│  │  └──────────────────────────────────┘       │   │
│  │                                             │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │   │
│  │  │Elastic   │  │ Grafana  │  │ Frontend │  │   │
│  │  │search    │  │+Prometheu│  │  estático│  │   │
│  │  └──────────┘  └──────────┘  └──────────┘  │   │
│  └────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

---

## 9. Roadmap de Implementación

### Semana 1 — Setup Inicial
- [x] Crear cuenta en Hostinger
- [x] Comprar VPS KVM 2 (datacenter USA)
- [x] Registrar dominio creacontenidos.com (gratis 1er año)
- [x] Configurar DNS en Hostinger
- [x] Instalar Ubuntu 24.04 LTS
- [x] Configurar SSH keys y firewall (UFW)

### Semana 2 — Infraestructura Base
- [ ] Instalar Docker + Docker Compose
- [ ] Configurar PostgreSQL (Docker, con volumen persistente)
- [ ] Configurar RabbitMQ (Docker)
- [ ] Configurar Redis (Docker)
- [ ] Configurar Nginx como reverse proxy
- [ ] Configurar SSL con Let's Encrypt (Certbot)
- [ ] Script de backups diarios (pg_dump + rsync a externo)
- [ ] Configurar snapshots semanales desde hPanel

### Semana 3 — Microservicios
- [ ] Desplegar ingest-gateway (webhooks WhatsApp/Telegram)
- [ ] Desplegar radar-context
- [ ] Desplegar content-orchestrator
- [ ] Desplegar editorial-control (panel web)
- [ ] Desplegar publication-hub
- [ ] Desplegar metrics-analytics
- [ ] Desplegar commercial-intel
- [ ] Desplegar collaborator-gamification
- [ ] Desplegar openclaw-runtime
- [ ] Configurar Docker Compose completo con redes y volúmenes

### Semana 4 — Frontend + Monitoreo + Pruebas
- [ ] Servir frontend estático desde Nginx
- [ ] Instalar Uptime Kuma (monitoreo)
- [ ] Configurar alertas (email/Telegram)
- [ ] Conectar webhooks de WhatsApp y Telegram
- [ ] Pruebas de carga (k6 o similar)
- [ ] Pruebas de fallback (cloud model outage, queue backlog)
- [ ] Documentar runbooks operativos

---

## 10. Notas de Riesgo y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| **Servidor único = punto único de fallo** | Media | Alto | Backups diarios automatizados a externo, snapshots semanales, plan de migración a KVM 4 |
| **100 GB se llena con multimedia** | Media | Medio | Monitorear disco, usar S3/Wasabi externo para archivos grandes, limpiar logs y Docker images viejos |
| **2 vCPU insuficiente en pico** | Baja | Medio | Upgrade a KVM 4 desde hPanel sin migración manual (solo reboot) |
| **Renovación KVM 4 a $28.99/mo** | Alta | Medio | Presupuesto anual $348 USD. Si es muy alto, evaluar Hetzner o DigitalOcean como alternativa |
| **Soporte no ayuda con configuración de apps** | Alta | Bajo | Documentación propia, tutoriales de Hostinger, comunidad Docker |
| **Backups solo semanales nativos** | Media | Alto | Script propio de backups diarios de PostgreSQL + archivos críticos a S3/Wasabi |
| **Crecimiento de usuarios admin** | Media | Bajo | KVM 2 soporta ~35 usuarios con acceso. Si crece más, migrar a KVM 4 |

---

## 11. Resumen Ejecutivo

| Aspecto | Evaluación |
|---|---|
| **¿VPS KVM 2 sirve para todo?** | ✅ Sí. 8 GB RAM dedicados, 2 vCPU, 100 GB NVMe, Docker, PostgreSQL, OpenClaw 1-click |
| **¿Cuándo pasar a KVM 4?** | Cuando RAM > 85%, CPU > 70%, disco > 70 GB, o tráfico > 15,000 visitas/mes |
| **¿OpenClaw en el mismo VPS?** | ✅ Sí, recomendado. Ahorra $5.99-8.99/mo vs managed separado |
| **Costo mínimo (KVM 2, promo)** | $107.88 USD/año (~$1,888 MXN/año) |
| **Costo mínimo (KVM 2, renovación)** | $179.88 USD/año (~$3,148 MXN/año) |
| **Costo escalado (KVM 4, promo)** | $155.88 USD/año (~$2,728 MXN/año) |
| **Costo escalado (KVM 4, renovación)** | $347.88 USD/año (~$6,088 MXN/año) |
| **Dominio** | Gratis 1er año, luego ~$15.99/año (~$280 MXN) |
| **Veredicto** | Mejor relación calidad-precio del mercado para esta arquitectura. Un solo VPS maneja frontend + 9 microservicios + BD + broker + OpenClaw + monitoreo |
