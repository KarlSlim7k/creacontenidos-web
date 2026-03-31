# Imágenes — CREA Contenidos

## Placeholders utilizados

Este prototipo usa servicios externos de placeholder para todas las imágenes:

### Imágenes editoriales
- **Servicio**: [picsum.photos](https://picsum.photos)
- **Formato**: `https://picsum.photos/seed/{nombre}/ancho/alto`
- **Ejemplo**: `https://picsum.photos/seed/perote-niebla/1400/700`

### Fotos de autor
- **Servicio**: [pravatar.cc](https://i.pravatar.cc)
- **Formato**: `https://i.pravatar.cc/{tamaño}?img={número}`
- **Ejemplo**: `https://i.pravatar.cc/80?img=11`

## Para producción

Reemplazar las URLs de placeholder con imágenes reales:

1. Fotografías editoriales de Perote y la región
2. Fotos de perfil reales del equipo
3. Logo CREA en formato SVG
4. Imágenes de patrocinadores

### Tamaños recomendados

| Uso                  | Dimensiones   | Formato  |
|----------------------|---------------|----------|
| Hero principal       | 1400 × 700    | WebP/JPG |
| Card de nota         | 400 × 250     | WebP/JPG |
| Foto de autor        | 80 × 80       | WebP/PNG |
| Perfil colaborador   | 100 × 100     | WebP/PNG |
| Banner patrocinador  | 800 × 200     | WebP/PNG |
| Imagen de artículo   | 1200 × 600    | WebP/JPG |

Todas las imágenes deben incluir atributos `alt` descriptivos y `loading="lazy"`.
