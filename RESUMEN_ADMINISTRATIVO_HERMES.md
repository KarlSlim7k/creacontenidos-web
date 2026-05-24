# Resumen Administrativo — Integración de Hermes Agent

> **Para**: Emmanuel Reyes Zapata, Director General CREA Contenidos
> **De**: Equipo de Desarrollo
> **Fecha**: Mayo 2026
> **Documento técnico complementario**: [`PLAN_HERMES.md`](./PLAN_HERMES.md)
> **Tipo de cambio (USD→MXN)**: 18.00 MXN/USD (referencia conservadora)

---

## 1. Resumen ejecutivo (1 página)

### ¿Qué es Hermes Agent?
Es un **motor de IA open-source** desarrollado por Nous Research que reemplaza los 5 scripts manuales que hoy operan la inteligencia artificial del CREA Command Center (radar, generación de contenido, imágenes, audio, distribución). Funciona como **un solo servicio** corriendo en el mismo VPS donde ya está alojado el sitio, sin tocar el sitio web ni el panel admin actuales.

### ¿Por qué cambiar al modelo híbrido propuesto?
Tres razones, en orden de impacto:

1. **Ahorro mensual de aproximadamente $450-900 MXN** ($25-50 USD) frente al plan original del Brief.
2. **Aprovecha al máximo las cuentas Pro existentes** (Perplexity Pro y ElevenLabs sí sirven). Las que no sirven (Claude Pro web, ChatGPT Plus) **se reemplazan con OpenRouter, que da acceso al MISMO Claude Sonnet 4 sin doble pago**.
3. **Aprobación por celular vía Telegram**: Emmanuel revisa y aprueba las propuestas desde WhatsApp/Telegram sin abrir la computadora — flujo editorial diario en menos de 5 minutos.

### Inversión total estimada
| Concepto | Mensual MXN | Anual MXN |
|---|---|---|
| **Operación de IA en régimen estable** | **$1,026 - $1,206** | **$12,300 - $14,500** |
| Operación + scrapers Apify (Fase 6) | $1,908 - $2,088 | $22,900 - $25,000 |
| Pruebas iniciales (un solo pago) | $270 - $450 | — |

**Costos eliminados respecto al plan original** (APIs directas Anthropic + OpenAI): **$450-900 MXN/mes** ($5,400-10,800 MXN/año de ahorro neto).

### Cronograma para entrar en producción
**4 a 5 semanas** desde aprobación de presupuesto a operación estable. Ver §6 para el desglose. Una **Fase 8 opcional** post-lanzamiento añade enriquecimiento SEO sin afectar el flujo editorial principal — ver §12.

---

## 2. Contexto: lo que se acordó en sesiones previas

Esta sección sintetiza lo discutido para que el documento sea autocontenido.

### 2.1 Pregunta clave que motivó este resumen
> *"¿Las cuentas Pro de Perplexity, Claude, ChatGPT y ElevenLabs sirven para el sistema, o necesito pagar API aparte?"*

**Respuesta corta**: depende del proveedor. Algunas suscripciones **sí** cubren el uso del sistema, otras **no** porque las suscripciones web/app y el acceso programático (API) son productos comerciales distintos.

### 2.2 Validación de cada cuenta Pro existente

| Servicio | Plan que paga Emmanuel | ¿Sirve para el Command Center? | Detalle |
|---|---|---|---|
| **Perplexity Pro** | $20 USD/mes (~$360 MXN) | ✅ **Sí, parcialmente** | El plan Pro **incluye $5 USD/mes de créditos para la API Sonar**. Suficiente para social listening si no se excede (~48 consultas/día). |
| **Anthropic Claude Pro** (web/app) | $20 USD/mes (~$360 MXN) | ❌ **No sirve para automatización** | El plan Pro es solo para chatear en `claude.ai`. La API es **un producto separado**, con facturación independiente prepagada. La cuenta Pro **no comparte créditos** con la API. |
| **OpenAI ChatGPT Plus** | $20 USD/mes (~$360 MXN) | ❌ **No sirve para automatización** | Igual que Anthropic. ChatGPT Plus es solo chat web. La API de DALL·E 3 se cobra aparte (≈$0.04 USD por imagen). |
| **ElevenLabs** (Creator o Pro) | $22-99 USD/mes (~$396-1,782 MXN) | ✅ **Sí, totalmente** | Los planes pagados **incluyen acceso API** y un cupo mensual de caracteres. La voz se usa directamente desde el sistema sin pago adicional hasta llegar al límite del plan. |
| **Suno** (jingles) | Manual / no automatizado | 🟡 **Uso manual únicamente** | No tiene API pública robusta. Los jingles se generan a mano en suno.com y se suben al VPS como archivos estáticos. No hay integración automática y no es necesaria para el flujo diario. |

