---
title: "CREA CONTENIDOS"
source: "CREA_Social_Listening.pdf"
converted: "2026-04-14T16:33:26.231260Z"
language: "es"
summary: "CREA - Social Listening Specs 1. Contexto: por que necesitamos social listening CREA Contenidos necesita saber en tiempo real de que habla la gente de Perote en Facebook, TikTok e Instagram. Esto alimenta el motor de generacion de contenidos: el sistema detecta temas, propone publicaciones y Emmanuel aprueba. Sin listening, CREA publica a ciegas. Con listening, CREA publica lo que la gente ya esta"
---

# CREA CONTENIDOS
Command Center
SOCIAL LISTENING
Facebook + TikTok + Instagram
Especificaciones tecnicas para el desarrollador
Addendum al Brief Tecnico - Abril 2026

CREA - Social Listening Specs
1. Contexto: por que necesitamos social listening
CREA Contenidos necesita saber en tiempo real de que habla la gente de Perote en Facebook, TikTok
e Instagram. Esto alimenta el motor de generacion de contenidos: el sistema detecta temas, propone
publicaciones y Emmanuel aprueba. Sin listening, CREA publica a ciegas. Con listening, CREA publica
lo que la gente ya esta buscando.
El problema: Meta cerro CrowdTangle en agosto de 2024, la herramienta gratuita que todos usaban
para monitorear Facebook. Ya no existe acceso facil a datos de paginas publicas via API oficial de
Meta. La solucion es un enfoque hibrido con dos capas.
2. Arquitectura de social listening: dos capas
CAPA 1: Deteccion rapida CAPA 2: Monitoreo profundo
Perplexity Sonar API Apify Scrapers
Detecta temas generales de Perote en la web, noticias Monitorea paginas especificas de Facebook, TikTok e
y redes. Rapido de implementar. Sin configuracion Instagram. Extrae posts, engagement, comentarios.
compleja. Analisis de competencia.
Cada 30 minutos Cada 2-4 horas o diario
Costo: ~$1 USD por millon de tokens Costo: ~$0.35 USD por 1,000 posts + plan Apify
desde $49/mes
Ambas capas se complementan. Perplexity te dice 'de que se habla en Perote hoy'. Apify te dice 'que esta
publicando Noticias Perote y cuanto engagement tiene'. Juntas, tienes el panorama completo.
3. Capa 1: Perplexity Sonar API (deteccion rapida)
Ya lo tienes en el brief anterior. Aqui el resumen rapido:
Endpoint
POST https://api.perplexity.ai/chat/completions
Authorization: Bearer PPLX_API_KEY
{ "model": "sonar-pro",
"messages": [{
"role": "system",
"content": "Eres un analista de medios enfocado en Perote, Veracruz, Mexico.
Tu trabajo es identificar los temas mas relevantes de las ultimas horas.

CREA - Social Listening Specs
Responde en formato JSON con un array de temas, cada uno con:
topic, source, relevance (1-10), sentiment, suggested_formats."
}, {
"role": "user",
"content": "Que temas se estan discutiendo hoy en Perote, Veracruz?
Busca en Facebook, noticias locales, redes sociales y Google Trends.
Enfocate en: gobierno local, servicios publicos, deportes, cultura,
clima, economia, seguridad, eventos comunitarios."
}]
}
Frecuencia
Cron job cada 30 minutos. Los resultados se guardan en la tabla 'topics' de la base de datos.
4. Capa 2: Apify Scrapers (monitoreo profundo)
Esta es la parte nueva. Apify es una plataforma de web scraping que tiene scrapers especializados para
Facebook, TikTok e Instagram. Funcionan con contenido publico, no requieren API keys de Meta, y se
pueden programar para correr automaticamente.
4.1 Facebook: paginas y grupos de Perote
Que monitorear
Pagina / Grupo URL Por que
Noticias Perote y la Region facebook.com/NoticiasPerote Competidor principal. 241K
seg. Ver que publican y que
engagement tiene.
Perote Al Momento facebook.com/perotealmomento Segundo competidor. 197K
seg.
La Voz del Pinahuizapan [URL por confirmar] Competidor menor.
Ayuntamiento de Perote facebook.com/PeroteTrasciendeContigo Fuente de informacion oficial
del gobierno local.
Grupos de Perote Buscar: 'Perote Veracruz' en grupos Donde la gente comenta, se
publicos queja y propone. La voz
ciudadana real.
CREA Contenidos (propia) facebook.com/100079776720617 Monitorear nuestro propio
engagement y comparar.
Scraper recomendado
Herramienta Detalle
Actor apify/facebook-posts-scraper

