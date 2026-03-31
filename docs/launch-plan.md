# Plan de Lanzamiento — CREA Contenidos

## Infraestructura y Despliegue

> Documento creado: 30 de marzo 2026
> Estado: Borrador de evaluación

---

## 1. Resumen del Proyecto

**CREA Contenidos** es una plataforma de periodismo local asistido por IA para la región Perote-Xalapa-Puebla, Veracruz, México. La arquitectura combina:

- **Frontend**: HTML5/CSS3/JS vanilla (estático, actualmente en Vercel)
- **Backend planificado**: 9 microservicios event-driven (Node.js/Python)
- **Base de datos**: PostgreSQL
- **Message Broker**: RabbitMQ / NATS / Kafka
- **IA híbrida**: Modelo local (Mac mini) + modelo cloud premium
- **Orquestador**: OpenClaw runtime (alojado de forma independiente)
- **Canales de entrada**: WhatsApp, Telegram, Web, API

---

## 2. BanaHosting — Evaluación del Plan Professional

### 2.1 Datos Generales del Proveedor

| Campo | Detalle |
|---|---|
| **Proveedor** | BanaHosting |
| **Fundado** | 2007 (+18 años de experiencia) |
| **Datacenters** | USA y Europa |
| **Panel** | cPanel |
| **Soporte** | 24/7/365 por tickets (respuesta < 10 min) |
| **SLA** | 99.9% uptime garantizado |
| **Garantía** | 30 días de devolución |
| **Servidor** | Dell Enterprise, Intel Xeon E5 (48-96 cores), RAID10 SSD |
| **Red** | 100% Juniper, 10Gbit por servidor, sin punto único de fallo |
| **DDoS** | Protección incluida, automática y en tiempo real |

### 2.2 Plan Bana Professional — Especificaciones

| Recurso | Valor |
|---|---|
| **Precio mensual** | $6.95/mo |
| **Precio anual** | $75.06/año (ahorro 10%) |
| **Precio 3 años** | $200.16 |
| **Sitios web** | ILIMITADOS |
| **Almacenamiento** | 100 GB SSD Ultra |
| **Ancho de banda** | Sin medir (Unmetered) |
| **CPU** | 5.8 GHz |
| **Memoria RAM** | 6 GB DDR4 |
| **Procesos simultáneos** | 35 |
| **Inodes (archivos)** | 750,000 |
| **I/O** | 10,240 KB/s |
| **Bases de datos MySQL** | Ilimitadas |
| **Cuentas de email** | 100 |
| **SSL** | Let's Encrypt gratuito (todos los dominios) |
| **PHP** | Multi-PHP 5.3 a 8.1 |
| **Backups** | Automáticos diarios gratuitos |
| **Migración** | Gratuita (cPanel a cPanel) |
| **IP dedicada** | Opcional, $2/mo |

### 2.3 Tecnologías Incluidas

- **CloudLinux OS** con CageFS (aislamiento de cuentas)
- **LiteSpeed Web Server** con LSCache
- **Softaculous Premium** (250+ scripts, 1-click install)
- **Imunify360 WAF** (firewall con ML)
- **HTTP/2 y HTTP/3**
- **Memcached**
- **Opcode Caching**
- **SSH Terminal** desde cPanel
- **GD Graphics Library, ImageMagick, ionCube**
- **SitePad** (constructor web gratuito)

### 2.4 Veredicto: ¿Sirve para CREA Contenidos?

#### Lo que SÍ puede hacer BanaHosting:

| Uso | Viabilidad |
|---|---|
| **Frontend estático** (HTML/CSS/JS) | ✅ Excelente — LiteSpeed + LSCache es muy rápido para estáticos |
| **WordPress** (si se migra el frontend) | ✅ Excelente — optimizado para WP |
| **Email corporativo** (@creacontenidos.com) | ✅ Hasta 100 cuentas incluidas |
| **Base de datos MySQL/MariaDB** | ✅ Ilimitadas, suficiente para Phase 1-2 |
| **Scripts PHP** (APIs simples) | ✅ PHP 5.3-8.1, hasta 35 procesos |
| **Backups automáticos** | ✅ Incluidos |
| **SSL gratuito** | ✅ Para todos los dominios |

#### Limitaciones importantes:

| Limitación | Impacto en CREA Contenidos |
|---|---|
| **Sin Node.js nativo** | ❌ Los microservicios planificados (ingest-gateway, content-orchestrator, etc.) probablemente usen Node.js. Shared hosting no soporta procesos persistentes Node.js bien |
| **Sin Python para apps web** | ❌ Aunque Python está disponible para scripts CGI, no es adecuado para Flask/Django/FastAPI en producción |
| **Sin PostgreSQL** | ❌ Solo MySQL/MariaDB. La arquitectura de CREA especifica PostgreSQL como base canónica |
| **Sin acceso root** | ❌ No se puede instalar RabbitMQ, NATS, Kafka ni configurar el servidor a medida |
| **RAM limitada (6 GB)** | ⚠️ Compartida con otros usuarios del servidor. Los 35 procesos y 6 GB son límites de CloudLinux, no dedicados |
| **I/O limitado (10 MB/s)** | ⚠️ Puede ser cuello de botella para procesamiento de multimedia/IA |
| **Sin Docker/contenedores** | ❌ La arquitectura de microservicios requiere contenedores o al menos gestión independiente de procesos |

#### Conclusión sobre BanaHosting:

> **BanaHosting Professional es una excelente opción para alojar el FRONTEND estático de CREA Contenidos** (el sitio web HTML/CSS/JS), email corporativo, y bases de datos MySQL auxiliares. Sin embargo, **NO es adecuado para los microservicios backend** que requiere la arquitectura event-driven. Los microservicios necesitarán un proveedor con soporte para Node.js/Python, PostgreSQL, Docker y message brokers.

**Recomendación**: Usar BanaHosting como hosting del frontend + email, y un proveedor cloud separado para los microservicios y OpenClaw.

---

## 3. Dominio: creacontenidos.com

### 3.1 Precios de Registro .com por Proveedor (2026)

| Proveedor | Registro (1er año) | Renovación anual | Transferencia | Privacidad WHOIS | Notas |
|---|---|---|---|---|---|
| **Cloudflare** | ~$9.77 | ~$9.77 | ~$9.77 | ✅ Gratis | Precio de costo, sin markup. El más barato a largo plazo |
| **Porkbun** | ~$9.73 | ~$10.29 | Gratis | ✅ Gratis | Interfaz divertida, precios transparentes, muy recomendado |
| **Namecheap** | ~$6.79 (promo) | ~$14.98 | Gratis | ✅ Gratis | Excelente soporte, primera año muy barato |
| **BanaHosting** | ~$12.95 | ~$12.95 | Gratis | ✅ Gratis | Conveniente si ya se usa BanaHosting |
| **GoDaddy** | ~$4.99 (promo) | ~$21.99 | ~$9.99 | ❌ Pago extra | Primer año barato, renovación cara, upsells agresivos |
| **Google Domains** | N/A | N/A | N/A | N/A | ⚠️ Cerrado, migrado a Squarespace |
| **Hostinger** | ~$8.99 | ~$15.99 | Gratis | ✅ Gratis | Bueno si ya se usa Hostinger para hosting |

### 3.2 Recomendación de Dominio

> **Opción 1 (mejor precio a largo plazo)**: Cloudflare — precio de costo sin markup (~$9.77/año siempre), DNS ultra-rápido, seguridad integrada.
>
> **Opción 2 (mejor equilibrio)**: Porkbun — precios justos, sin trucos, interfaz limpia, privacidad gratis.
>
> **Opción 3 (conveniencia)**: Si se usa BanaHosting para el frontend, registrar ahí mismo el dominio para tener todo centralizado (~$12.95/año).

---

## 4. Arquitectura de Despliegue Recomendada

Dado que CREA Contenidos tiene dos capas con necesidades muy diferentes, se recomienda una **arquitectura de despliegue dual**:

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND (Web)                    │
│  HTML/CSS/JS estático + páginas                     │
│  Opción A: Vercel (actual) — Gratis                 │
│  Opción B: BanaHosting Professional — $6.95/mo      │
│  Opción C: Cloudflare Pages — Gratis                │
└─────────────────────────────────────────────────────┘
                         │
                         │ DNS → creacontenidos.com
                         │
┌─────────────────────────────────────────────────────┐
│                  BACKEND (Microservicios)            │
│  9 servicios event-driven + PostgreSQL + Broker     │
│  Opción A: DigitalOcean Droplet(s)                  │
│  Opción B: Hetzner Cloud                            │
│  Opción C: Railway / Render                         │
│  Opción D: AWS Lightsail                            │
└─────────────────────────────────────────────────────┘
                         │
                         │ API / Webhooks
                         │