### 2.3 Implicación de costos del descubrimiento anterior

El plan original del Brief asumía que las suscripciones Pro cubrían el uso técnico. La realidad es que **dos de las cuatro suscripciones (Claude Pro y ChatGPT Plus) no aportan al sistema**, por lo que mantenerlas activas **solo para Emmanuel use el chat personalmente** es una decisión separada de la operación del Command Center.

| Si Emmanuel quiere... | Recomendación |
|---|---|
| Solo operar el Command Center (automatización) | **Cancelar Claude Pro y ChatGPT Plus** ($720 MXN/mes ahorrados). Mantener Perplexity Pro y ElevenLabs. |
| Seguir usando Claude/ChatGPT personalmente para tareas creativas no relacionadas | **Mantener una sola** de las dos suscripciones (la que más use). El Command Center funcionará igual. |
| Tener "todo en uno" para uso personal y profesional | OpenRouter actúa como ChatGPT/Claude unificado para uso personal con la misma API key. Ahorra ambas suscripciones de $360 MXN c/u. |

---

## 3. ¿Por qué el modelo híbrido y no el plan original?

### 3.1 Las tres opciones que se evaluaron

| Opción | Componentes | Costo mensual MXN | Pros | Contras |
|---|---|---|---|---|
| **A. Plan original del Brief** (APIs directas) | Anthropic API + OpenAI API + Perplexity API + ElevenLabs | $1,170 - $1,620 | Lo más cercano a lo que pidió originalmente. Uso 1:1 de los proveedores. | Doble facturación con suscripciones Pro web (que no comparten créditos). Sin fallback automático si un proveedor falla. Sin descuentos por volumen. |
| **B. Solo Nous Portal Plus** | Nous Portal $20 + ElevenLabs $22 | **$756** | Más barato. Una sola factura para casi todo. Login OAuth (sin gestionar API keys). | Modelos de Nous tienen calidad ligeramente menor a Claude Sonnet 4 directo en redacción editorial larga. Tool Gateway aún en evolución. |
| **C. Modelo híbrido (recomendada)** | Nous Portal Plus + OpenRouter + ElevenLabs Creator | **$1,026 - $1,206** | **Calidad de Claude Sonnet 4 para redacción** (lo mejor del mercado en español) + economía de Gemini Flash para tareas repetitivas + ElevenLabs para voz natural. Fallback automático entre proveedores. Una sola key de OpenRouter da acceso a 300+ modelos. | Tres proveedores en lugar de uno. Curva de aprendizaje un poco mayor. |

### 3.2 Razones para elegir la Opción C (híbrido)

1. **Calidad editorial sin compromisos**: Claude Sonnet 4 es el modelo con mejor escritura en español para tono periodístico cercano. Cambiarlo a un modelo inferior afecta directamente la voz CREA y el riesgo de clickbait/sensacionalismo (justo lo que el Brief §3.2 prohíbe). Vía OpenRouter cuesta lo mismo (o menos) que la API directa de Anthropic, sin necesidad de pagar Claude Pro web.

2. **Aprovecha lo barato donde se puede**: las tareas auxiliares (clasificación de sentimiento, dedup de temas similares, generación de títulos cortos) NO necesitan Claude. Gemini 3 Flash hace lo mismo a **10× menos costo**. El ahorro acumulado mensual ronda los $400-600 MXN.

3. **Resiliencia operativa**: si OpenRouter tiene un problema (rate limits, caída), Nous Portal toma el relevo automáticamente. Sin esto, una caída de un proveedor pararía la generación de contenido por horas. Esto cumple el requisito de fallback del runbook `incidents-and-fallbacks.md` SIN escribir código adicional.