CREA - Social Listening Specs
Que extrae Texto del post, fecha, reacciones (like, love, haha, etc.), comentarios,
compartidos, URL de imagen/video, tipo de contenido.
Costo ~$0.35 USD por cada 1,000 posts extraidos.
Requiere login No para paginas publicas. Si para grupos privados (no los usamos).
Proxies Si, se recomiendan proxies residenciales. Apify los incluye en planes de
pago.
Programacion Se puede programar via API de Apify o con cron desde el VPS.
Integracion con el VPS
Opcion A: Usar la API de Apify directamente desde Node.js en el VPS:
const { ApifyClient } = require('apify-client');
const client = new ApifyClient({ token: 'APIFY_TOKEN' });
// Ejecutar el scraper de Facebook Posts
const run = await client.actor('apify/facebook-posts-scraper').call({
startUrls: [
{ url: 'https://www.facebook.com/NoticiasPerote' },
{ url: 'https://www.facebook.com/perotealmomento' }
],
maxPosts: 20, // ultimos 20 posts de cada pagina
});
// Obtener resultados
const { items } = await client.dataset(run.defaultDatasetId).listItems();
// items = array de posts con texto, engagement, etc.
Opcion B: Usar Oxylabs (incluido gratis con el VPS de Hostinger) como alternativa de scraping, pero
requiere mas configuracion manual. Apify es plug-and-play.
Que hacer con los datos de Facebook
Una vez que el scraper extrae los posts de la competencia, el sistema debe:
• Guardar los posts en la tabla 'competitor_posts' de la base de datos.
• Analizar con Claude que temas estan generando mas engagement en la competencia.
• Identificar temas que CREA aun no ha cubierto.
• Proponer contenido sobre esos temas usando el motor de IA.
• Generar un reporte semanal de actividad de la competencia para Emmanuel.
4.2 TikTok
Scraper recomendado

