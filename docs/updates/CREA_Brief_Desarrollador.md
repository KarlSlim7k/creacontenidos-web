---
title: "CREA CONTENIDOS"
source: "CREA_Brief_Desarrollador.pdf"
converted: "2026-04-14T16:33:26.161991Z"
language: "es"
summary: "CREA Command Center - Brief tecnico 1. Resumen ejecutivo del proyecto CREA Contenidos es un medio digital con estudio de produccion profesional en Perote, Veracruz. Necesitamos construir un sistema (CREA Command Center) que automatice parcialmente la operacion editorial del medio: detectar temas de conversacion publica, generar propuestas de contenido multiformato, presentarlas para aprobacion, y "
---

# CREA CONTENIDOS
Command Center
BRIEF TECNICO PARA DESARROLLO
Especificaciones, arquitectura, APIs y entregables
Documento confidencial - Abril 2026
Para: [Nombre del desarrollador]
De: Emmanuel Reyes Zapata, Director General

CREA Command Center - Brief tecnico
1. Resumen ejecutivo del proyecto
CREA Contenidos es un medio digital con estudio de produccion profesional en Perote, Veracruz.
Necesitamos construir un sistema (CREA Command Center) que automatice parcialmente la operacion
editorial del medio: detectar temas de conversacion publica, generar propuestas de contenido
multiformato, presentarlas para aprobacion, y distribuirlas. Todo esto corriendo en un VPS que ya esta
contratado.

El sitio web actual (crea-contenidos.com) es una maqueta estatica en HTML/CSS/JS que tu construiste.
Este documento describe como evolucionar esa maqueta a un sistema funcional y conectar el backend
de automatizacion editorial.

IMPORTANTE: Nada se publica sin aprobacion humana de Emmanuel. El sistema propone
contenido; Emmanuel (o un editor designado) lo aprueba, edita o rechaza antes de que salga.

2. Infraestructura disponible
2.1 Servidor
| Componente  | Detalle                                            |     |
| ----------- | -------------------------------------------------- | --- |
| Proveedor   | Hostinger VPS - Plan KVM 2                         |     |
| Recursos    | 2 vCPU, 8 GB RAM, 100 GB NVMe SSD, 8 TB bandwidth  |     |
| OS          | Ubuntu (a instalar o ya instalado, confirmar)      |     |
Extras incluidos  OpenClaw (acceso a APIs de IA sin config), Oxylabs (web scraping),
dominio gratis
| Conexion  | Fibra optica. IP dedicada.                    |     |
| --------- | --------------------------------------------- | --- |
| Dominio   | crea-contenidos.com (ya registrado y activo)  |     |

2.2 APIs y suscripciones activas
Emmanuel ya tiene cuentas pagadas en todos estos servicios. Se necesitan las API keys de cada uno:
| Servicio  | Para que se usa  | Tipo de integracion  |
| --------- | ---------------- | -------------------- |
Perplexity Pro  Social listening, investigacion en  Sonar API. Compatible con formato OpenAI.
|     | tiempo real  | $1/M tokens input.  |
| --- | ------------ | ------------------- |
Claude (Anthropic)  Redaccion de contenidos, analisis  API Anthropic. Plan anual activo. Modelo:
|     | editorial  | claude-sonnet-4-20250514.  |
| --- | ---------- | -------------------------- |
ChatGPT / DALL-E  Generacion de imagenes para  API OpenAI. DALL-E 3 para imagenes.
| (OpenAI)  | memes e infografias  |     |
| --------- | -------------------- | --- |