4. **Tool Gateway de Nous Portal incluido**: la suscripción Plus de $360 MXN/mes incluye 4 herramientas premium (`web_search`, `image_generate`, `text_to_speech`, `browser`) que reemplazan parcialmente a Perplexity API y DALL·E. No se paga doble.

5. **ElevenLabs no se sustituye porque su voz en español no tiene rival**. La voz `EXAVITQu4vr4xnSDxMaL` que ya está configurada en el sistema es central a la identidad sonora del podcast "Buenos días, Perote". Cambiarla por TTS gratis (Edge TTS, Gemini TTS) degrada la marca.

### 3.3 ¿Cuándo conviene cambiar de modelo en el futuro?

| Situación | Recomendación |
|---|---|
| El presupuesto baja y es un mes flojo | Pasar a Opción B (Nous Portal solo): ahorra ~$450 MXN/mes a cambio de calidad ligeramente menor en redacción. Reversible sin migración técnica. |
| El presupuesto sube y CREA quiere modelos premium para reportajes especiales | Subir a Nous Portal Super ($1,800 MXN/mes) para más créditos + mantener OpenRouter como overflow. |
| Sale un modelo nuevo (Claude Opus, GPT-5, Gemini 4 Ultra) | Hermes lo soporta automáticamente. Cambio se hace con un comando (`hermes model`). Sin código nuevo. |
| Algún proveedor sube precios significativamente | Hermes permite cambiar al equivalente más barato sin tocar código. Tiempo de migración: minutos, no días. |

---

## 4. Desglose detallado de costos en pesos mexicanos

### 4.1 Operación mensual en régimen estable (post-Fase 5)

**Tipo de cambio referencia: 1 USD = 18 MXN.**

| Componente | Plan / consumo | USD/mes | **MXN/mes** |
|---|---|---|---|
| **Nous Portal Plus** | $20 base + $22 créditos (10% bonus) + $10 rollover | $20 | **$360** |
| **OpenRouter** | Pay-as-you-go (Claude Sonnet 4 para redacción + Gemini Flash auxiliary) | $15-25 | **$270 - $450** |
| **ElevenLabs Creator** | 100,000 caracteres incluidos (≈22 episodios de podcast + 90 cápsulas) | $22 | **$396** |
| **Telegram** (gate editorial) | Free | $0 | **$0** |
| **OpenWeatherMap** (clima newsletter) | Free tier (1,000 llamadas/día) | $0 | **$0** |
| **Resend** (email del newsletter) | Free hasta 3,000 emails/mes | $0 | **$0** |
| **TOTAL operación core** | | **$57 - $67** | **$1,026 - $1,206** |

### 4.2 Componentes opcionales

| Componente | ¿Cuándo activarlo? | USD/mes | **MXN/mes** |
|---|---|---|---|
| **Apify Starter** (scrapers FB/TikTok/IG) | Fase 6, cuando CREA quiera vigilar competencia automáticamente | $49 | **$882** |
| **Resend Pro** (si crece la lista de newsletter sobre 3K) | Cuando suscriptores de newsletter superen 3,000 | $20 | **$360** |
| **Nous Portal Super** (si Plus se queda corto) | Si los $360 mensuales se agotan antes de fin de mes (típicamente >10K consultas/mes) | $100 (en lugar de $20) | **$1,800** (sustituye al Plus) |

### 4.3 Costos eliminados al adoptar el modelo híbrido

Comparando con el plan original del Brief (APIs directas):

| Servicio que se evita pagar | Plan que se hubiera necesitado | USD/mes evitado | **MXN/mes ahorrado** |
|---|---|---|---|
| Anthropic API directa para Claude Sonnet 4 | $15-30/mes prepagado | $15-30 | **$270 - $540** |
| OpenAI API directa para DALL·E 3 + GPT-4 auxiliary | $10-20/mes prepagado | $10-20 | **$180 - $360** |
| **Total ahorro** | | **$25-50** | **$450 - $900/mes** |

> **Ahorro anual**: $5,400 - $10,800 MXN.

