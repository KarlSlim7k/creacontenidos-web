---
proyecto: CREA Contenidos
documento: Transformacion total de la pagina publica
tipo: especificacion-diseno
audiencia: agentes IA, diseno, frontend, contenido
estado: borrador para ejecucion
fecha: 2026-06-28
stack_frontend: HTML + CSS + JS vanilla (apps/web/)
stack_despliegue: nginx + Docker (Dokploy/Traefik)
dominios: crea-contenidos.com, www.crea-contenidos.com
origen_brief: CREA_Pagina_Publica_Transformacion.pdf
---

## Skills relacionadas para agentes IA

Si sos un agente IA trabajando sobre este spec, cargar **en este orden**:

1. **`.opencode/skills/fullstack/SKILL.md`** — estructura del repo y stack.
2. **`.opencode/skills/crea-pagina-publica/SKILL.md`** — resumen operativo de este documento (fases + DoD).
3. **`.opencode/skills/crea-design-system/SKILL.md`** — tokens, componentes, paleta, tipografia.

**Regla:** si este spec y la skill se contradicen, gana el spec. Las skills se regeneran con `scripts/sync-skills.sh`.

---

# CREA CONTENIDOS — TRANSFORMACION TOTAL DE LA PAGINA PUBLICA

Base de cambios para redisenar la presencia publica del sitio. Pensado para que un agente IA pueda ejecutar cada fase sin re-preguntar.

---

## 0. Decisiones cerradas (no renegociar)

| # | Decision | Razon |
|---|----------|-------|
| D1 | Sitio es **estatico** (HTML + CSS + JS vanilla), servido por nginx. | Stack actual, no migrar a framework sin justificacion. |
| D2 | Contenido editorial viene de la DB (Postgres) via capa de datos, **no se hardcodea** en HTML. | Si no, la portada queda vieja en 1 dia. |
| D3 | La pagina publica **NO** incluye el CRM ni el backoffice. Rutas separadas. | Seguridad y claridad. |
| D4 | **Toda imagen placeholder se reemplaza** antes de marcar fase como lista. | Ningun Lorem Pix de fondo. |
| D5 | Identidad de marca se conserva (logo, el rojo CREA, el nombre). Lenguaje visual SI cambia: pasamos de "periodico tradicional" a "magazine digital independiente moderno". | Reconocimiento publico sin parecer de 2014. |
| D6 | Mobile-first obligatorio. Breakpoint base: 375px. | Audiencia principal mobile. |
| D7 | Fases en orden. No saltar. | Coherencia editorial. |

---

## 1. Objetivo

Redisenar por completo `apps/web/` para que deje de sentirse como una maqueta y se convierta en un medio digital real, creible y rapido para la audiencia local (Perote y region).

**La pagina publica cumple tres funciones al mismo tiempo:**
1. **Informar** con claridad.
2. **Vender** con naturalidad (sin agresivo).
3. **Representar** la identidad editorial de CREA.

**Fuera de alcance:** CRM interno, gestion de piezas, login de usuarios, panel de metricas privadas. Eso vive en rutas separadas (`/admin/*` cuando exista).

---

## 2. Principios de la nueva pagina publica

1. Prioridad a lo **local** y relevante.
2. Menos relleno, mas contenido util.
3. Identidad editorial consistente en todo el sitio.
4. Fotos reales, **no placeholders**.
5. Jerarquia visual clara (titular > bajada > meta > cuerpo).
6. Mejor lectura en **movil** que en escritorio.
7. CTAs comerciales discretos pero efectivos.
8. Confianza, velocidad y limpieza visual.

---

## 3. Inventario actual (estado real a corregir)

Inspeccionado contra `apps/web/`:

| Archivo | Estado actual | Problema |
|---------|--------------|----------|
| `apps/web/index.html` | Portada con hero generico, cards placeholder. | No se siente medio vivo. |
| `apps/web/pages/nota.html` | Estructura base de articulo. | Falta meta info, relacionados, CTA. |
| `apps/web/pages/seccion.html` | Listado generico. | Sin identidad por seccion. |
| `apps/web/pages/comercial.html` | Formulario aislado. | No comunica propuesta de valor. |
| `apps/web/pages/newsletter.html` | Pagina basica. | Sin ejemplo de contenido. |
| `apps/web/pages/tercer-tiempo.html` | Submarca con identidad debil. | Se siente desconectada. |
| `apps/web/pages/{local,cultura,economia,entretenimiento,deportes,opinion,comunidad,colaboradores}.html` | Plantillas similares. | Falta diferenciacion editorial. |
| `apps/web/assets/img/` | Mix de imagenes reales y placeholders. | Auditar y reemplazar (ver Fase 1 DoD). |

**Problemas transversales:**
- Imagenes genericas o temporales en hero y cards.
- Titulares de ejemplo que no representan flujo real.
- Poca diferenciacion entre portada, seccion y nota.
- CTAs comerciales sin destino concreto.
- Social links apuntan a `#` (no a URLs reales).
- Falta de bloques editoriales con utilidad periodistica (resumen del dia, mas leido, ultima hora).
- Sensacion de sitio "demo" y no actualizado.