CREA Command Center - Brief tecnico
ElevenLabs Narracion de capsulas de audio API ElevenLabs. Text-to-speech. Plan
mensual.
Suno Jingles y cortinillas (identidad Sin API publica robusta. Uso manual. Los
sonora) assets se suben al VPS como archivos
estaticos.
2.3 Sitio web actual
Aspecto Estado actual
URL crea-contenidos.com
Tecnologia HTML/CSS/JS estatico. Sin backend. Sin CMS. Sin base de datos.
Secciones Inicio, Local, Cultura, Economia, Entretenimiento, Deportes, Opinion,
Tercer Tiempo
Pagina comercial /pages/comercial.html - Tiene estructura de precios y formulario (no
funcional)
Panel admin /admin/login.html - Maqueta visual sin backend
Imagenes Placeholder de picsum.photos. Necesitan reemplazarse con imagenes
reales.
Hosting actual POR CONFIRMAR. Emmanuel debe preguntar donde esta alojado
actualmente.
3. Arquitectura: CREA Command Center
El sistema tiene 4 capas que operan en secuencia. Cada capa se puede desarrollar de forma
independiente e ir conectandolas progresivamente.
3.1 Capa 1: Social Listening
Objetivo: monitorear automaticamente de que se habla en Perote y la region, y generar un feed de
temas relevantes.
Fuentes de datos
Fuente Metodo Frecuencia
Facebook publico (paginas Oxylabs web scraping (incluido Cada 30 minutos
de Perote) con VPS)
Google Trends (region API Google Trends o scraping Cada hora
Perote/Veracruz)

CREA Command Center - Brief tecnico
RSS de noticias Feed RSS parser (Node.js) Cada 15 minutos
locales/estatales
X / Twitter (busqueda por API X (si disponible) o Oxylabs Cada 30 minutos
ubicacion)
Perplexity como meta- Sonar API con query 'noticias Cada 30 minutos
buscador Perote Veracruz hoy'
Output de la Capa 1
Un JSON con temas detectados, ordenados por relevancia/frecuencia:
{ "timestamp": "2026-04-11T14:30:00Z",
"topics": [
{ "topic": "Corte de agua colonia Centro",
"source": "facebook_noticias_perote",
"mentions": 47,
"sentiment": "negative",
"suggested_formats": ["nota","infografia","alerta"] },
{ "topic": "Final basquetbol primera fuerza",
"source": "multiple",
"mentions": 23,
"sentiment": "positive",
"suggested_formats": ["nota","reel","transmision"] }
] }
La Capa 1 se puede implementar primero como un cron job simple que ejecuta la consulta a Perplexity
Sonar API cada 30 minutos y guarda los resultados en una base de datos SQLite o PostgreSQL.
3.2 Capa 2: Motor de contenidos (IA)
Objetivo: tomar los temas detectados y generar propuestas de contenido en multiples formatos, usando
la voz editorial de CREA.
Formatos de salida
Formato Que genera la IA Herramienta
Nota informativa Titulo + cuerpo (300-500 palabras) + Claude API (prompt con voz CREA)
hashtags
Post para redes Texto corto (< 280 chars) + Claude API
sugerencia de imagen
Guion de audio Script para capsula narrada (60-90 Claude API + ElevenLabs API para audio
seg)
Guion de video/reel Script con indicaciones visuales, Claude API
duracion 30-60 seg