### 4.4 Inversión inicial (una sola vez)

| Concepto | USD | **MXN** | Cuándo se paga |
|---|---|---|---|
| Recarga inicial OpenRouter (testing + primer mes) | $20-30 | **$360 - $540** | Antes de Fase 1 |
| Primera suscripción Nous Portal Plus (mes 1) | $20 | **$360** | Antes de Fase 0 |
| Primera mensualidad ElevenLabs Creator | $22 | **$396** | Antes de Fase 3 |
| Configuración bot Telegram (@BotFather) | $0 | **$0** | Fase 0 |
| **Total inicial** | $62-72 | **$1,116 - $1,296** | Distribuido en las primeras 2 semanas |

### 4.5 Costos a NO confundir con la operación del Command Center

Estos son costos de infraestructura del proyecto que ya están aprobados/contratados y **NO son nuevos**:

| Concepto | Estado | Notas |
|---|---|---|
| VPS Hostinger KVM 2 | ✅ Ya contratado | Soporta el contenedor Hermes adicional sin upgrade. 2 vCPU + 8 GB RAM son suficientes. |
| Dominio crea-contenidos.com | ✅ Ya registrado | — |
| Postgres + Redis + RabbitMQ | ✅ En el VPS | Sin costo adicional. Hermes los reusa. |
| Dokploy (orquestación de contenedores) | ✅ Open-source self-hosted | $0. |

---

## 5. Comparativa "antes vs. después" para Emmanuel

### 5.1 Operación diaria

| Tarea | Hoy (con scripts manuales) | Con Hermes |
|---|---|---|
| Revisar temas detectados | Abrir panel admin en computadora | Notificación automática en Telegram a las 8 AM |
| Aprobar propuestas IA | Abrir editor en panel admin, leer 6 propuestas, dar clic | Telegram: deslizar y responder "aprobar 1, 3 y 5" en 30 segundos |
| Pedir regeneración de imagen | Volver al editor, llenar prompt, esperar | Telegram: "regenera la imagen del 3 con un policía en la entrada" |
| Enviar nota de voz como brief | No soportado | Reenvías la nota al bot. Hermes la transcribe y crea la idea automáticamente. |
| Aprobar newsletter "Buenos días, Perote" | No implementado | 5:30 AM llega el borrador a Telegram. Aprobas o pides cambios antes de 6:30 AM. |
| Generar reporte mensual de cliente | Ya funciona | Sin cambios + opcional: Hermes lo envía por WhatsApp al cliente directamente. |
| Vigilar qué publica la competencia | Manual / no se hace sistemáticamente | Reporte semanal automático en Telegram con resumen de Noticias Perote y Perote Al Momento. |

### 5.2 Mantenimiento técnico

| Aspecto | Hoy | Con Hermes |
|---|---|---|
| Cambiar proveedor de IA | Editar código, hacer pruebas, redeploy | Un comando: `hermes model` |
| Agregar nueva fuente de listening | Editar config + tocar código del listener | Solo editar `social-listening.json`, sin redeploy |
| Documentar un nuevo flujo editorial | Pedírselo al desarrollador | Emmanuel lo dicta por Telegram, Hermes lo guarda como skill reutilizable |
| Si un proveedor de IA cae | Sistema bloqueado hasta intervención manual | Fallback automático a otro proveedor, sin pausa operativa |

---

## 6. Cronograma y desembolsos

### 6.1 Calendario de fases (4-5 semanas)

| Semana | Fase | Entregable | Inversión MXN acumulada |
|---|---|---|---|
| 1 | Fase 0 | Servicio Hermes en Dokploy + Telegram bot + saludo de prueba | $1,116 (Nous Plus + OpenRouter inicial) |
| 1-2 | Fase 1 | Skill `crea-radar` reemplazando social listening | igual |
| 2 | Fase 2 | Skill `crea-content-generation` — propuestas IA en 6 formatos | igual |
| 3 | Fase 3 | Skills imagen + audio + volúmenes compartidos | $1,512 (+ ElevenLabs primer mes) |
| 3-4 | Fase 4 | Gate editorial completo por Telegram | igual |
| 4-5 | Fase 5 | Newsletter "Buenos días, Perote" diario | igual |
| Mes 2+ | Fase 6 (opcional) | Apify scrapers FB/TikTok/IG | $1,512 + $882/mes |
| Mes 2+ | Fase 7 | Apagado de scripts legacy tras 14 días en paralelo | sin cambio |