---

## 4. Rediseno por areas

### 4.1 Portada (`apps/web/index.html`)

**De:** composicion tipo demo con hero generico.
**A:** portada editorial con ritmo diario.

**Cambios concretos:**
- Reemplazar hero generico por **noticia principal real** del dia (la mas reciente en `piezas_contenido` con `estado='publicada'`).
- Mostrar **timestamp visible** de actualizacion ("Actualizado HH:MM").
- Mostrar **autor** (`piezas_contenido.autor_id` -> `usuarios.nombre_completo`) y **fuente**.
- Bloques: 1 destacada, 2 secundarias, 1 bloque "Ultimas notas locales".
- Reducir espacio vacio del hero, mejorar jerarquia tipografica.
- Primer pantallazo debe responder: "Esto es CREA Contenidos, medio de Perote".

**Lo que debe mostrar la portada:**
- Noticia principal del dia (1).
- Temas en tendencia (3, derivado de `piezas_contenido` con mas vistas en 7 dias).
- Ultimas notas locales (6).
- Bloque de patrocinio claro (`patrocinadores` activos, maximo 1 visible).
- Acceso rapido a Newsletter y Tercer Tiempo.

**DoD:**
- Portada renderiza en <1.5s con conexion 4G simulada (Lighthouse mobile).
- Ninguna imagen es placeholder: `grep -rE "placeholder|lorem|lorempixel|picsum|placeholder.com" apps/web/assets/img/` retorna 0.
- Si la DB esta vacia, portada muestra estado vacio elegante, no crash.

---

### 4.2 Navegacion (`<nav>` global, presente en todas las paginas)

**De:** menu decorativo con muchas opciones.
**A:** menu util con jerarquia comercial.

**Cambios concretos:**
- Simplificar menu principal a: Local, Deportes, Cultura, Opinion (+ dropdown Economia/Entretenimiento si necesario).
- Destacar **"Apoya a CREA"** como CTA principal (`btn-cta` -> `/pages/comercial.html`).
- Visibles siempre: Newsletter, Comercial.
- Sub-menu colapsable en mobile (hamburguesa ya existe en `index.html:67`).
- Revisar responsividad: en mobile, menu ocupa viewport completo, no lateral chico.

**DoD:**
- Menu cierra con Escape.
- Focus trap cuando esta abierto en mobile.
- Links tienen `aria-current="page"` cuando aplica.

---

### 4.3 Home editorial (bloques dinamicos en portada)

**Cambios concretos (ademas de §4.1):**
- Bloque **"Ultima hora"**: piezas con `fecha_publicacion >= now() - 6h`, maximo 3.
- Bloque **"Mas leido"** realmente dinamico: top 5 de `metricas_piezas` ordenado por `vistas_unicas DESC` en 7 dias.
- Bloque **"Lo que esta pasando en Perote"**: piezas con `categoria.slug='local'` de las ultimas 24h.
- Resumen editorial corto del dia (texto fijo curado, NO generado por IA).
- Cards con categoria visible (badge) y tiempo de lectura.
- Evitar notas de relleno: si DB tiene <3 piezas, mostrar menos bloques, no placeholders.

**DoD:**
- Cada bloque tiene fallback elegante si la query devuelve 0 resultados.
- "Mas leido" se recalcula automaticamente (job diario o vista materializada).

---

### 4.4 Pagina de nota (`apps/web/pages/nota.html`)

**De:** articulo plano.
**A:** producto periodistico.

**Cambios concretos:**
- Encabezado mas fuerte (titular H1 con peso visual alto).
- Jerarquia tipografica: H1 > H2 > H3 con escala clara.
- Meta info visible: **autor**, **fecha**, **tiempo de lectura**, **categoria** (todos los campos ya existen en `piezas_contenido`).
- Bloque "Notas relacionadas" (3 piezas de la misma categoria, excluyendo la actual).
- Caja de contexto o datos utiles (sidebar opcional en desktop, integrado en mobile).
- CTA al final: newsletter + comercial.
- Imagen principal con `alt` real (NO vacio, NO "imagen").
- Componentes para: citas (`<blockquote>` estilado), destacados (`<aside>`), multimedia (`<figure>`).
- `meta_description` y `og:image` unicos por nota (ya existen los campos en `piezas_contenido`).

**DoD:**
- Tiempo de lectura calculado de `contenido_markdown` (200 palabras/min).
- Schema.org `NewsArticle` en JSON-LD.
- Lectura sin scroll horizontal en 375px.

---

### 4.5 Paginas de seccion (`seccion.html` + variantes cultura/economia/deportes/opinion/entretenimiento)

**De:** listado generico.
**A:** portada de seccion con identidad.

**Cambios concretos:**
- Portada de seccion con subtitulo editorial (que cubre, para quien).
- Filtro u orden por fecha/relevancia (toggle UI).
- Cards uniformes en todo el listado.
- Bloque lateral de "Noticias breves" (1 parrafo, sin imagen, max 5).
- Diferenciacion visual entre secciones por color de acento (`categorias_editorial.color_hex`).