CREA Command Center - Brief tecnico
Texto para meme Texto superior + texto inferior + Claude API + DALL-E API para imagen
prompt de imagen
Infografia Datos estructurados + prompt de Claude API + DALL-E o Canva manual
diseño
System prompt para Claude (voz editorial CREA)
Este es el prompt base que define la personalidad editorial. Se envia como system message en cada
llamada a la API de Claude:
NOTA PARA EL DESARROLLADOR: Este prompt debe almacenarse en un archivo de configuracion
editable (no hardcodeado) para que Emmanuel pueda ajustar la voz editorial sin tocar codigo.
system_prompt = """
Eres el editor de CREA Contenidos, el medio digital de Perote, Veracruz.
REGLAS EDITORIALES:
- Escribe con datos verificables. No inventes cifras ni fuentes.
- Tono: informativo, cercano, profesional. No sensacionalista.
- Nunca uses clickbait. Los titulos reflejan fielmente el contenido.
- No emitas juicios de valor en notas informativas.
- Usa lenguaje accesible para la poblacion general de Perote.
- Incluye contexto: que significa el dato, como afecta a la gente.
- Cierra con informacion util: donde, cuando, telefono, etc.
- Nunca ataques a otros medios, personas o instituciones.
- Si un tema es sensible (gobierno, seguridad), presenta solo
datos publicos verificables, sin adjetivos calificativos.
FORMATOS: Adapta el contenido al formato solicitado.
Si es nota: titulo + bajada + cuerpo + datos utiles.
Si es post: texto breve, directo, con emoji moderado.
Si es guion de audio: conversacional, para narrar en 60-90 seg.
Si es meme: ingenioso pero respetuoso. Nunca ofensivo.
"""
3.3 Capa 3: Panel editorial (dashboard)
Objetivo: interfaz web donde Emmanuel (o un editor) revisa las propuestas generadas, las edita,
aprueba o rechaza, y programa su publicacion.
Funcionalidades del panel
Funcion Detalle

CREA Command Center - Brief tecnico
Feed de propuestas Lista de contenidos generados por la IA, ordenados
por relevancia/urgencia. Cada uno con preview del
texto, formato sugerido e imagen (si aplica).
Editor de contenido Campo de texto editable para modificar titulo, cuerpo,
hashtags. Preview en tiempo real de como se vera
publicado.
Botones de accion Aprobar (publica inmediatamente o en horario
programado), Editar, Rechazar (con motivo), Guardar
borrador.
Calendario editorial Vista de calendario con publicaciones programadas.
Drag & drop para mover fechas.
Metricas basicas Visualizaciones, interacciones y seguidores de las
ultimas publicaciones (via API de Facebook/Meta).
Gestion de clientes Lista de anunciantes con su paquete, contenidos
publicados, y boton para generar reporte mensual en
PDF.
Generador de reportes Genera automaticamente el PDF del reporte mensual
para cada anunciante con sus metricas. Se envia por
WhatsApp.
Acceso
• URL: admin.crea-contenidos.com o crea-contenidos.com/admin
• Login basico con usuario y contrasena (no necesita OAuth complejo al inicio).
• Responsivo para que Emmanuel pueda aprobar contenido desde su celular.
3.4 Capa 4: Distribucion
Objetivo: publicar el contenido aprobado en las plataformas correspondientes.
Plataforma Metodo de publicacion Notas
Facebook API de Facebook Pages (Graph API) Requiere token de pagina. Permite
publicar texto, fotos y programar.
Instagram API de Instagram (via Graph API) Requiere cuenta business conectada a
la pagina de FB.
TikTok Manual o API TikTok for Business API limitada. Alternativa: generar el
video y descargarlo listo para subir
manual.
Sitio web Publicacion directa en el CMS El contenido aprobado se convierte en
una pagina del sitio automaticamente.
WhatsApp Link de compartir generado No publicacion directa, pero genera el
automaticamente link con preview para compartir.