### 6.2 Punto de no-retorno

Antes de Fase 1, se puede cancelar sin costo más allá de las suscripciones del primer mes (~$1,116 MXN). Después de Fase 4 (gate editorial activo y operación diaria por Telegram), regresar al sistema manual implica volver a abrir el panel admin y operar como antes — técnicamente posible, pero administrativamente regresivo.

---

## 7. Análisis de retorno (ROI)

### 7.1 Tiempo de Emmanuel ahorrado

Estimación conservadora basada en la operación descrita en el Brief:

| Actividad diaria | Tiempo hoy | Tiempo con Hermes | Ahorro |
|---|---|---|---|
| Revisar listening manualmente / abrir panel | 15-30 min | 2-3 min Telegram | ~20 min/día |
| Aprobar propuestas | 15-20 min | 5 min | ~12 min/día |
| Aprobar newsletter (cuando exista) | N/A | 3-5 min | nuevo flujo |
| Coordinar imágenes/audio | 10-15 min | 2 min | ~10 min/día |
| **Total diario** | ~50-70 min | ~12-15 min | **~40-55 min/día** |

**~20 horas mensuales liberadas** que Emmanuel puede invertir en lo que el Brief §1 define como prioritario: producción profesional en estudio, ventas comerciales, relación con anunciantes.

### 7.2 Capacidad de publicación

| Métrica | Hoy (estimado) | Con Hermes (proyectado) |
|---|---|---|
| Notas publicadas / día | 2-3 | 4-6 (mismo Emmanuel, más volumen) |
| Formatos por nota relevante | 1 (solo nota web) | 1-3 (nota + post + reel/audio) |
| Newsletter | No existe | Diario L-V |
| Cobertura de competencia | Manual / aleatoria | Reporte semanal sistemático |

**Si CREA logra publicar 50% más contenido** con la misma operación humana, el inventario publicitario para anunciantes (notas patrocinadas, menciones en newsletter, espacios en podcast) crece proporcionalmente. **Un solo paquete comercial mensual nuevo cubre 2-3 meses de toda la inversión técnica.**

---

## 8. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Costo de OpenRouter se dispara por uso excesivo | Baja | Medio | Hermes permite poner límite por mes (`spending_cap`). Default: $30 USD ($540 MXN). Si se llega, el sistema usa Nous Portal y avisa por Telegram. |
| Calidad de Claude Sonnet 4 se degrada al cambiar de versión | Baja | Bajo | Hermes pinea la versión específica (`claude-sonnet-4-20250514`). Cambios solo cuando se prueben. |
| Telegram bloquea el bot | Muy baja | Alto | Política de uso permite bots de productividad personal. Mitigación adicional: bridge alternativo a WhatsApp. |
| Hermes Agent (proyecto) deja de mantenerse | Muy baja | Medio | Open source MIT, código bajo control en VPS. Última actualización: mayo 2026, comunidad activa, respaldado por Nous Research. |
| Las APIs de IA suben de precio | Media | Bajo | El modelo híbrido permite cambiar de proveedor sin código. Tiempo de migración: minutos. |
| Cuenta de Nous Portal o ElevenLabs se suspende | Baja | Medio | Fallback automático configurado. Pago con tarjeta empresarial CREA con autorenovación, no se interrumpe por olvido de pago. |

---

## 9. Recomendaciones administrativas

### 9.1 Decisiones que se piden a Emmanuel