**DoD:**
- Cada seccion se ve distinta en 5 segundos (color de acento + tagline).
- Listado paginado o con scroll infinito (definir: scroll infinito por simplicidad YAGNI, 20 items por carga).

---

### 4.6 Comercial (`apps/web/pages/comercial.html`)

**De:** formulario aislado.
**A:** propuesta de venta real.

**Cambios concretos:**
- Explicar **que compra un anunciante** (alcance, formato, duracion).
- Mostrar paquetes, formatos y beneficios (texto curado, no generado).
- Agregar **prueba social o resultados** (cifras reales del ultimo mes o trimestre, de `metricas_piezas`).
- Separar: patrocinios, branded content, presencia fija.
- CTA a contacto directo (WhatsApp Business + email).
- Seccion de "Reportes mensuales y seguimiento" (link a `/pages/reportes-anunciantes.html` si existe o promesa).
- Mejor integracion con CRM: el submit del formulario crea prospecto (`POST /api/prospectos` o equivalente, con `origen_descripcion='formulario_comercial'`).

**DoD:**
- Formulario no se pierde: al fallar el POST, muestra error y guarda en localStorage como borrador.
- Tiempo de respuesta del submit <3s.
- Email de confirmacion al cliente + notificacion al equipo comercial.

---

### 4.7 Newsletter (`apps/web/pages/newsletter.html`)

**De:** pagina basica.
**A:** invitacion clara a suscribirse.

**Cambios concretos:**
- Explicar el valor del newsletter (frecuencia, contenido tipo, duracion de lectura).
- Mostrar ejemplo de contenido (screenshot o render del ultimo newsletter).
- Reducir friccion: solo email + nombre opcional, nada mas.
- Conectar el newsletter con la portada (banner en `index.html` con preview del titulo del dia).
- Destacar frecuencia y tipo de contenido (diario vs semanal — definir y ser consistente).

**DoD:**
- Un solo campo visible (email) arriba del fold en mobile.
- Submit exitoso muestra pantalla de gracias, no redirige.

---

### 4.8 Tercer Tiempo (`apps/web/pages/tercer-tiempo.html`)

**De:** submarca debil.
**A:** submarca con identidad deportiva fuerte tipo "estadio nocturno + oro".

**Referencia validada:** paleta y tipo ya probados en `~/Descargas/web-PFA/presentacion.html` (cuartos de final, presentacion de 6 slides con recepcion favorable). Se conservan tal cual porque el equipo ya los aprobo visualmente.

**Paleta TT (extraida de la presentacion):**

| Token | Valor | Uso |
|-------|-------|-----|
| `--tt-ink` | `#0b1220` | Fondo base (noche profunda) |
| `--tt-paper` | `#050912` | Fondo gradient inferior |
| `--tt-cream` | `#f5f1e8` | Texto principal |
| `--tt-dim` | `#cfc7b3` | Texto secundario |
| `--tt-dimmer` | `#9aa3b2` | Meta / labels |
| `--tt-line` | `rgba(245,241,232,0.14)` | Bordes sutiles |
| `--tt-gold` | `#e6b54a` | Acento primario TT |
| `--tt-gold-2` | `#c8941f` | Acento secundario (hover, gradientes) |
| `--tt-gold-soft` | `rgba(230,181,74,0.12)` | Fondos sutiles (chips, badges) |
| `--tt-red` | `#d44a4a` | Estados criticos / live |
| `--tt-green` | `#5fd28b` | Victorias / estado positivo |
| `--tt-amber` | `#e9c46a` | Empates / neutro |
| `--tt-rose` | `#ff7676` | Derrotas / estado negativo |

**Tipografia TT (de la presentacion):**
- **Display / titulares:** `Impact`, fallback `Haettenschweiler`, `Arial Black`, sans-serif. Pesos: el peso nativo del font. Uso: solo en heroes y marcadores de resultado.
- **Eyebrows / kickers:** `Oswald`, sans-serif. Pesos 500-700. Letter-spacing `0.2-0.3em`, uppercase. Color gold (`--tt-gold`) para secciones.
- **Cuerpo / UI:** `Inter`, sans-serif. Pesos 400-700.
- **Estadisticas / tablas:** `Barlow Condensed`, sans-serif. Pesos 500-800.
- Tallas: titular hero hasta `clamp(48px, 8vw, 92px)` con `line-height: 0.95` y `text-shadow: 0 4px 30px rgba(0,0,0,0.5)` para legibilidad sobre imagen oscura.

**Componentes TT (de la presentacion):**
- Fondo gradient: `radial-gradient(1000px 600px at 50% -5%, rgba(230,181,74,0.16), transparent 60%), linear-gradient(180deg, #0b1220 0%, #050912 100%)`.
- Panel base: `linear-gradient(180deg, var(--panel), var(--panel-2))` con `border: 1px solid var(--line)` y `border-radius: 12px`.
- Topbar: gradient `linear-gradient(180deg, rgba(11,18,32,0.95), rgba(11,18,32,0.7))` con `border-bottom: 1px solid var(--line)` y `backdrop-filter: blur(8px)`.
- VS circle (partidos): `radial-gradient(circle, #f0c75a 0%, #a07a1c 100%)`, `border-radius: 50%`, sombra dorada `box-shadow: 0 8px 30px rgba(230,181,74,0.4)`.
- Badges de equipo: dot de 12-16px con `box-shadow: 0 0 0 2-3px rgba(255,255,255,0.08)` (anillo sutil).

