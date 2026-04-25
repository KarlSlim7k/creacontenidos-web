**CREA CONTENIDOS**

**CANVA PRO + BULK CREATE**

*Capa de produccion visual automatizada*

Addendum al flujo del Command Center

*Abril 2026*

# **1. Canva Pro como capa de produccion visual del Command Center**

CREA tiene Canva Pro. Canva Pro tiene una funcion llamada 'Crear en lote' (Bulk Create) que permite generar decenas o cientos de disenos a partir de una sola plantilla conectada a una tabla de datos. Esto se integra al flujo del Command Center como la capa que convierte los textos generados por IA en piezas visuales profesionales sin necesidad de un disenador grafico.

|  |
| --- |
| **IA genera los textos + Canva Pro los convierte en disenos profesionales en masa = produccion visual ilimitada con branding consistente.** |

# **2. Como funciona Bulk Create en Canva**

El proceso es simple y se repite igual para cada aplicacion:

|  |  |  |
| --- | --- | --- |
| **#** | **Paso** | **Que haces** |
| **1** | Crear la plantilla maestra | Disenas UNA pieza con el branding de CREA (colores #CC2936, #0A8F6C, #0F1B2D, logo, tipografia). Los elementos que cambian los marcas como campos dinamicos. |
| **2** | Preparar la tabla de datos | Claude genera los textos (titulos, cuerpos, datos). Los organizas en CSV o los pegas directo en Canva. Cada fila = un diseno. |
| **3** | Conectar campos | En Canva: Apps > Crear en lote > Introducir datos manualmente (o subir CSV). Conectas cada columna a un campo de texto de la plantilla. |
| **4** | Generar | Un clic. Canva genera todas las paginas/disenos automaticamente con los datos de cada fila. |
| **5** | Exportar | Descargas como PDF (para impresion o reportes), PNG (para redes) o directamente programas en redes desde Canva. |

# **3. Aplicaciones especificas en el flujo de CREA**

## **3.1 Buenos dias, Perote — Imagen diaria del newsletter**

|  |  |
| --- | --- |
| **Elemento** | **Detalle** |
| **Que se produce** | Imagen de portada del newsletter/post diario. Fondo con branding CREA + fecha + titular de la nota del dia. |
| **Plantilla Canva** | 1080x1080px (cuadrada para FB/IG) o 1080x1920px (stories/reels). Logo CREA arriba, fecha dinamica, titular dinamico, icono de clima. |
| **Datos que genera Claude** | Tabla con columnas: fecha, dia\_semana, titular, temperatura, icono\_clima. |
| **Frecuencia de produccion** | Se pueden generar los 5 del lunes al viernes en una sola sesion los domingos en la noche. O los 20 del mes de una vez. |

### **Prompt para Claude (genera la tabla de datos)**

"Genera una tabla CSV con 20 filas para el newsletter

Buenos dias, Perote. Cada fila tiene estas columnas:

fecha, dia\_semana, titular\_nota\_principal, temperatura\_aprox,

icono\_clima (sol/nube/lluvia/niebla/frio).

Los titulares deben ser informativos, breves (max 60 chars),

sobre temas reales y relevantes para Perote, Veracruz.

Periodo: 1 al 20 de mayo de 2026."

|  |
| --- |
| El resultado se pega directo en Canva > Crear en lote. En 2 minutos tienes 20 imagenes de portada listas para todo el mes. |

## **3.2 Reportes mensuales para anunciantes**

|  |  |
| --- | --- |
| **Elemento** | **Detalle** |
| **Que se produce** | PDF de 1-2 paginas por cliente con metricas del mes: views, interacciones, publicaciones, CPM, comparativo. |
| **Plantilla Canva** | A4 vertical. Header con logo CREA + nombre del cliente. Tabla de publicaciones. Totales destacados. Comparativo. Mensaje de cierre. |
| **Datos que genera el sistema** | Tabla con columnas: nombre\_cliente, paquete, periodo, pub1\_fecha, pub1\_tipo, pub1\_views, pub1\_interacciones, total\_views, total\_interacciones, cpm, cambio\_vs\_anterior, num\_factura. |
| **Produccion** | El dia 1 de cada mes se genera la tabla con los datos de todos los clientes. Se conecta a la plantilla. Canva genera todos los reportes. Se exportan como PDF individual y se envian por WhatsApp con la factura. |

|  |
| --- |
| *Mientras el Command Center no genere los reportes automaticamente, este flujo Canva es la solucion intermedia perfecta. Cuando el sistema este listo, este proceso se automatiza con Puppeteer generando PDFs. Pero hoy, Canva + Bulk Create lo resuelve.* |

## **3.3 El dato del dia — Contenido diario para reels y posts**

|  |  |
| --- | --- |
| **Elemento** | **Detalle** |
| **Que se produce** | Imagen con un dato curioso, historico o estadistico sobre Perote. 1 por dia. Se publica como post o se anima como reel con musica. |
| **Plantilla Canva** | 1080x1080px. Fondo oscuro (navy) con acento de color. Texto grande del dato. Fuente del dato abajo. Logo CREA. |
| **Prompt para Claude** | 'Genera 30 datos curiosos, historicos o estadisticos sobre Perote, Veracruz. Cada dato en maximo 80 caracteres. Formato CSV: numero, dato, fuente.' |
| **Produccion** | 30 datos generados por Claude > tabla pegada en Canva > 30 imagenes generadas > programadas para todo el mes. |

|  |
| --- |
| Tiempo total de produccion: 15 minutos para generar 30 disenos. Un mes de contenido diario. El alumno de servicio social puede encargarse de esto completamente. |

## **3.4 Posts para clientes PYME**

|  |  |
| --- | --- |
| **Elemento** | **Detalle** |
| **Que se produce** | 4 posts semanales por cliente con imagen profesional. Copy + imagen con branding del negocio. |
| **Plantilla Canva** | 1080x1080px. Foto del negocio o producto como fondo. Texto del copy sobre overlay semitransparente. Logo del negocio + logo CREA. |
| **Prompt para Claude** | 'Genera 4 copys de redes sociales para [nombre negocio], un/a [tipo de negocio] en Perote. Cada copy: titular (max 40 chars) + texto (max 120 chars) + 3 hashtags. Tono cercano, local.' |
| **Produccion** | Claude genera los 4 copys > se pegan en la tabla de Canva > 4 posts con diseno profesional listos para programar. |

**Escalabilidad:** con 10 clientes PYME, necesitas 40 posts al mes. Sin Bulk Create eso son horas de diseno. Con Bulk Create son 10 minutos por cliente = menos de 2 horas para todos los clientes del mes.

## **3.5 Media kit visual**

|  |  |
| --- | --- |
| **Elemento** | **Detalle** |
| **Que se produce** | 12 paginas del media kit con datos reales de audiencia, servicios, precios e infraestructura. |
| **Plantilla Canva** | A4 vertical. Plantilla maestra con slots para: titulo, subtitulo, dato\_grande, dato\_descripcion, imagen\_fondo. |
| **Datos** | Los textos ya los tienes en el documento de prompts del media kit. Se organizan en tabla y se conectan. |
| **Produccion** | Las imagenes de fondo se generan con DALL-E usando los prompts del documento. Los textos se conectan via Bulk Create. Resultado: media kit con diseno premium. |

## **3.6 Graficos para transmisiones deportivas**

|  |  |
| --- | --- |
| **Elemento** | **Detalle** |
| **Que se produce** | Lower thirds, tarjetas de alineacion, marcadores, graficos de estadisticas para transmisiones en vivo. |
| **Plantilla Canva** | 1920x1080px (16:9 para vMix). Fondo transparente (PNG). Nombre del jugador + numero + posicion como campos dinamicos. |
| **Datos** | Tabla con alineacion de ambos equipos: nombre, numero, posicion. Se genera antes de cada partido. |
| **Produccion** | La tabla de alineacion se conecta a la plantilla > Canva genera las 10-12 tarjetas de jugadores > se exportan como PNG transparente > se cargan en vMix como overlays. |

|  |
| --- |
| Esto le da a tus transmisiones deportivas un look de television profesional. Imagina que cada vez que Magno menciona a un jugador, aparece su tarjeta con nombre, numero y foto. Eso no lo hace ningun otro medio en Perote. |

# **4. Flujo integrado: Command Center + Canva Pro**

Asi queda el flujo completo con Canva integrada como capa de diseno:

|  |  |  |  |
| --- | --- | --- | --- |
| **#** | **Paso** | **Herramienta** | **Output** |
| **1** | Social listening detecta temas | Perplexity + Apify | Temas relevantes del dia |
| **2** | IA genera textos multiformato | Claude API | Notas, copys, guiones, datos |
| **3** | IA genera imagenes si se requieren | DALL-E / ChatGPT | Imagenes para posts o memes |
| **4** | IA genera audio si se requiere | ElevenLabs | Capsulas narradas, podcast |
| **5** | CANVA convierte textos en disenos | Canva Pro + Bulk Create | Posts, reportes, graficos, media kit |
| **6** | Emmanuel revisa y aprueba | Panel editorial | Contenido listo para publicar |
| **7** | Distribucion multicanal | FB API + manual | Publicado en todas las plataformas |

|  |
| --- |
| **Canva Pro es el paso 5: la capa de diseno entre la generacion de contenido (IA) y la aprobacion editorial (Emmanuel). Convierte texto en imagen profesional sin disenador.** |

# **5. Plantillas que necesitas crear en Canva (una sola vez)**

|  |  |  |  |
| --- | --- | --- | --- |
| **#** | **Plantilla** | **Tamano** | **Campos dinamicos** |
| **1** | Buenos dias, Perote (portada diaria) | 1080x1080px | fecha, dia, titular, temperatura |
| **2** | El dato del dia | 1080x1080px | numero, dato, fuente |
| **3** | Reporte mensual para anunciante | A4 vertical | nombre\_cliente, paquete, views, interacciones, cpm, mes |
| **4** | Post para cliente PYME | 1080x1080px | nombre\_negocio, titular, texto, hashtags |
| **5** | Media kit (pagina generica) | A4 vertical | titulo, subtitulo, dato\_grande, descripcion |
| **6** | Tarjeta de jugador (transmision) | 1920x200px | nombre, numero, posicion, equipo |
| **7** | Promo de programa (generico) | 1080x1080px | nombre\_programa, dia, hora, descripcion |
| **8** | Certificado Verdadero Fan (Que Tanto Sabes De) | A4 horizontal | nombre\_participante, tema, puntaje, fecha |

|  |
| --- |
| *Estas 8 plantillas se crean UNA VEZ con el branding de CREA. Despues solo cambias los datos y Canva genera todo. El alumno de servicio social puede crear las plantillas bajo tu supervision en una tarde.* |

# **6. Cuanto tiempo ahorra esto**

|  |  |  |  |
| --- | --- | --- | --- |
| **Actividad** | **Sin Canva Bulk** | **Con Canva Bulk** | **Ahorro** |
| **30 posts 'Dato del dia' (1 mes)** | 5-6 horas | 15 minutos | 96% |
| **20 imagenes Buenos dias, Perote** | 3-4 horas | 10 minutos | 95% |
| **10 reportes mensuales de clientes** | 4-5 horas | 20 minutos | 93% |
| **40 posts PYME (10 clientes x 4 posts)** | 8-10 horas | 1.5 horas | 85% |
| **12 tarjetas jugadores (1 partido)** | 1.5 horas | 10 minutos | 89% |
| **TOTAL MENSUAL** | **22-26 horas** | **2.5-3 horas** | **~90%** |

**Estas recuperando entre 20 y 23 horas al mes** que antes se iban en diseno manual. Esas horas ahora van a supervision, negociacion con patrocinadores, y produccion de programas.

CREA Contenidos — Canva Pro en el flujo de produccion

*Addendum al Command Center — Abril 2026*