| # | Decisión | Recomendación |
|---|---|---|
| 1 | ¿Aprobar el modelo híbrido (Opción C)? | ✅ Sí. Mejor balance calidad/costo. |
| 2 | ¿Cancelar Claude Pro y ChatGPT Plus si solo se usan personalmente? | Personal de Emmanuel. Si los usa para tareas creativas no relacionadas con CREA, mantenerlos. Si no, cancelar = $720 MXN/mes ahorrados adicionales. |
| 3 | ¿Mantener Perplexity Pro? | ✅ Sí, los $5 USD/mes de créditos API que incluye se aprovechan en social listening. |
| 4 | ¿ElevenLabs Creator ($22 USD) o Pro ($99 USD)? | **Creator** es suficiente para volumen actual (newsletter L-V + 5-10 cápsulas/día). Subir a Pro solo si se llega al límite de 100K caracteres/mes. |
| 5 | ¿Activar Apify desde el inicio o esperar? | **Esperar** a Fase 6 (mes 2+). El listening base con Perplexity + RSS cubre el 80% del valor. Apify se justifica cuando el sitio tenga tráfico estable. |
| 6 | ¿Tarjeta para pagos? | Asignar **una sola tarjeta empresarial** para todos los servicios técnicos (Nous, OpenRouter, ElevenLabs, Apify futuro). Facilita conciliación contable. |
| 7 | ¿Quién custodia las API keys y credenciales? | Recomendado: documento cifrado en gestor de contraseñas (1Password / Bitwarden) compartido entre Emmanuel y desarrollador líder. |
| 8 | ¿Aprobar Fase 8 (enriquecimiento SEO) ahora o decidirlo post-Fase 7? | **Decidir post-Fase 7**. No tomar la decisión ahora. Fase 8 cuesta +$216 MXN/mes y NO es necesaria para la operación editorial. Se evalúa cuando el sistema ya esté estable y se vea si vale la pena perseguir tráfico orgánico desde Google. Reversible si no convence. |

### 9.2 Métricas para revisión mensual

A partir del mes 2, revisar mensualmente con el desarrollador:

- **Gasto real vs. presupuestado** ($1,026-1,206 MXN previsto)
- **Volumen de publicaciones** (meta: ≥4/día L-V)
- **Tasa de aprobación de propuestas IA** (meta: ≥60% — si baja, el `SOUL.md` necesita ajuste)
- **Tasa de apertura del newsletter** (meta: >40% según Brief)
- **Interacciones por publicación en Facebook** (comparar con competencia)
- **Incidencias de fallback** (debería ser 0-2/mes; más indica problema con OpenRouter)

### 9.3 Cuándo escalar el plan

**Subir de Nous Portal Plus a Super ($100 USD = $1,800 MXN/mes)** cuando:
- Más de 10,000 propuestas IA generadas al mes (probable a partir de mes 4-5 si CREA crece).
- Newsletter supera 1,000 suscriptores.
- Se añaden 2+ canales adicionales de distribución (Instagram + TikTok automatizados).

**Activar Apify ($49 USD = $882 MXN/mes)** cuando:
- CREA quiere reportes semanales sistemáticos de la competencia.
- El equipo comercial usa el reporte para atraer anunciantes ("vimos que tu producto es trending en Perote").

**Considerar contratar Anthropic API directa** (en lugar de Claude vía OpenRouter) solo si:
- El consumo de Claude supera $100 USD/mes vía OpenRouter (poco probable en escenario actual).
- Se quiere acceso a features beta antes de que lleguen al agregador.

---

## 10. Conclusión

El modelo híbrido recomendado **mejora el sistema actual**, **reduce el gasto en API**, **respeta las cuentas Pro existentes que sí aportan** (Perplexity, ElevenLabs), y **descarta las que no aportan** (Claude Pro web, ChatGPT Plus) sin afectar la calidad final.

El costo total mensual de operación —**entre $1,026 y $1,206 MXN**— es comparable a una suscripción doble de servicios profesionales menores (un buen plan de Adobe Creative Cloud cuesta similar) y entrega:

- Un sistema editorial automatizado que opera 24/7
- Aprobación móvil del director general
- Calidad de modelo Claude Sonnet 4 (estado del arte en español)
- Voz natural de ElevenLabs en todo el podcast diario
- Resiliencia operativa con fallback multi-proveedor
- Arquitectura que crece con CREA sin reescribir código

**Se recomienda aprobar el inicio de Fase 0 con un presupuesto inicial de $1,500 MXN para los primeros 30 días.** A partir del mes 2, el costo se estabiliza en el rango proyectado.

---

## 11. Mejora opcional post-lanzamiento (Fase 8): enriquecimiento SEO