**Bloques a implementar en TT:**
- Resultados del dia (cards con score grande, equipos, hora, cancha).
- Agenda proximos partidos.
- Notas deportivas (`piezas_contenido` filtradas por `categoria.slug='deportes'`).
- Cobertura en vivo (cuando aplica, con badge "EN VIVO" pulsante rojo).
- Tabla general / standings (cuando aplique).

**DoD:**
- Logo de Tercer Tiempo visible y diferenciado del logo CREA principal (`apps/web/assets/img/logo-tercer-tiempo.png` ya existe en `web-PFA/assets/`).
- Header propio con la paleta TT (no usar la paleta del sitio general).
- Pieza de Tercer Tiempo usa template visual TT (fondo oscuro, oro, dot de badge).
- Enlace desde CREA a Tercer Tiempo y viceversa visibles.
- Lighthouse mobile >=85 Performance sobre fondo oscuro (es aceptable bajar del 90 por las imagenes).

---

## 5. Contenido y voz editorial

### 5.1 Voz

- Informativa, cercana, local, confiable.
- **Sin clickbait.**
- **Sin tono exagerado** ("IMPERDIBLE", "TE ESPANTARAS").
- Segunda persona ("si vives en Perote...") cuando aplica.
- Tercera persona para hechos.

### 5.2 Tipo de contenido a priorizar

- Noticias locales con impacto verificable.
- Servicios utiles (clima, agenda, utilidades).
- Economia regional.
- Cultura y comunidad.
- Deportes locales.
- Contenidos comerciales **bien etiquetados** como "Contenido comercial" o "Patrocinado" — NUNCA mezclados con redaccion editorial.

---

## 6. Sistema visual — Direccion: "magazine digital independiente"

**Inspiracion (no copia):** Defector, The Browser Company, Are.na, Rest of World, Itasat. Medios que se sienten editados por personas, no por algoritmos. Caracteristicas comunes:
- Tipografia con personalidad pero legible.
- Asimetria intencional (no grilla perfecta de periodico).
- Color de acento fuerte pero no omnipresente.
- Mucho aire blanco (o negro) entre bloques.
- Tarjetas dominadas por imagen, poco texto en el card.

### 6.0 Principios del nuevo lenguaje visual

1. **Tipografia con voz.** Titulares con serifa moderna de alto contraste. Opciones validadas en referencia interna (ver §6.5): Playfair Display 800 con `letter-spacing: -0.01em` funciona bien para notas deportivas/analisis cuando se combina con sans condensada para stats. Para el sitio general, evaluar alternativas (Fraunces, Instrument Serif) en paralelo antes de comprometer. Cuerpo en sans geometrica (Inter, Satoshi, General Sans). NO usar Playfair Display + Lora juntos: ya tenemos un ejemplo aprovado y NO se siente "blog de bodas" mientras el resto del sistema lo acompa単e bien.
2. **Asimetria editorial.** Layouts que no son "3 columnas iguales". Mezclar hero a sangre completa + columna angosta + grilla 2-up. Inspirarse en como arranca un articulo de Itasat o Defector.
3. **Acento dual, nunca arcoiris.** Rojo CREA para CTAs y breaking news. Un segundo acento moderno para distinguir secciones jovenes (ver §6.4).
4. **Mucho aire.** Entre bloques: minimo 64px en desktop, 40px en mobile. Dentro de cards: padding generoso. El sitio debe "respirar".
5. **Imagen manda, texto apoya.** En cards el ratio imagen/texto es 70/30. El titular es corto (max 2 lineas) y la bajada casi no existe — el lector decide con el titular + foto.
6. **Bordes suaves, sombras sutiles, esquinas mas redondeadas.** `border-radius` entre 12-20px en cards (no 3-5px como ahora). Sombras muy tenues o ninguna — preferir bordes de 1px en color neutro.
7. **Microinteracciones sin circo.** Hover en card: lift de 2-4px + cambio sutil de sombra. Transiciones 200ms ease-out. Sin parallax, sin tilt 3D, sin animaciones de entrada pesadas.

### 6.1 Imagen

- **Eliminar todo placeholder** (`grep -rE "placeholder|lorem|lorempixel|picsum|placeholder.com" apps/web/assets/img/` debe retornar 0).
- Usar fotografia propia o banco editorial consistente (Unsplash editorial OK con credito visible o en `alt`).
- Edicion: contraste subido levemente, ligeramente desaturado en fotos de portada para que el titular rojo/naranja destaque. Filtro consistente en todo el sitio (mismo preset) — esto es firma visual.
- Estilos por seccion:
  - **Deportes:** mas energia, colores saturados.
  - **Opinion:** sobrio, retrato del autor manda.
  - **Cultura:** color, detalle, puede romper la grilla.