CREA - Social Listening Specs
Herramienta Detalle
Actor apify/tiktok-scraper o clockworks/tiktok-scraper
Que extrae Videos por hashtag, por usuario, por keyword. Views, likes, comentarios,
shares, audio usado, texto.
Keywords a monitorear #Perote, #PeroteVeracruz, #CofreDePerote, #ValleDePerote, busquedas
por ubicacion.
Frecuencia Cada 4-6 horas (TikTok es mas agresivo bloqueando scrapers
frecuentes).
Costo Similar a Facebook. Varia por actor.
Lo que buscamos en TikTok: que contenido de Perote se esta haciendo viral, que formatos funcionan,
que musica/audio se usa, que hashtags tienen traccion. Esto alimenta directamente la estrategia de
reels de CREA.
4.3 Instagram
Herramienta Detalle
Actor apify/instagram-scraper o zuzka/instagram-profile-scraper
Que extrae Posts, reels, stories publicas, hashtags, engagement, seguidores.
Que monitorear Hashtags locales (#Perote, #PeroteVeracruz), cuentas de competidores si
existen, influencers locales.
Frecuencia Cada 6-12 horas (Instagram es el mas restrictivo).
5. Flujo completo del social listening
Asi funciona todo junto, paso a paso:
# Paso Herramienta Frecuencia
1 Deteccion general de temas Perplexity Sonar API Cada 30 min
2 Scraping de paginas FB Apify Facebook Posts Scraper Cada 2-4 hrs
competencia
3 Scraping de TikTok (#Perote) Apify TikTok Scraper Cada 4-6 hrs
4 Scraping de Instagram Apify Instagram Scraper Cada 6-12 hrs
(hashtags)
5 Analisis cruzado con IA Claude API Despues de cada ciclo
6 Propuestas de contenido Claude API Automatico
generadas

CREA - Social Listening Specs
| 7  Emmanuel revisa y aprueba  | Panel editorial  | Manual  |
| ----------------------------- | ---------------- | ------- |

Prompt de analisis cruzado (Claude)
Despues de cada ciclo de scraping, se envia a Claude un resumen de lo encontrado:

"Eres el editor de CREA Contenidos. Analiza los siguientes datos
 de social listening de Perote, Veracruz:

 TEMAS DETECTADOS POR PERPLEXITY: [JSON de temas]
 POSTS RECIENTES DE NOTICIAS PEROTE: [JSON de posts]
 POSTS RECIENTES DE PEROTE AL MOMENTO: [JSON de posts]
 TIKTOKS TRENDING CON #PEROTE: [JSON de videos]

 Con base en esta informacion:
 1. Identifica los 5 temas mas relevantes para publicar HOY.
 2. Para cada tema, indica que formato funciona mejor
    (nota, reel, infografia, audio, meme).
 3. Indica si algun competidor ya lo cubrio y como lo hizo.
 4. Sugiere un angulo editorial diferenciado para CREA.
 5. Clasifica cada tema en la escala verde/amarillo/rojo
    de sensibilidad editorial."

6. Tabla de base de datos adicional

| Campo  Tipo y descripcion                                  |     |     |
| ---------------------------------------------------------- | --- | --- |
| id  INTEGER PRIMARY KEY                                    |     |     |
| source_platform  TEXT - 'facebook', 'tiktok', 'instagram'  |     |     |
source_account  TEXT - nombre o URL de la pagina/cuenta monitoreada
| post_url  TEXT - URL del post original          |     |     |
| ----------------------------------------------- | --- | --- |
| post_text  TEXT - contenido textual del post    |     |     |
| post_date  DATETIME - fecha de publicacion      |     |     |
| reactions  INTEGER - total de reacciones/likes  |     |     |
| comments  INTEGER - total de comentarios        |     |     |
| shares  INTEGER - total de compartidos          |     |     |
views  INTEGER - visualizaciones (si disponible, especialmente TikTok)
| media_type  TEXT - 'text', 'image', 'video', 'reel', 'live'  |     |     |
| ------------------------------------------------------------ | --- | --- |
| scraped_at  DATETIME - cuando se extrajo el dato             |     |     |

CREA - Social Listening Specs
| analyzed  BOOLEAN - si ya fue procesado por Claude  |     |     |     |     |
| --------------------------------------------------- | --- | --- | --- | --- |

Nombre sugerido de la tabla: competitor_posts

7. Costos estimados del social listening

| Componente  | Costo mensual est.  |     | Notas  |     |
| ----------- | ------------------- | --- | ------ | --- |
Perplexity Sonar API  $5-15 USD  ~48 consultas/dia x 30 dias. $1/M
tokens.
Apify plan Starter  $49 USD  Incluye $49 en creditos. Suficiente para
~140K posts/mes.
Claude API (analisis)  $10-20 USD  Analisis cruzado cada ciclo. Sonnet es
economico.
Proxies (si Apify no incluye)  $0-10 USD  Apify Starter incluye proxies basicos.
| TOTAL LISTENING  | $64-94 USD/mes  |     | ~$1,200-1,500 MXN/mes  |     |
| ---------------- | --------------- | --- | ---------------------- | --- |

El plan Pro de Perplexity que Emmanuel ya paga ($20/mes) incluye $5 USD en creditos API. Los creditos
de Apify pueden empezar con el plan gratuito (limitado) y escalar al Starter cuando se necesite.

8. Implementacion por fases

| #  Modulo                                 |     | Tiempo    |     | Prioridad          |
| ----------------------------------------- | --- | --------- | --- | ------------------ |
| 1  Perplexity cron job (cada 30 min)      |     | 1-2 dias  |     | INMEDIATA          |
| 2  Apify Facebook scraper (competencia)   |     | 2-3 dias  |     | ALTA               |
| 3  Almacenamiento en BD + vista en panel  |     | 2-3 dias  |     | ALTA               |
| 4  Analisis cruzado con Claude            |     | 1-2 dias  |     | MEDIA              |
| 5  Apify TikTok scraper (#Perote)         |     | 1-2 dias  |     | MEDIA              |
| 6  Apify Instagram scraper                |     | 1-2 dias  |     | BAJA (IG es menos  |
relevante hoy)
| 7  Reporte semanal automatizado de  |     | 2-3 dias  |     | MEDIA  |
| ----------------------------------- | --- | --------- | --- | ------ |
competencia

NOTA LEGAL: Solo se monitorea contenido publico. No se accede a cuentas privadas, grupos
cerrados ni informacion protegida. Todo el scraping es de paginas publicas visibles sin login.

CREA - Social Listening Specs
9. Output final para Emmanuel
Lo que Emmanuel ve en su panel cada manana:
• 'Hoy se habla de...' - Top 5 temas de Perote con fuente y nivel de engagement.
• 'La competencia publico...' - Resumen de los posts mas exitosos de Noticias Perote y Perote Al
Momento en las ultimas 24 horas.
• 'CREA deberia publicar...' - 3-5 propuestas de contenido generadas por Claude, con formato
sugerido, angulo diferenciado y clasificacion de sensibilidad.
• 'En TikTok esta trending...' - Videos virales con #Perote o contenido relevante de la region.
• Boton de 'Aprobar', 'Editar' o 'Rechazar' en cada propuesta.
El objetivo no es abrumar a Emmanuel con datos. Es presentarle cada dia un menu curado de opciones
editoriales listas para aprobar. Menos de 5 minutos de revision para mantener CREA publicando contenido
relevante todos los dias.
CREA Contenidos - Addendum: Social Listening
Documento complementario al Brief Tecnico principal
Abril 2026 - Confidencial
