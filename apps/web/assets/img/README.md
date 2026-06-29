# Imágenes — CREA Contenidos

## Estado actual (post-Fase 2)

Las imagenes del sitio son **provisionales** desde Unsplash (gratis, sin atribucion obligatoria). Cada placeholder apunta a una foto tematica segun el `aria-label`:

| Keyword en aria-label | Foto Unsplash |
|-----------------------|---------------|
| niebla, cofre, carretera, perote | paisaje mexicano / niebla / carretera |
| cafe, feria, danza, cultura, mural | cultura y eventos |
| futbol, basquet, beisbol, deporte | deportes |
| papa, agricultura, productor, mercado | economia regional |
| opinion, autor, avatar | editorial / retrato |

## Reemplazo cuando llegue foto real

**Para una imagen individual:** cambiar el `src` directamente en el archivo HTML o JS.

**Para reescribir el set completo:** editar el mapa `KEYWORD_MAP` en:

- `scripts/fase2-unsplash-images.py` — script para regenerar HTML estatico.
- `apps/web/assets/js/dynamic-articles.js` — funcion `UNSPLASH_MAP` + `pickUnsplash()`.
- `apps/web/assets/js/dynamic-content.js` — funcion `pickUnsplash()`.

## Imagenes locales en el repo

| Archivo | Ubicacion | Uso |
|---------|-----------|-----|
| `logo-crea.png` | `apps/web/assets/img/public/` | Header, footer, branding |
| `logo-tt.png` | `apps/web/assets/img/public/` | Header de Tercer Tiempo |
| (vacio) | `apps/web/assets/img/generated/` | Generadas por servicios IA |

## Tamaños de referencia

| Uso                  | Dimensiones   | Formato  |
|----------------------|---------------|----------|
| Hero principal       | 1400 × 700    | WebP/JPG |
| Card de nota         | 400 × 250     | WebP/JPG |
| Foto de autor        | 80 × 80       | WebP/PNG |
| Perfil colaborador   | 100 × 100     | WebP/PNG |
| Banner patrocinador  | 800 × 200     | WebP/PNG |
| Imagen de articulo   | 1200 × 600    | WebP/JPG |

Todas las imagenes deben incluir atributos `alt` descriptivos y `loading="lazy"`.

## Reglas para contenido real

1. **Atribucion:** si la foto es de banco (Unsplash, Pexels, etc) y el banco lo pide, agregar credito en `<figcaption>` o metadata.
2. **Peso:** comprimir a WebP antes de subir. Apuntar a <150KB por card, <400KB por hero.
3. **Alt:** descriptivo, no generico. Mal: `"imagen"`. Bien: `"Niebla sobre la autopista Perote-Xalapa al amanecer"`.
4. **Cropping:** usar `?w=800&q=80&auto=format&fit=crop` (Unsplash) o `object-fit: cover` para mantener proporcion.