- Hero con imagen a sangre completa (edge-to-edge) en portada y en nota. NO hero contenido en un cuadro.

### 6.2 Tipografia

- **Display / titulares:** serifa moderna de alto contraste. Opciones recomendadas: Fraunces (variable, gratis), Instrument Serif (gratis), GT Sectra (pago). Pesos 500-700 para titulares, 400 italic para destacadas.
- **Cuerpo / UI:** sans geometrica humanista. Opciones: Inter (gratis, variable), General Sans (gratis), Söhne (pago). Pesos 400 cuerpo, 500 enfasis, 600 botones.
- **Mono (opcional, para metadata tipo "ACTUALIZADO 14:23"):** JetBrains Mono o IBM Plex Mono. Solo en labels pequenos, no en UI principal.
- Tallas:
  - Cuerpo: 17px mobile, 18px desktop, line-height 1.55.
  - Titular de hero: `clamp(2.5rem, 6vw, 5rem)`, line-height 1.05.
  - Titular de card: `clamp(1.25rem, 2vw, 1.5rem)`, line-height 1.15.
  - Meta (fecha, autor): 13-14px, sans, color neutro medio.
- **Reglas duras:**
  - Maximo 2 lineas en titular de card visible. Si pasa, truncate con `…`.
  - Mix display + sans solo en portada y en notas. En UI (botones, nav, formularios) SOLO sans.
  - Numerales tabulares (`font-variant-numeric: tabular-nums`) en metadata con cifras.

### 6.3 Componentes (`apps/web/assets/css/components.css`)

- **Cards:**
  - `border-radius: 16px`.
  - Borde `1px solid` en gris muy claro, sombra casi nula. En hover: sombra media + lift de 3px.
  - Imagen 16:9 o 4:5 (NO 1:1, se siente stock photo).
  - Padding interno generoso: 20-24px.
  - Categoria como label pequeno arriba (uppercase, tracking ancho, sin fondo), NO como badge con color de relleno.
- **Badges de categoria:** cambiar de "badge con fondo de color" a "label con punto de color". Tipo: `● Local`. Mas magazine, menos deportivo.
- **Separadores:** nunca `<hr>`. Usar espaciado. Si hace falta, linea vertical de 1px en gris muy claro.
- **Banners:** sticky solo para comercial/newsletter, y SOLO en portada, no en nota. En mobile: banner al final del articulo, no arriba.
- **Espaciado:** entre bloques de portada: 80px desktop, 48px mobile.
- **Botones:**
  - Primario: fondo rojo CREA, texto blanco, `border-radius: 999px` (pill) o 12px. Padding 14px 24px.
  - Secundario: fondo transparente, borde 1.5px rojo, texto rojo.
  - Hover: invertir (relleno rojo, fondo blanco) o subir luminosidad.
- **Nav:**
  - En desktop: fondo transparente sobre hero, fondo solido al hacer scroll. Logo a la izquierda, menu centrado o derecha, CTA pill a la derecha.
  - En mobile: hamburguesa abre menu fullscreen con tipografia display grande para las secciones (estilo magazine app, no menu de banco).

### 6.4 Paleta de acento dual

**Acento primario — Rojo CREA (se conserva, ya existe como `--color-rojo: #C0392B`):**
- Uso: CTAs principales, breaking news, links hover, badges de "EN VIVO".
- NO se usa mas como fondo de seccion completa. Se usa como punto, no como mancha.

**Acento secundario — DECIDIDO: opcion B (mostaza magazine `#A07A1C`)**

Decision cerrada: 2026-06-28. Color `#A07A1C` (mostaza magazine). Validado por uso en `web-PFA/src/index.css`.

**Token CSS a introducir:** `--color-acento: #A07A1C;`

**Donde se usa:**
- Eyebrows / kickers de Opinion, Cultura, Newsletter, Comunidad.
- Borde superior de secciones deOpinion / Cultura (2px solid var(--color-acento)).
- Hover de links internos en estas secciones.
- Fondo de tags / chips de Opinion y Cultura (con opacidad `.12`).
- Hover del nav-item cuando la seccion es Opinion o Cultura.

**Donde NO se usa:**
- Nunca en CTAs (ahi manda el rojo CREA).
- Nunca compitiendo con el rojo en la misma vista: si el rojo esta en un CTA visible, el acento mostaza aparece solo en label, borde o chip — no en otro CTA ni en fondo de seccion.
- Nunca como fondo de pagina completa.
- Nunca en Tercer Tiempo (TT usa su propio oro `#e6b54a`, mas vibrante).

**Variantes:**
- Default: `#A07A1C`.
- Hover: `#B88A2A` (`--tt-gold-2` equivalente, ya validado).
- Soft / fondo: `rgba(160, 122, 28, 0.12)`.

**Opciones descartadas (para referencia historica, NO usar):**
- A. Verde botella `#0F5132` — descartado.
- C. Oro vibrante TT `#E6B54A` — reservado para TT, no para sitio general.
- D. Violeta profundo `#5B2A86` — descartado.