### 11.1 Antecedente

Durante la planeación se evaluó adoptar un flujo de trabajo de **publicación asistida por IA** popular en agencias de marketing digital, que sigue 5 pasos: detectar tendencia → investigar intención de búsqueda → redactar borrador → revisar SEO/claridad → publicar y medir.

Tras el análisis comparativo, **el flujo CREA es objetivamente más profesional para un medio de comunicación local** que ese flujo SEO estándar, porque CREA suma cinco pilares que el flujo de marketing omite:

1. **Gate editorial humano obligatorio** (Emmanuel aprueba todo).
2. **Producción multiformato** (6 piezas por tema, no 1 sola nota).
3. **Generación de assets multimedia** (imágenes + audio narrado).
4. **Etiquetado de transparencia IA** (humano/asistido/generado), requisito ético.
5. **Distribución multicanal** (Facebook + Instagram + TikTok + WhatsApp + newsletter + podcast + sitio).

Dicho esto, **dos pasos del flujo SEO estándar agregan valor sin comprometer la ética editorial** y se incorporan como mejora opcional posterior al lanzamiento estable: investigación de intención de búsqueda y pre-check SEO técnico antes del gate editorial. El gate humano sigue siendo el árbitro final.

### 11.2 ¿Qué se añade en Fase 8?

| Componente | Función | Cuándo se ejecuta |
|---|---|---|
| Skill `crea-search-intent` | Enriquece cada tema detectado con análisis de qué busca la gente en Google sobre ese tema (keywords primarias, preguntas frecuentes, tipo de intención). Esto **mejora el contexto que recibe Claude antes de redactar**, sin cambiar el flujo. | Entre el radar (cada 6h) y la generación de contenido (30 min después) |
| Skill `crea-seo-review` | Audita técnicamente cada nota web propuesta: legibilidad Flesch en español, longitud de párrafos, densidad de keywords, estructura H1/H2, meta-description, slug. Genera un scoring que llega visible al gate editorial. | Después de la generación, antes del gate editorial humano |

### 11.3 Lo que SÍ y NO hace Fase 8

| ✅ Sí | ❌ No |
|---|---|
| Mejora el posicionamiento de notas en Google | NO bloquea publicaciones que no pasen SEO |
| Da scoring SEO visible a Emmanuel en el gate | NO modifica notas sin aprobación humana |
| Solo aplica a notas web | NO toca posts/audio/video/memes (no son SEO) |
| Es completamente opcional | NO está bloqueada por presupuesto |
| Reversible (se puede desactivar con un comando) | NO cambia el flujo editorial principal |

### 11.4 Costo de Fase 8

| Componente | USD/mes | **MXN/mes** |
|---|---|---|
| Inferencia adicional Gemini Flash Lite (search intent + SEO audit) | ~$2 + $10 = $12 | **~$216** |
| Google Search Console | Gratis | **$0** |
| Tiempo de desarrollo (una sola vez) | — | Incluido en el costo de proyecto |
| **Costo recurrente Fase 8** | **~$12** | **~$216** |

**Impacto en presupuesto mensual con Fase 8 activa**: $1,026-1,206 + $216 = **$1,242-$1,422 MXN/mes**.

### 11.5 ¿Cuándo activar Fase 8?

Recomendación: activarla cuando se cumplan **las tres condiciones** simultáneamente:

1. La operación lleva ≥30 días estable post-Fase 7 (sin incidencias).
2. Emmanuel reporta que quiere mejorar el tráfico orgánico desde Google (no solo redes).
3. El sitio web tiene mínimo 50 notas publicadas (volumen suficiente para que el SEO mueva la aguja).

Si las tres no se cumplen, Fase 8 es prematura y se pospone.

### 11.6 Métrica de éxito de Fase 8

- A los **30 días post-activación**: ≥40% de notas con `seo_audit` aparecen en top-30 de Google Search Console para su keyword primaria.
- A los **90 días**: tráfico orgánico desde Google al sitio crece ≥25% mensual.
- **Si no se cumple a los 90 días**, revisar con el desarrollador: o el `SOUL.md` necesita ajuste, o el sector compite con medios mucho más antiguos y hay que priorizar otra estrategia.