┌─────────────────────────────────────────────────────┐
│              OPENCLAW (IA Orquestador)               │
│  Independiente — Mac mini local o VPS separado      │
│  Conectado vía API/webhooks al backend              │
└─────────────────────────────────────────────────────┘
```

---

## 5. Alternativas de Hosting para Microservicios Backend

### 5.1 DigitalOcean

| Campo | Detalle |
|---|---|
| **Plan recomendado** | Droplet Basic 2 vCPU / 2GB RAM |
| **Precio** | $12/mo |
| **Almacenamiento** | 50 GB SSD |
| **Transferencia** | 2 TB |
| **Ventajas** | Docker nativo, PostgreSQL managed ($15/mo extra), snapshots, API excelente, documentación de primera |
| **Desventajas** | Precio sube con Managed DB, sin panel tipo cPanel |
| **Ideal para** | Microservicios con Docker + PostgreSQL |

**DigitalOcean App Platform** (PaaS, sin gestionar servidores):
- Desde $5/mo (basic), $12/mo (professional)
- Deploy directo desde GitHub
- Soporte nativo Node.js, Python, Go
- PostgreSQL managed integrado
- **Recomendado para CREA** si no se quiere gestionar infraestructura

### 5.2 Hetzner Cloud

| Campo | Detalle |
|---|---|
| **Plan recomendado** | CX22 (2 vCPU, 4GB RAM) |
| **Precio** | ~€4.51/mo (~$5/mo) |
| **Almacenamiento** | 40 GB NVMe |
| **Transferencia** | 20 TB |
| **Datacenters** | Alemania, Finlandia, USA (Ashburn, Hillsboro) |
| **Ventajas** | Mejor relación calidad-precio del mercado, NVMe, red excelente |
| **Desventajas** | Soporte limitado (solo tickets), menos servicios managed que DO |
| **Ideal para** | Quien quiere máximo rendimiento al mínimo costo y sabe gestionar servidores |

### 5.3 Railway

| Campo | Detalle |
|---|---|
| **Modelo** | Pay-as-you-go (crédito $5 gratis/mo) |
| **Precio estimado** | $5-20/mo dependiendo del uso |
| **Ventajas** | Deploy ultra-simple, PostgreSQL incluido, variables de entorno, preview deploys, soporte para Node.js/Python/Docker |
| **Desventajas** | Sin plan fijo (puede variar), sleep en plan free |
| **Ideal para** | Prototipado rápido y MVP de microservicios |

### 5.4 Render

| Campo | Detalle |
|---|---|
| **Plan recomendado** | Starter ($7/mo por servicio) |
| **PostgreSQL** | Desde $7/mo |
| **Ventajas** | Deploy desde GitHub, SSL automático, preview environments, soporte Node.js/Python/Docker |
| **Desventajas** | Cada servicio se cobra por separado (9 servicios = costoso) |
| **Ideal para** | Servicios individuales, no ideal para arquitectura de 9 microservicios |

### 5.5 AWS Lightsail

| Campo | Detalle |
|---|---|
| **Plan recomendado** | $10/mo (2 vCPU, 2GB RAM, 60GB SSD) |
| **Ventajas** | Ecosistema AWS, PostgreSQL managed disponible, escalable a EC2/ECS |
| **Desventajas** | Complejidad de AWS, puede ser confuso para principiantes |
| **Ideal para** | Quien planea escalar a AWS completo en el futuro |

### 5.6 Comparativa de Alternativas

| Proveedor | Precio/mo | Node.js | Python | PostgreSQL | Docker | Facilidad | Soporte |
|---|---|---|---|---|---|---|---|
| **DigitalOcean App Platform** | $12+ | ✅ | ✅ | ✅ Managed | ✅ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **DigitalOcean Droplet** | $12+ | ✅ | ✅ | ✅ (self) | ✅ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Hetzner Cloud** | $5+ | ✅ | ✅ | ✅ (self) | ✅ | ⭐⭐ | ⭐⭐ |
| **Railway** | $5-20 | ✅ | ✅ | ✅ Managed | ✅ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Render** | $7+/svc | ✅ | ✅ | ✅ Managed | ✅ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **AWS Lightsail** | $10+ | ✅ | ✅ | ✅ Managed | ✅ | ⭐⭐⭐ | ⭐⭐⭐ |
| **BanaHosting** | $6.95 | ❌ | ❌ | ❌ (solo MySQL) | ❌ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 6. Recomendación Final de Infraestructura

### Opción A: Económica (Recomendada para inicio)

| Componente | Proveedor | Costo/mo | Costo/año |
|---|---|---|---|
| **Frontend** | Vercel (actual) | $0 | $0 |
| **Dominio** | Porkbun | — | ~$10.29 |
| **Backend (MVP)** | Railway | ~$5-10 | ~$60-120 |
| **OpenClaw** | Mac mini local | $0 (existente) | $0 |
| **Total** | | **~$5-10/mo** | **~$70-130/año** |

### Opción B: Profesional (Recomendada para producción)

| Componente | Proveedor | Costo/mo | Costo/año |
|---|---|---|---|
| **Frontend** | BanaHosting Professional | $6.95 | $75.06 |
| **Dominio** | Cloudflare | — | ~$9.77 |
| **Backend** | DigitalOcean App Platform | $12-25 | $144-300 |
| **PostgreSQL** | DigitalOcean Managed | $15 | $180 |
| **OpenClaw** | Mac mini local / DO Droplet | $0-12 | $0-144 |
| **Total** | | **~$34-59/mo** | **~$408-708/año** |

### Opción C: Todo-en-uno Cloud

| Componente | Proveedor | Costo/mo | Costo/año |
|---|---|---|---|
| **Frontend + Backend** | DigitalOcean Droplet (4GB) | $24 | $288 |
| **Dominio** | Cloudflare | — | ~$9.77 |
| **OpenClaw** | Mismo Droplet (Docker) | $0 | $0 |
| **Total** | | **~$24/mo** | **~$298/año** |

---

## 7. Roadmap de Migración

### Fase 0 — Ahora (Prototipo)
- ✅ Frontend en Vercel (gratis)
- ✅ OpenClaw en Mac mini local
- 🔲 Registrar dominio creacontenidos.com

### Fase 1 — MVP (Próximos 2-4 meses)
- 🔲 Migrar frontend a BanaHosting (si se decide) o mantener Vercel
- 🔲 Desplegar 5 servicios core en Railway o DigitalOcean App Platform
- 🔲 Configurar PostgreSQL managed
- 🔲 Conectar OpenClaw vía webhooks/API

### Fase 2 — Producción (6-12 meses)
- 🔲 Evaluar migración a DigitalOcean Droplets o Hetzner para mayor control
- 🔲 Implementar Docker Compose / Kubernetes para los 9 servicios
- 🔲 Configurar monitoreo y alertas
- 🔲 Implementar CDN para assets multimedia

### Fase 3 — Escala (12+ meses)
- 🔲 Evaluar Kubernetes managed (DigitalOcean K8s, AWS EKS)
- 🔲 Implementar CI/CD completo por servicio
- 🔲 Data warehouse para analytics
- 🔲 Multi-region si la audiencia crece

---

## 8. Checklist de Lanzamiento Técnico

- [ ] Registrar dominio creacontenidos.com
- [ ] Configurar DNS (A, CNAME, MX, TXT/SPF, DKIM)
- [ ] SSL/TLS para todos los subdominios
- [ ] Deploy frontend (Vercel o BanaHosting)
- [ ] Provisionar servidor backend
- [ ] Instalar y configurar PostgreSQL
- [ ] Desplegar message broker (RabbitMQ/NATS)
- [ ] Desplegar servicios core (ingest-gateway, radar-context, content-orchestrator, editorial-control, publication-hub)
- [ ] Configurar webhooks de WhatsApp y Telegram
- [ ] Conectar OpenClaw runtime
- [ ] Configurar backups automatizados
- [ ] Configurar monitoreo y alertas
- [ ] Email corporativo (@creacontenidos.com)
- [ ] Documentación de runbooks operativa
- [ ] Pruebas de carga y fallback

---

## 9. Notas Adicionales

### Sobre BanaHosting
- Empresa seria con casi 20 años de trayectoria
- Ideal para frontend estático, WordPress, email corporativo
- No reemplaza la necesidad de un cloud provider para los microservicios
- El plan Professional ($6.95/mo) es suficiente para el frontend de CREA
- Soporte en español disponible (tienen versión /es/ del sitio)

### Sobre OpenClaw
- Se mantiene independiente del hosting del frontend
- Puede correr en el Mac mini local (como está planeado)
- Alternativa: un VPS pequeño en DigitalOcean/Hetzner ($5-12/mo) para mayor disponibilidad
- La conexión con el backend es vía API/webhooks, no requiere estar en el mismo servidor

### Sobre el Dominio
- creacontenidos.com debe verificarse disponibilidad antes de comprar
- Se recomienda registrar variantes: creacontenidos.mx, creacontenidos.com.mx
- Configurar DNS en Cloudflare (gratis) independientemente del registrador para mejor rendimiento y seguridad