**Reglas de uso del acento secundario:**
- Solo aparece en: borde superior de seccion, label de categoria, hover de links internos, fondo de tag.
- Nunca como fondo completo de pagina.
- Nunca compitiendo con el rojo en la misma vista — si el rojo esta en un CTA, el acento secundario aparece en un label o borde, no en otro CTA.
- Documentar la eleccion en este doc antes de implementar.

**Neutros (base del sitio):**
- Fondo principal: blanco puro `#FFFFFF` o negro suave `#0E0E10`. NO papel crema `#FAF7F2` (se siente imprenta).
- Texto principal: casi negro `#111111`.
- Texto secundario: gris medio `#6B6B6B`.
- Lineas y bordes: gris muy claro `#E8E8E8`.
- Fondo alternativo (bloques pares): `#F7F7F5` (gris calido muy leve, NO crema).

**Modo oscuro (decidir si va en Fase 4 o se deja para despues):**
- Si va: fondo `#0E0E10`, texto `#F5F5F5`, rojo CREA mas brillante (`#E84A3C`), acento secundario ajustado.
- Toggle en footer o en menu usuario.
- Default: claro (mejor lectura de noticias).

### 6.5 Estilo de articulo / nota — Referencia: "Analisis Cuartos de Final"

**Origen validado:** el equipo ya aprobo visualmente el estilo del articulo de analisis en `~/Descargas/web-PFA/dist/index.html` (React + Tailwind, fuente `src/index.css` y `src/App.jsx`). Se transcribe la receta para reutilizarla en notas largas, analisis y piezas editoriales profundas del sitio general (no solo en TT).

**Paleta del articulo (de `src/index.css`):**

| Token | Valor | Uso |
|-------|-------|-----|
| `--ink` | `#0f172a` | Texto principal |
| `--ink-2` | `#1e293b` | Texto alterno / panel oscuro |
| `--paper` | `#fafaf7` | Fondo principal |
| `--paper-2` | `#f1efe9` | Fondo alternativo |
| `--line` | `#e2e0d8` | Bordes |
| `--line-2` | `#d6d3c7` | Bordes doble |
| `--gold` | `#a07a1c` | Acento editorial (NO amarillo chillón) |
| `--gold-2` | `#b88a2a` | Acento hover |
| `--red` | `#8b1a1a` | Acento critico (mas serio que el rojo CTA) |
| `--red-2` | `#6b1414` | Hover |
| `--muted` | `#64748b` | Texto secundario |
| `--muted-2` | `#94a3b8` | Meta |

**Nota sobre el rojo:** este `#8b1a1a` es el rojo "editorial serio" del articulo de analisis. Es DISTINTO del rojo CREA principal (`#C0392B`, usado en CTAs). Regla: el rojo CREA manda en home/comercial; el rojo editorial `#8b1a1a` manda dentro del cuerpo de notas largas y analisis.

**Tipografia del articulo:**
- **Display masthead/titular principal:** `Playfair Display`, `Georgia`, `Times New Roman`, serif. **Peso 800**. `letter-spacing: -0.01em`. `line-height: 0.95`. Tamanos con `clamp(34px, 6.4vw, 76px)`.
- **Section title (H2 de seccion interna):** misma `Playfair Display`, peso 800, color `--ink`.
- **Eyebrow / kicker:** `Oswald`, sans-serif. `font-weight: 700`. `letter-spacing: 0.25em`. `text-transform: uppercase`. `font-size: 11px`. Color: `--red` para secciones criticas, `--gold-2` para destaque neutral.
- **Cuerpo:** `Inter`, system-ui, sans-serif. 400-600.
- **Stats / datos numericos:** `Oswald` o `Barlow Condensed`, peso 500-800.

**Estructura visual del articulo:**
- **Masthead** centrado: kicker arriba + H1 + meta line con separadores `w-12 h-px bg-slate-300`. Fondo gradient sutil blanco.
- **Max width** del contenido: `max-w-6xl` (1152px). Padding lateral `px-4 sm:px-6`.
- **Bloques:** grid con `gap-8` o `gap-12`. Cada bloque con `border-top: 1px solid var(--line)` (regla simple) o `border-top: 3px double var(--line-2)` (regla doble, separacion fuerte entre secciones).
- **Panel de datos:** fondo `linear-gradient(180deg, #ffffff 0%, #fbfaf5 100%)`, `border-bottom: 1px solid var(--line-2)`.
- **Animaciones de entrada:** `fadeSlideUp 0.55s ease-out` (sutil, sin circo) y `heroIn 0.7s ease-out 0.1s both` para masthead.

**Reglas tipograficas dentro del articulo:**
- Titular principal: `clamp(34px, 6.4vw, 76px)`, line-height `0.95`.
- Subtitulos de seccion (H2): 24-32px, Playfair 800, color `--ink`.
- Eyebrow antes de H2: 11px, Oswald uppercase, tracking `0.25em`, color `--red`.
- Parrafos: 18-19px, line-height 1.65, color `--ink`.
- Blockquotes / datos: font-family serif, italic opcional.
- Tablas / stats: Oswald o Barlow Condensed, numerales tabulares.