### 11.7 Reversibilidad

Fase 8 es **completamente opcional y reversible**. Si después de activarla Emmanuel siente que el scoring SEO interfiere con su criterio editorial, los dos skills se desactivan con un solo comando (`hermes cron pause crea-seo-review` y `hermes cron pause crea-search-intent`). El flujo principal de CREA queda intacto.

---

## 12. Anexos

### 12.1 Equivalencias rápidas USD → MXN (referencia 18 MXN/USD)

| USD | MXN |
|---|---|
| $5 | $90 |
| $10 | $180 |
| $20 | $360 |
| $22 | $396 |
| $50 | $900 |
| $67 | $1,206 |
| $100 | $1,800 |
| $200 | $3,600 |

### 12.2 Documentos relacionados en este repositorio

- [`PLAN.md`](./PLAN.md) — Plan maestro técnico de CREA Command Center
- [`PLAN_HERMES.md`](./PLAN_HERMES.md) — Documento técnico de integración (873 líneas, para desarrolladores y agentes IA)
- [`docs/updates/CREA_Brief_Desarrollador.md`](./docs/updates/CREA_Brief_Desarrollador.md) — Brief original del cliente (abril 2026)
- [`docs/updates/CREA_Newsletter_Podcast.md`](./docs/updates/CREA_Newsletter_Podcast.md) — Spec del producto "Buenos días, Perote"
- [`docs/updates/CREA_Social_Listening.md`](./docs/updates/CREA_Social_Listening.md) — Spec del listening con Apify

### 12.3 Glosario administrativo

- **API**: interfaz que permite al sistema usar un servicio de IA programáticamente (sin abrir el chat web). Es un producto comercial separado de la suscripción Pro/Plus normal.
- **Token**: unidad de medida del consumo de IA. Un token ≈ 0.75 palabras en español. Las APIs cobran por miles o millones de tokens.
- **Cron**: tarea programada que se ejecuta automáticamente a una hora/frecuencia definida (cada 6 horas, todos los lunes a las 9 AM, etc.).
- **Skill (Hermes)**: documento markdown que describe un flujo editorial reutilizable (radar, generar propuestas, aprobar, publicar). Equivale a un "procedimiento operativo estándar" ejecutable.
- **Gate editorial**: paso obligatorio de aprobación humana antes de publicar. CREA nunca publica nada automático sin revisión de Emmanuel.
- **Fallback**: sistema de respaldo automático cuando el proveedor principal falla. Garantiza continuidad operativa.
- **VPS**: servidor virtual privado donde corre todo el sistema (en este caso, contratado en Hostinger).
- **Dokploy**: panel de control que orquesta los servicios (sitio web, base de datos, Hermes) en el VPS.
- **Intención de búsqueda** (Fase 8): qué quiere realmente saber un usuario cuando teclea una consulta en Google. Saberlo antes de redactar mejora el ranking sin sacrificar calidad editorial.
- **Flesch (legibilidad)** (Fase 8): índice numérico de qué tan fácil es leer un texto. En español ideal >60. Lo usa el skill `crea-seo-review` para validar que las notas son accesibles para el público objetivo de Perote.
- **Google Search Console** (Fase 8): herramienta gratuita de Google que muestra en qué posición aparece el sitio para cada búsqueda. Se conecta una sola vez y empieza a registrar métricas históricas que la Fase 8 usa como métrica de éxito.

---

**Aprobación**

| Concepto | Firma | Fecha |
|---|---|---|
| Modelo híbrido aprobado (Opción C) | _______________________ | __ / __ / 2026 |
| Presupuesto mensual aprobado: $1,026 - $1,206 MXN | _______________________ | __ / __ / 2026 |
| Inicio de Fase 0 autorizado | _______________________ | __ / __ / 2026 |
| (Opcional) Fase 8 SEO autorizada para activación post-Fase 7 estable: +$216 MXN/mes | _______________________ | __ / __ / 2026 |

**Documento preparado por**: Equipo de Desarrollo CREA Command Center
**Versión**: 1.0
**Próxima revisión**: 30 días después del inicio de operación, con métricas reales del primer mes.