CREA Command Center - Brief tecnico
Para la primera version, la distribucion a TikTok puede ser manual (el sistema genera el video/imagen y
Emmanuel lo sube). La automatizacion completa puede venir despues.
4. Orden de desarrollo (prioridades)
No todo se construye al mismo tiempo. Este es el orden recomendado, de lo mas urgente a lo menos:
# Modulo Tiempo estimado Dependencias
1 Migrar sitio web de maqueta a CMS 1-2 semanas Acceso al hosting actual o
migrar a VPS
2 Panel admin basico (login + publicar 1-2 semanas CMS funcionando
notas)
3 Social listening basico (Perplexity 3-5 dias API key de Perplexity +
cron) VPS
4 Motor de contenidos (Claude genera 1 semana API key Claude + listening
propuestas) funcionando
5 Panel editorial (revisar/aprobar 1-2 semanas Motor de contenidos
propuestas) funcionando
6 Distribucion automatica a Facebook 3-5 dias Token de FB Pages +
panel editorial
7 Generador de reportes para 1 semana Metricas de FB
anunciantes conectadas
8 Integracion ElevenLabs (audio 2-3 dias API key ElevenLabs
automatico)
9 Integracion DALL-E (imagenes) 2-3 dias API key OpenAI
PRIORIDAD ABSOLUTA: Los modulos 1 y 2 (sitio funcional + panel admin) son lo primero. Sin sitio
funcional no hay donde publicar. Todo lo demas es acelerador.
5. Stack tecnologico recomendado
Componente Tecnologia sugerida
Backend Node.js con Express (o Next.js si prefieres fullstack). Python (FastAPI) tambien
es opcion valida.
Base de datos PostgreSQL (recomendado) o SQLite para empezar rapido. Para los temas
detectados, contenidos generados, clientes y metricas.
Frontend del sitio El HTML/CSS actual se puede mantener y conectar a un headless CMS, o
migrar a Next.js/Astro para contenido dinamico.

CREA Command Center - Brief tecnico
Panel admin React o Vue. Puede ser un SPA separada en admin.crea-contenidos.com. O
usar un framework admin como AdminJS, Strapi, o Directus.
Cron jobs node-cron o crontab del sistema. Para ejecutar el listening cada 30 min y la
generacion de contenido.
APIs de IA Todas compatibles con HTTP REST. Ver seccion 2.2 para endpoints y
formatos.
Reportes PDF Puppeteer (renderiza HTML a PDF) o jsPDF. El template del reporte ya esta
definido (ver documento Guia Comercial).
Autenticacion JWT basico para el panel admin. No se necesita OAuth complejo al inicio.
Deploy Docker recomendado para facilitar deploys. PM2 para mantener el proceso de
Node vivo.
El desarrollador tiene libertad de elegir el stack con el que se sienta mas comodo. Lo importante es que
cumpla los requisitos funcionales, no la tecnologia especifica.
6. Referencia rapida de APIs
6.1 Perplexity Sonar API
POST https://api.perplexity.ai/chat/completions
Headers: Authorization: Bearer PPLX_API_KEY
Body: {
"model": "sonar-pro",
"messages": [{
"role": "user",
"content": "Que noticias o temas se estan discutiendo
hoy en Perote, Veracruz, Mexico?"
}]
}
Compatible con formato OpenAI. Se puede usar el SDK de OpenAI apuntando a la URL de Perplexity.
6.2 Claude API (Anthropic)
POST https://api.anthropic.com/v1/messages
Headers: x-api-key: ANTHROPIC_API_KEY
anthropic-version: 2023-06-01
Body: {
"model": "claude-sonnet-4-20250514",
"max_tokens": 1024,
"system": "[system prompt de voz CREA]",
"messages": [{
"role": "user",

CREA Command Center - Brief tecnico
"content": "Genera una nota informativa sobre: [tema]"
}]
}
6.3 OpenAI / DALL-E
POST https://api.openai.com/v1/images/generations
Headers: Authorization: Bearer OPENAI_API_KEY
Body: {
"model": "dall-e-3",
"prompt": "[descripcion de la imagen]",
"n": 1,
"size": "1024x1024"
}
6.4 ElevenLabs
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
Headers: xi-api-key: ELEVENLABS_API_KEY
Body: {
"text": "[texto a narrar]",
"model_id": "eleven_multilingual_v2"
}
Response: audio/mpeg (archivo de audio directo)
7. Generador de reportes para anunciantes
Uno de los diferenciadores clave de CREA es que cada anunciante recibe mensualmente un reporte
PDF con las metricas de sus publicaciones. El sistema debe generar esto automaticamente.
Datos del reporte
• Nombre del cliente y paquete contratado.
• Periodo (mes/ano).
• Tabla de publicaciones del mes: fecha, tipo de contenido, visualizaciones, interacciones.
• Totales: visualizaciones totales, interacciones totales.
• Costo por cada 1,000 personas alcanzadas (CPM = inversion / views * 1000).
• Comparativo con mes anterior (% de cambio).
• Numero de factura.
• Mensaje de agradecimiento.
El template visual del reporte ya esta definido en el documento 'Guia Comercial' que Emmanuel tiene.
Usar ese diseno como referencia.