**Aplicacion en `apps/web/pages/nota.html`:**
- Adaptar la receta cuando la pieza sea larga (>= 600 palabras) o sea de la categoria deportes/analisis.
- Para notas cortas (< 600 palabras) de local/cultura/opinion, mantener el estilo magazine moderno de §6.0-6.4.
- Header de la nota: usar masthead con kicker de categoria + H1 + meta con separadores `·`.
- Body: usar `max-width: 720px` para lectura comoda (NO 1152px del articulo, eso es para grillas con charts).

**DoD:**
- Pieza de analisis largo se ve coherente con el estilo aprovado en `web-PFA/dist/index.html`.
- Eyebrows con color correcto: rojo para secciones criticas, dorado para destaque neutral.
- Numerales tabulares en todas las stats.
- Animacion de entrada sutil (no obligatoria, agregar si no afecta performance).

---

## 7. SEO y descubrimiento

**Cambios concretos:**
- `<title>` unico por pagina (maximo 60 caracteres).
- `meta description` real por pagina (maximo 155 caracteres).
- Estructura H1 unica por pagina (un solo H1).
- H2/H3 consistentes (no saltar niveles).
- Enlazado interno: cada nota linkea a 2-3 notas relacionadas + 1 a su categoria.
- Open Graph: `og:title`, `og:description`, `og:image`, `og:url`, `og:type=article`.
- Twitter Cards: `summary_large_image`.
- Datos estructurados: `NewsArticle` en notas, `Organization` en portada.
- `sitemap.xml` autogenerado (job o script en build).
- `robots.txt` presente y correcto.
- Imagen destacada correcta al compartir (verificar con Facebook Debugger y Twitter Card Validator).

**DoD:**
- Lighthouse SEO score >=95.
- Todas las paginas tienen `<title>`, `meta description`, `og:image`.

---

## 8. Accesibilidad y performance

**Accesibilidad:**
- Contraste AA minimo (4.5:1 en texto, 3:1 en UI).
- Estados focus visibles (outline custom, NO `outline: none` global).
- `alt` real en TODAS las imagenes (revisar con grep).
- Navegacion por teclado funcional en menu mobile.
- `aria-label` en iconos sin texto.
- `<html lang="es-MX">` (ya esta en `index.html:2`).

**Performance:**
- `loading="lazy"` en imagenes below the fold.
- Imagenes optimizadas (WebP + fallback).
- CSS y JS minificados en build (o al menos sin comentarios innecesarios).
- Reducir dependencias externas (auditar `fonts.googleapis.com`, posibles analytics).
- Critical CSS inline si el primer paint es lento.
- Sin recursos que bloqueen render en `<head>` (auditar `<link rel="stylesheet">`).

**DoD:**
- Lighthouse Performance >=90 en mobile (4G simulada).
- Lighthouse Accessibility >=95.
- Lighthouse Best Practices >=95.

---

## 9. Integracion con operacion real

La pagina publica debe conectarse con la operacion del medio:

| Bloque publico | Origen de datos |
|---------------|-----------------|
| Portada | `piezas_contenido` (`estado='publicada'`) + `metricas_piezas` |
| Secciones | `piezas_contenido` filtradas por `categoria` |
| Nota | 1 fila de `piezas_contenido` |
| Comercial | Formulario -> `prospectos` (via POST backend) |
| Newsletter | Formulario -> tabla suscriptores (definir si en DB o servicio externo) |
| Tercer Tiempo | `piezas_contenido` filtradas por `categoria.slug='deportes'` |

**Regla:** la pagina publica es de solo lectura. Cualquier interaccion (suscripcion, contacto comercial, comentario) llega a la DB via API. La pagina publica nunca escribe directo a tablas.

---

## 10. Fases de implementacion

### Fase 1 — Reorden editorial

**Entradas:** `apps/web/index.html` actual, `apps/web/assets/css/`, `pages/` listado completo.

**Tareas:**
- Rehacer portada con bloques reales (sin contenido, con skeletons que indican "cargando").
- Limpiar navegacion: reducir items, destacar CTAs.
- Remover placeholders de imagenes (reemplazar con imagenes reales o vaciar `src` con fallback CSS).
- Ajustar jerarquia visual del home.

**DoD:**
- Portada muestra estructura final aunque con datos vacios (skeletons).
- Menu simplificado en todas las paginas.
- Cero imagenes con `src=""` o `placeholder` en grep.

---

### Fase 2 — Contenido real

**Entradas:** Fase 1.

**Tareas:**
- Cargar imagenes reales (subir a `apps/web/assets/img/`).
- Definir contenido editorial base (textos del hero, resumen del dia, tagline de secciones).
- Reescribir titulares y bajadas de secciones.
- Mejorar notas y secciones con contenido curado.

**DoD:**
- Minimo 6 piezas reales publicadas en DB (seed o reales).
- Cada seccion tiene al menos 1 pieza para mostrar.
- Imagenes con `alt` real en todas las cards visibles.

---

### Fase 3 — Comercial y conversion

**Entradas:** Fase 2.

