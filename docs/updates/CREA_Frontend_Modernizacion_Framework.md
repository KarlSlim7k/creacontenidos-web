---
proyecto: CREA Contenidos
documento: Modernizacion del frontend publico con framework
tipo: plan-de-implementacion
audiencia: agentes IA, frontend, diseno, direccion
estado: borrador para ejecucion
fecha: 2026-06-29
autoriza: dueno del proyecto (revoca D1 del spec previo)
stack_frontend_actual: HTML + CSS + JS vanilla (apps/web/)
stack_frontend_objetivo: Astro + Tailwind CSS + islas interactivas
stack_despliegue: Vercel (outputDirectory actual: apps/web)
api_backend: PHP (/api/*) sobre JSON/Postgres — se conserva
documento_relacionado: CREA_Pagina_Publica_Transformacion.md
---

# CREA Contenidos — Modernizacion del frontend publico con framework

Este documento define **cómo dejar de usar el formato típico de "portal de noticias"** y
convertir la página pública en un producto editorial moderno (revista digital / estudio de
contenido), migrando del stack estático actual a un framework moderno.

Complementa y **actualiza** a `CREA_Pagina_Publica_Transformacion.md`: aquella spec
mantiene los principios editoriales y de marca; este plan añade la capa técnica
(framework + arquitectura) y la nueva dirección visual.

---

## 0. Decisiones (con cambios respecto al spec previo)

| # | Decision | Estado |
|---|----------|--------|
| D1 (previa) | "Sitio estático, no migrar a framework." | **REVOCADA** por el dueño el 2026-06-29. |
| N1 | Se adopta **Astro** como framework del sitio público. | Cerrada. |
| N2 | Se adopta **Tailwind CSS** mapeando los design tokens actuales (paleta PFA 2026, Tercer Tiempo). | Cerrada. |
| N3 | La **API PHP `/api/*` se conserva**; Astro la consume en build y/o runtime. No se reescribe el backend en esta fase. | Cerrada. |
| N4 | Se conservan **identidad de marca** (logo, rojo CREA `#8b1a1a`, mostaza `#A07A1C`) y la sub-marca **Tercer Tiempo**. | Cerrada. |
| N5 | El **admin (`/admin/*`)** y el pipeline de IA **no se tocan** en esta migración. Rutas y despliegue separados. | Cerrada. |
| N6 | **Mobile-first**, breakpoint base 375px. SEO y velocidad son requisitos, no extras. | Cerrada. |
| N7 | Nada de placeholders (Unsplash/picsum) en producción. Imágenes reales o generadas por el pipeline. | Cerrada. |

### Por qué Astro (y no Next.js) como recomendación

Es un sitio **content-first**: muchas páginas, lectura, SEO crítico, poca app-interactividad.

- **Astro**: HTML estático por defecto, JS sólo donde se necesita (islands). Lighthouse altísimo
  out-of-the-box, migración casi 1:1 desde HTML actual, consume la API PHP en build (SSG) o
  bajo demanda (SSR/ISR en Vercel). **Es el mejor encaje para este caso.**
- **Next.js**: válido si a futuro la página pública se vuelve muy "aplicación" (cuentas de
  usuario, dashboards públicos, personalización). Hoy sería sobre-ingeniería.

> Si el equipo ya domina React y prefiere un solo framework para público + futuros productos,
> Next.js (App Router) es aceptable. El resto del plan aplica casi igual; sólo cambia la
> nomenclatura (`app/` en vez de `src/pages/`, Server Components en vez de islas).

---

## 1. Objetivo

Que el sitio **deje de parecer un periódico tradicional** y se sienta como un **medio editorial
independiente moderno**: jerarquía tipográfica fuerte, fotografía protagonista, layouts
asimétricos, micro-interacciones y comercial integrado de forma nativa — sin perder velocidad,
SEO ni el contenido dinámico que ya viene de la API.

**Funciones que la página sigue cumpliendo a la vez:** informar, vender con naturalidad,
representar la identidad de CREA.

**Fuera de alcance:** CRM/backoffice, login interno, pipeline de IA, métricas privadas.

---

## 2. Dirección de diseño (lo que rompe el "formato noticias")

Estas son las ideas acordadas en la conversación, ampliadas con lo detectado en el código
(`hero-editorial` + `carousel` + `grid-secundario` 2fr/1fr + `aside` sponsors + `grid-secciones`
3 columnas + `lista-leidos`).

### 2.1 Romper la rejilla uniforme → layout editorial / bento
- Sustituir el `grid-secciones` de 3 columnas idénticas por **bloques de tamaño variable**
  (bento): una nota grande, dos medianas, varias chicas, con ritmo asimétrico.
- En portada, alternar **bandas de ancho completo** con secciones contenidas para dar respiro.
- Reemplazar las cards uniformes por **2–3 variantes de card** (destacada, estándar, mínima/texto).

### 2.2 Header / navegación menos "diario"
- Quitar el ícono-buscador genérico de periódico; buscador como **command-palette** (overlay,
  `Cmd/Ctrl+K`) o integrado de forma sutil.
- Navegación minimalista con **mega-menú curado visualmente** (miniaturas de la nota top por
  sección) en vez de una fila plana de categorías.
- Conservar la entrada destacada a **Tercer Tiempo** con su acento dorado.

### 2.3 Menos etiquetas-de-noticia, más identidad editorial
- Reducir el uso de `badge-categoria` tipo etiqueta; la categoría puede vivir como
  **eyebrow tipográfico** (Oswald) sin "pastilla" de color en todos lados.
- Titulares grandes en Playfair Display como **protagonistas**, fotografía a sangre.

### 2.4 Scroll storytelling y micro-interacciones
- Pasar del `reveal-delay` actual a **scroll-driven reveals** más ricos (IntersectionObserver
  ya existe en `interactions.js`; elevarlo con parallax sutil y stagger).
- Hover states sofisticados en cards (zoom de imagen, desplazamiento de meta, línea de acento).
- **Transiciones de página** suaves (View Transitions API — nativo en Astro).

### 2.5 Comercial integrado, no sidebar de anuncios
- Eliminar el `aside` lateral de "sponsors" y el `banner-patrocinador` tipo banner.
- Sustituir por **branded content nativo**: tarjetas patrocinadas con el mismo lenguaje visual
  + etiqueta clara "Contenido patrocinado", e inserciones in-feed discretas.

### 2.6 Sistema visual moderno (refresh, no reinvención)
- Migrar tokens actuales a Tailwind, **subir el contraste y el aire** (espaciado generoso ya
  presente), modo oscuro opcional, y unificar sombras/radios.

### 2.7 Ideas nuevas detectadas al revisar el código
- **Lectura premium en `nota.html`**: ya hay barra de progreso y tiempo de lectura; añadir
  tabla de contenidos flotante, citas destacadas (pull-quotes), "sigue leyendo" contextual por
  sección, y compartir sticky. Tipografía de cuerpo optimizada (medida ~66ch).
- **Portada viva**: hoy el hero y varias notas están **hardcodeadas en `index.html`** mientras
  `dynamic-articles.js` ya sabe traer de la API. En Astro, **toda la portada se arma desde la
  API** (cumple D2 del spec previo) — se acaba el riesgo de portada vieja.
- **Tercer Tiempo como "micro-sitio"**: tiene identidad y `video_fondo_tt.mp4`. Tratarlo como
  una sub-experiencia con su propio layout cinematográfico (hero en video, paleta estadio),
  reutilizando componentes pero con tema dorado.
- **Newsletter como pieza editorial**, no banner: página/landing con archivo de ediciones y
  preview, no sólo un input al pie.
- **Página de colaboradores con gamificación**: existen `collaborator-gamification` y eventos
  de puntos; la pública puede mostrar ranking/insignias de colaboradores de forma atractiva.
- **OG/Schema dinámico por nota** (hoy el OG es del sitio): generar imágenes OG y `NewsArticle`
  JSON-LD por artículo — gran ganancia de SEO/compartido.

---

## 3. Arquitectura objetivo

```
apps/web/                      # se reemplaza su contenido por proyecto Astro
├── src/
│   ├── pages/                 # rutas (index.astro, nota/[id].astro, seccion/[slug].astro, ...)
│   ├── layouts/               # BaseLayout, NotaLayout, TercerTiempoLayout
│   ├── components/            # Header, MegaMenu, Card*, Hero, Bento, Newsletter, Sponsored...
│   ├── lib/api.ts             # cliente de la API PHP (/api/*) + tipos
│   ├── styles/                # tailwind + tokens (de main.css)
│   └── content/               # (opcional) content collections si algo es markdown
├── public/                    # assets estáticos (logos, video TT, robots, sitemap)
├── astro.config.mjs
├── tailwind.config.cjs
└── package.json
```

- **Despliegue**: Vercel ya está configurado. Se añade `buildCommand: "astro build"` y se
  ajusta `outputDirectory` a `apps/web/dist`. Las rutas amigables (`/nota`, `/seccion`, ...) del
  `vercel.json` pasan a ser rutas reales de Astro; se mantienen redirects para no romper enlaces.
- **Datos**: `src/lib/api.ts` encapsula las llamadas actuales (`/api/articles/crud.php?public=true`,
  newsletter, comercial). Estrategia por página:
  - Portada y secciones: **SSG con revalidación (ISR)** o SSR ligero según frecuencia de publicación.
  - Nota individual: SSR/ISR por `id|slug`.
- **API PHP**: sin cambios en esta fase. Si en el futuro se quiere headless puro, se evalúa
  exponer endpoints REST/JSON más limpios (fase posterior, fuera de alcance).

---

## 4. Plan de fases (en orden, no saltar)

### Fase 0 — Andamiaje (sin tocar diseño)
- Crear proyecto Astro + Tailwind dentro de `apps/web/` (o en `apps/web-next/` y switch al final
  para no romper producción).
- Portar **design tokens** de `main.css` a `tailwind.config` (colores, tipografías, spacing,
  radios, sombras, motion) incluyendo bloque Tercer Tiempo.
- `src/lib/api.ts` con tipos `Article`, `Section`, etc. y wrappers de fetch (reusando contratos
  de `dynamic-articles.js`).
- **DoD**: `astro build` verde, página en blanco con tokens cargados, deploy preview en Vercel.

### Fase 1 — Layout base + navegación
- `BaseLayout`, `Header` (con mega-menú curado + command palette de búsqueda), `Footer`.
- Migrar el sistema de includes (`data-include`) y `nav.js` a componentes Astro.
- View Transitions activadas.
- **DoD**: navegación funcional en mobile y desktop, header sticky, accesible (aria-current).

### Fase 2 — Portada editorial (bento) desde la API
- Hero dinámico, bandas asimétricas/bento, variantes de card, "lo más leído", secciones.
- **Cero hardcode**: todo desde `lib/api.ts`. Estados de carga/empty/error.
- **DoD**: portada se actualiza al publicar en el CMS; Lighthouse mobile ≥ 90.

### Fase 3 — Nota individual premium
- `nota/[id].astro` con lectura optimizada, TOC, pull-quotes, progreso, compartir sticky,
  "sigue leyendo", OG dinámico + `NewsArticle` JSON-LD.
- **DoD**: SEO por nota validado (meta + schema), reading experience pulida.

### Fase 4 — Secciones + búsqueda
- `seccion/[slug].astro` con layout editorial (no grid plano), filtros, paginación/infinite.
- Command palette de búsqueda conectada a la API.
- **DoD**: todas las secciones (Local, Cultura, Economía, Deportes, Opinión, etc.) migradas.

### Fase 5 — Tercer Tiempo (sub-experiencia)
- Layout cinematográfico con `video_fondo_tt.mp4`, tema dorado, componentes reutilizados.
- **DoD**: identidad TT preservada, rendimiento del video controlado (poster, lazy).

### Fase 6 — Comercial + Newsletter + Colaboradores
- Branded content nativo (reemplaza sidebar/banner), landing de newsletter con archivo,
  página de colaboradores con gamificación.
- **DoD**: formularios conectados (`/api/newsletter`, `/api/comercial`), comercial integrado.

### Fase 7 — Pulido, accesibilidad, performance y switch
- A11y (focus states, contraste, lectores de pantalla), `prefers-reduced-motion`,
  imágenes responsivas (`astro:assets`), sitemap/robots, 404.
- Reapuntar `vercel.json` + redirects de rutas viejas → nuevas.
- **DoD**: Lighthouse ≥ 90 en las 4 categorías, sin placeholders, retiro del sitio viejo.

---

## 5. Inventario de componentes (mapa viejo → nuevo)

| Actual (`apps/web`) | Nuevo (Astro) | Cambio |
|---|---|---|
| `index.html` (hardcode) | `pages/index.astro` | Data-driven, bento, sin hardcode |
| `hero-editorial` | `components/Hero.astro` | Dinámico desde API |
| `carousel` + `carousel.js` | `components/Carousel` (isla) | Sólo donde aporta; JS aislado |
| `grid-secundario` + `aside` sponsors | `components/Bento` + `Sponsored` | Asimétrico; comercial nativo |
| `grid-secciones` (3 col) | `components/SectionBlock` | Tamaños variables |
| `lista-leidos` | `components/MostRead` | Desde métricas reales |
| `banner-patrocinador` | `components/SponsoredCard` | In-feed, no banner |
| `nota.html` | `pages/nota/[id].astro` + `NotaLayout` | TOC, pull-quotes, OG dinámico |
| `seccion.html` | `pages/seccion/[slug].astro` | Layout editorial |
| `tercer-tiempo.html` | `pages/tercer-tiempo.astro` + layout | Sub-experiencia |
| `nav.js` includes | `components/Header` + `MegaMenu` | Mega-menú + command palette |
| `dynamic-articles.js` | `lib/api.ts` | Tipado, server-side |

---

## 6. Riesgos y mitigaciones

- **Romper enlaces/SEO existentes** → mantener rutas y redirects 301; conservar sitemap.
- **Doble fuente de verdad durante migración** → construir en paralelo (`apps/web-next/`) y
  hacer un único switch al final; no editar el sitio viejo salvo hotfix.
- **Acoplamiento a la API PHP** → aislar todo acceso en `lib/api.ts`; si la API cambia, un solo
  punto a tocar.
- **Regresión de performance por JS** → islas sólo donde haga falta; medir Lighthouse por fase.
- **Identidad de marca** → tokens portados 1:1 antes de rediseñar; revisión visual con el dueño
  al cerrar Fase 2.

---

## 7. Definition of Done global

1. Todas las páginas públicas migradas a Astro + Tailwind y desplegadas en Vercel.
2. Contenido 100% data-driven desde la API (sin hardcode, sin placeholders).
3. Lighthouse mobile ≥ 90 en Performance, A11y, Best Practices, SEO.
4. Identidad CREA y sub-marca Tercer Tiempo preservadas.
5. Layout editorial (no formato periódico) en portada, secciones y nota.
6. Comercial integrado de forma nativa; newsletter y colaboradores reforzados.
7. Admin y pipeline de IA intactos y separados.

---

## 8. Próximos pasos sugeridos

1. Confirmar **Astro vs Next.js** (recomendado: Astro).
2. Decidir **`apps/web-next/` en paralelo** vs migración in-place.
3. Arrancar **Fase 0** (andamiaje + tokens) — entregable pequeño y verificable.