CREA Command Center - Brief tecnico
8. Estructura de datos sugerida
Tablas principales
Tabla Campos clave Proposito
topics id, title, source, mentions, sentiment, Temas detectados por el listening
detected_at, status
content_proposals id, topic_id, format, title, body, Contenidos generados por IA
image_prompt, status, created_at
published_content id, proposal_id, platform, published_at, Contenido aprobado y publicado
url, views, interactions
clients id, name, business_name, package, Anunciantes/clientes de publicidad
phone, email, start_date, active
client_content id, client_id, content_id, type, Relacion entre cliente y su contenido
published_at patrocinado
reports id, client_id, month, year, pdf_url, Reportes mensuales generados
sent_at
users id, name, email, password_hash, role Usuarios del panel admin (Emmanuel,
editores)
9. Protocolo de transparencia en IA
CREA tiene un codigo de etica que requiere etiquetar el contenido segun el nivel de asistencia de IA:
Etiqueta Cuando se usa
100% humano Entrevistas transcritas manualmente, cronicas presenciales, reporteo directo.
Asistido por IA IA usada en investigacion, borrador o produccion. Revision humana completa. (La
mayoria del contenido sera este.)
Generado con IA Contenido producido principalmente por IA bajo supervision. Alertas de clima,
resumenes de datos publicos.
El panel admin debe incluir un selector de etiqueta de IA al momento de aprobar cada contenido. Esta
etiqueta se muestra al publico en la publicacion.
10. Entregables esperados
# Entregable Criterio de aceptacion

CREA Command Center - Brief tecnico
1 Sitio web funcional con CMS Puedo publicar notas desde un panel sin
tocar codigo.
2 Panel admin con login Acceso protegido. CRUD de contenidos.
Vista responsiva.
3 Social listening basico Cada 30 min me llega un feed de temas de
Perote.
4 Motor de contenidos IA Dado un tema, genera propuestas en al
menos 3 formatos.
5 Panel editorial Puedo ver propuestas, editarlas, aprobarlas o
rechazarlas.
6 Publicacion en Facebook Al aprobar, se publica automaticamente en la
pagina de FB.
7 Generador de reportes PDF Genera PDF por cliente con metricas del
mes.
8 Audio automatico (ElevenLabs) Genera MP3 narrado a partir de una nota
aprobada.
9 Imagenes automaticas (DALL-E) Genera imagen a partir de un prompt
sugerido por Claude.
11. Contacto y coordinacion
Concepto Detalle
Cliente Emmanuel Reyes Zapata - Director General CREA Contenidos
Comunicacion WhatsApp para coordinacion diaria. Reuniones semanales de avance
(pueden ser en la sala de juntas del estudio).
Repositorio GitHub privado (Emmanuel da acceso). Commits con mensajes claros.
Documentos de referencia Marco Editorial v2, Media Kit 2026, Guia Comercial, Documento Maestro
(Emmanuel los tiene todos).
API Keys Emmanuel proporciona las keys via canal seguro. NUNCA se hardcodean
en el repositorio. Usar .env.
SEGURIDAD: Todas las API keys van en archivo .env, NUNCA en el codigo. El archivo .env se
agrega a .gitignore. Las keys se comparten por canal seguro, no por chat ni email.
CREA Contenidos - Brief tecnico para desarrollo
Abril 2026 - Documento confidencial