**Tareas:**
- Redisenar pagina comercial con bloques de §4.6.
- Conectar CTA "Apoya a CREA" con `/pages/comercial.html`.
- Alinear formulario comercial con CRM interno (endpoint POST a backend).
- Mejorar newsletter: landing dedicada + integracion con portada.
- Captacion: banner de newsletter en portada con preview del titulo del dia.

**DoD:**
- Submit del formulario comercial crea registro en `prospectos` con `origen_descripcion='formulario_comercial'`.
- Landing de newsletter captura email y guarda en suscriptores.
- Banner de newsletter en portada sin遮挡 contenido (no interrumpe lectura).

---

### Fase 4 — Marca y acabado

**Entradas:** Fase 3.

**Tareas:**
- Pulir identidad visual (consistencia de componentes, espaciado, color).
- Reforzar Tercer Tiempo con identidad propia.
- Optimizar SEO (titulos, meta, OG, schema.org).
- Optimizar accesibilidad y rendimiento (Lighthouse).
- Revisar responsive final en dispositivos reales (375, 768, 1024, 1440).

**DoD:**
- Lighthouse mobile >=90 Performance, >=95 Accessibility y Best Practices, >=95 SEO.
- Todas las paginas se ven correctamente en 375px sin scroll horizontal.
- `sitemap.xml` generado y servido.

---

## 11. Criterios de exito

| Criterio | Como se mide |
|----------|-------------|
| Parece un medio activo y no una demo. | Verificacion manual: portada tiene contenido del dia. |
| La portada se entiende en segundos. | Test con 3 personas desconocidas, <5s para decir que hace el sitio. |
| La experiencia en movil es limpia. | Lighthouse mobile + test en 375px. |
| Comercial ayuda a vender. | Formulario envia, prospecto llega al CRM, contacto responde en <24h. |
| La marca se ve consistente. | Auditoria visual: misma tipografia, mismos colores, mismo espaciado en todas las paginas. |
| Las notas rankean en busqueda. | Google Search Console, al menos 1 keyword top 20 en 90 dias. |

---

## 12. Regla base

**La parte publica debe informar primero, convertir despues y nunca parecer relleno.**

**Principios adicionales:**
- Si un bloque no aporta contenido util al lector, se quita.
- Si un CTA no tiene destino real, no se pone.
- Si una imagen es placeholder, no se publica.
- Cada cambio debe pasar por los DoD de su fase. Fase firmada antes de pasar a la siguiente.

---

## 13. Estado de implementacion (2026-06-29)

**Deployado en produccion** (VPS Dokploy, dominio `crea-contenidos.com`).

### Que esta implementado

| Fase | Entregable | Estado |
|------|------------|--------|
| 1 | `apps/web/assets/js/nav.js` (header/footer compartidos via `data-include`) | Hecho |
| 1 | 13/13 paginas usan `data-include` para header | Hecho |
| 1 | Cero imagenes externas en HTML/JS | Hecho |
| 2 | 130 imagenes Unsplash provisionales con keywords contextuales | Hecho |
| 2 | `pickUnsplash()` en `dynamic-articles.js` y `dynamic-content.js` | Hecho |
| 3 | `apps/web/pages/comercial.html` con form conectado a API | Hecho |
| 3 | `/api/comercial/lead.php` crea prospecto con `origen='formulario_comercial'` | Hecho |
| 3 | `/api/newsletter/subscribe.php` unificado a `prospectos` con `origen='newsletter'` | Hecho |
| 3 | Banner `#newsletter-banner` en portada con preview del titular del dia | Hecho |
| 4 | Schema.org `NewsMediaOrganization` en index, `NewsArticle` en nota | Hecho |
| 4 | Open Graph + Twitter Cards en index y nota | Hecho |
| 4 | `sitemap.xml` + `robots.txt` | Hecho |
| 4 | Tokens CSS: `--color-acento` (#A07A1C), TT paleta validada (#e6b54a) | Hecho |
| 4 | A11y: `outline:none` eliminado en 4 selectores de inputs | Hecho |

### Que queda pendiente

| Pendiente | Bloqueado por |
|-----------|---------------|
| Lighthouse mobile >=90 Performance, >=95 A11y/SEO | Medir en Chrome (no automatizable desde CLI) |
| Responsive 375px sin scroll horizontal | Validar visualmente en Chrome DevTools |
| Sustituir imagenes Unsplash por fotos propias de Perote | Contenido real (no es codigo) |
| Social links con URLs reales (Facebook, Instagram, X) | Emmanuel confirma las URLs |
| CTR de banners (newsletter, comercial) y conversion tracking | Analytics (definir herramienta) |

### Como seguir reemplazando imagenes

1. **Imagen individual HTML:** editar el `src` directamente en el archivo.
2. **Imagen en card dinamica:** editar `imagen_destacada` en la pieza (BD o seed).
3. **Set completo:** editar `KEYWORD_MAP` en `scripts/fase2-unsplash-images.py` y re-ejecutar. Y los mapas `UNSPLASH_MAP` / `pickUnsplash()` en `dynamic-articles.js` y `dynamic-content.js`.