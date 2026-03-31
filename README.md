# CREA Contenidos — Prototipo Visual

## Sobre este proyecto

Prototipo visual de alta fidelidad del sitio de CREA Contenidos (HTML/CSS/JS vanilla), reorganizado para facilitar mantenimiento y crecimiento hacia una arquitectura con multiples servicios.

## Nueva estructura (escalable)

```
crea_web/
├── apps/
│   └── web/
│       ├── index.html
│       ├── pages/
│       │   ├── nota.html
│       │   ├── seccion.html
│       │   ├── colaboradores.html
│       │   ├── comunidad.html
│       │   ├── comercial.html
│       │   └── tercer-tiempo.html
│       └── assets/
│           ├── css/
│           ├── js/
│           └── img/
├── services/              # Futuros servicios backend (API, jobs, workers)
├── packages/              # Codigo compartido (utilidades, SDKs, UI)
├── docs/                  # Documentacion tecnica y decisiones de arquitectura
├── vercel.json
└── README.md
```

## Por que esta organizacion ayuda a escalar

- Separa claramente la app web de otros servicios futuros.
- Permite agregar nuevos servicios en `services/` sin afectar el frontend.
- Facilita extraer codigo reutilizable en `packages/`.
- Hace mas simple migrar a monorepo con CI/CD por app/servicio.

## Arquitectura operativa (nueva base)

Para evaluar, corregir y escalar la plataforma, ahora existe una base formal de arquitectura:

- `docs/architecture/operating-architecture.md`
- `docs/architecture/implementation-phases.md`
- `docs/adr/0001-hybrid-ai-and-editorial-gate.md`
- `docs/runbooks/incidents-and-fallbacks.md`

Ademas se agrego scaffold de servicios por modulo en `services/` y contratos de eventos en `packages/contracts/events/`.

## Como ejecutar localmente

1. Ve a `apps/web`.
2. Levanta un servidor estatico (ejemplo con Python):

```bash
cd apps/web
python3 -m http.server 5173
```

3. Abre `http://localhost:5173`.

## Despliegue en Vercel

- `vercel.json` usa `outputDirectory: "apps/web"`.
- Las rutas limpias (`/nota`, `/seccion`, `/comunidad`, etc.) se reescriben a `pages/*.html`.
- Los enlaces internos usan rutas absolutas a `/pages/*.html` para mantener compatibilidad local y en produccion.

## Tecnologias

- HTML5 semantico
- CSS3 con Custom Properties
- JavaScript vanilla (ES6+)
- Google Fonts (Playfair Display, Source Sans 3, Lora)

## Siguiente paso recomendado

Cuando agregues un nuevo backend, crea su carpeta en `services/` (por ejemplo `services/api`) y manten su despliegue desacoplado del frontend.
