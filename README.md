# CREA Contenidos — Prototipo Visual

## 🏔️ Sobre este proyecto

Prototipo visual de alta fidelidad del sitio web **crearcontenidos.com**, el medio digital de referencia para Perote, Veracruz y el corredor Perote–Xalapa–Puebla.

CREA opera bajo el paradigma de "medio humano aumentado por inteligencia artificial" y este prototipo demuestra su identidad editorial, arquitectura de información y experiencia de usuario.

## 📁 Estructura del proyecto

```
crea-prototipo/
├── index.html              # Portada editorial (página principal)
├── nota.html               # Plantilla de nota informativa individual
├── seccion.html            # Página de sección/categoría (ej: Local)
├── colaboradores.html      # Perfiles del equipo editorial
├── comunidad.html          # Comunidad: envío de ideas + mapa de red
├── comercial.html          # Página comercial / media kit
├── assets/
│   ├── css/
│   │   ├── main.css        # Variables CSS, reset, tipografía, utilidades
│   │   ├── components.css  # Componentes: nav, cards, footer, formularios
│   │   └── responsive.css  # Media queries mobile-first
│   ├── js/
│   │   ├── main.js         # Navegación, sticky header, fecha dinámica, reveals
│   │   ├── carousel.js     # Carrusel con autoplay, swipe y teclado
│   │   └── interactions.js # Parallax, contadores, tilt, progress bar
│   └── img/
│       └── README.md       # Instrucciones para imágenes placeholder
└── README.md               # Este archivo
```

## 🎨 Identidad visual

- **Paleta cromática**: Noche serrana (#1A1A2E), Papel (#FAF7F2), Rojo editorial (#C0392B), Naranja volcánico (#E67E22)
- **Tipografía**: Playfair Display (titulares), Source Sans 3 (cuerpo), Lora (acentos)
- **Atmósfera**: Textura de papel sutil, sombras cálidas, bordes editoriales

## 🚀 Cómo usar

1. Abre `index.html` en tu navegador
2. Navega entre las páginas usando los links del menú y las notas
3. Prueba la responsividad redimensionando la ventana

**No requiere servidor web, npm, ni dependencias.** Es 100% HTML/CSS/JS vanilla.

## 📱 Breakpoints responsive

| Dispositivo      | Ancho       |
|------------------|-------------|
| Mobile           | < 640px     |
| Tablet           | ≥ 640px     |
| Desktop pequeño  | ≥ 1024px    |
| Desktop grande   | ≥ 1280px    |

## ⚙️ Tecnologías

- HTML5 semántico
- CSS3 con Custom Properties
- JavaScript vanilla (ES6+)
- Google Fonts (Playfair Display, Source Sans 3, Lora)
- SVG inline para íconos
- Imágenes placeholder via picsum.photos y pravatar.cc

## 📋 Notas

- Todo el contenido es ficticio pero realista para Perote, Veracruz
- Los formularios previenen el envío real y muestran confirmación visual
- Las imágenes se cargan desde servicios externos de placeholder
- Sin dependencias externas de JS o CSS

---

*Prototipo construido para CREA Contenidos — Perote, Veracruz, México 🇲🇽*
