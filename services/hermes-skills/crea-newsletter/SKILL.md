---
name: crea-newsletter
description: Genera el newsletter diario "Buenos días, Perote" L-V a las 5am. Clima OWM + ideas del radar. Aprobación por Telegram antes de distribuir por email (Resend) y Facebook.
version: 1.0.0
metadata:
  hermes:
    tags: [newsletter, resend, email, openweathermap, pg8000]
    category: crea
    requires_toolsets: [terminal, messaging]
---

# Skill: crea-newsletter

Genera y distribuye el newsletter "Buenos días, Perote". Ejecuta los pasos en orden.

## Paso 1: Obtener datos con execute_code

```python
import os, json, urllib.request
import pg8000.native as pg
from datetime import datetime, timezone
import locale

# Clima de Perote via OpenWeatherMap
OWM_KEY = os.environ.get("OPENWEATHERMAP_API_KEY","")
# Perote, Veracruz — lat/lon
clima_data = {}
try:
    url = f"https://api.openweathermap.org/data/2.5/weather?lat=19.5638&lon=-97.2439&appid={OWM_KEY}&units=metric&lang=es"
    r = json.loads(urllib.request.urlopen(url, timeout=10).read())
    clima_data = {
        "temp_min": round(r["main"]["temp_min"]),
        "temp_max": round(r["main"]["temp_max"]),
        "temp_actual": round(r["main"]["temp"]),
        "descripcion": r["weather"][0]["description"],
        "humedad": r["main"]["humidity"],
        "alerta": "niebla" if "niebla" in r["weather"][0]["description"].lower()
                  else "helada" if r["main"]["temp"] <= 2
                  else "lluvia" if "lluvia" in r["weather"][0]["description"].lower()
                  else None
    }
except Exception as e:
    clima_data = {"error": str(e)}

# Últimas ideas del radar (últimas 24h)
c = pg.Connection(
    host=os.environ.get("POSTGRES_HOST","postgres"),
    database=os.environ.get("POSTGRES_DB","crea_db"),
    user=os.environ.get("POSTGRES_USER","crea"),
    password=os.environ.get("POSTGRES_PASSWORD","change_me"),
    port=5432, timeout=10
)
ideas = c.run("""
    SELECT titulo, descripcion, urgencia::text, metadata
    FROM ideas
    WHERE deleted_at IS NULL
      AND created_at > NOW() - interval '24 hours'
    ORDER BY
      CASE WHEN urgencia = 'alta' THEN 0 ELSE 1 END,
      created_at DESC
    LIMIT 10
""")
c.close()

hoy = datetime.now().strftime("%A %d de %B de %Y")
print("CLIMA:", json.dumps(clima_data, ensure_ascii=False))
print("FECHA:", hoy)
print("IDEAS:", json.dumps([{"titulo":r[0],"desc":r[1],"urgencia":r[2]} for r in ideas], ensure_ascii=False))
```

## Paso 2: Generar el borrador del newsletter

Con los datos del Paso 1, genera el newsletter siguiendo este formato EXACTO (máx 400 palabras):

```
Buenos días, Perote. Hoy es [DÍA] [FECHA]. Esto es lo que necesitas saber.

🌡️ EL CLIMA: [temp_actual]°C. Máxima de [temp_max]°C, mínima de [temp_min]°C. [descripcion]. [alerta si aplica]

📰 LA NOTA DEL DÍA: [noticia más relevante del radar, 3-4 oraciones con datos concretos, sin adjetivos]

⚡ EN BREVE:
• [noticia 2 en 1-2 oraciones]
• [noticia 3 en 1-2 oraciones]
• [noticia 4 en 1-2 oraciones]

💡 DATO DEL DÍA: [dato curioso, histórico o estadístico sobre Perote]

📅 AGENDA: [eventos del día si los hay en las ideas, sino omitir]

Que tengas un buen [día de la semana]. Nos leemos mañana.
CREA Contenidos — crea-contenidos.com
```

Guarda el texto completo como `BORRADOR`.

## Paso 3: Enviar a Emmanuel para aprobación

Envía el borrador por Telegram al canal configurado (`TELEGRAM_HOME_CHANNEL`):

```
📰 *Buenos días, Perote — borrador para aprobación*

<BORRADOR>

---
Responde:
✅ `aprobar newsletter` — se enviará por email y FB
❌ `rechazar newsletter <motivo>` — se descarta
✏️ `editar newsletter` — me dices los cambios
```

Espera respuesta. Si en 30 minutos no hay respuesta, envía recordatorio.

## Paso 4 (solo si aprueba): Enviar por email con execute_code

```python
import os, json, urllib.request, urllib.parse

RESEND_KEY = os.environ.get("RESEND_API_KEY","")
BORRADOR = """<texto aprobado>"""

# Obtener suscriptores con pg8000
import pg8000.native as pg
c = pg.Connection(
    host=os.environ.get("POSTGRES_HOST","postgres"),
    database=os.environ.get("POSTGRES_DB","crea_db"),
    user=os.environ.get("POSTGRES_USER","crea"),
    password=os.environ.get("POSTGRES_PASSWORD","change_me"),
    port=5432, timeout=10
)
subs = c.run("SELECT email FROM suscriptores WHERE activo=true AND deleted_at IS NULL")
c.close()

emails = [r[0] for r in subs if r[0]]
print(f"Suscriptores: {len(emails)}")

if not emails:
    print("Sin suscriptores aún — publicando solo en FB")
else:
    # Enviar via Resend
    for email in emails:
        try:
            data = json.dumps({
                "from": "Buenos días, Perote <newsletter@crea-contenidos.com>",
                "to": [email],
                "subject": f"Buenos días, Perote — {__import__('datetime').date.today().strftime('%d/%m/%Y')}",
                "text": BORRADOR
            }).encode()
            req = urllib.request.Request(
                "https://api.resend.com/emails",
                data=data,
                headers={"Authorization": f"Bearer {RESEND_KEY}", "Content-Type": "application/json"},
                method="POST"
            )
            resp = json.loads(urllib.request.urlopen(req, timeout=15).read())
            print(f"✅ Email enviado a {email}: {resp.get('id','')}")
        except Exception as e:
            print(f"❌ Error {email}: {e}")
```

## Paso 5 (solo si aprueba): Publicar en Facebook

Llama al skill `crea-publish-facebook` o publica directamente el borrador en la página de Facebook usando la Graph API (misma lógica del skill crea-publish-facebook pero con el texto del newsletter).

## Paso 6: Guardar edición en DB con execute_code

```python
import os, json
import pg8000.native as pg
from datetime import datetime, timezone

c = pg.Connection(
    host=os.environ.get("POSTGRES_HOST","postgres"),
    database=os.environ.get("POSTGRES_DB","crea_db"),
    user=os.environ.get("POSTGRES_USER","crea"),
    password=os.environ.get("POSTGRES_PASSWORD","change_me"),
    port=5432, timeout=10
)

# Guardar en briefings_diarios si la tabla existe, sino en piezas_contenido
autor = c.run("SELECT id::text FROM usuarios WHERE deleted_at IS NULL ORDER BY created_at ASC LIMIT 1")[0][0]
c.run("""
    INSERT INTO piezas_contenido
      (titulo, slug, formato, estado, autor_id, contenido_markdown, borrador_ia, modelo_ia_usado, metadata)
    VALUES (
      :titulo, :slug, 'newsletter', 'publicada', :autor, :body, :body, 'kimi-k2.6', :meta
    )
""",
    titulo=f"Buenos días, Perote — {datetime.now().strftime('%d/%m/%Y')}",
    slug=f"buenos-dias-perote-{datetime.now().strftime('%Y-%m-%d')}",
    autor=autor, body="<BORRADOR_APROBADO>",
    meta=json.dumps({"service":"newsletter","date":datetime.now(timezone.utc).isoformat()})
)
c.close()
print("✅ Edición guardada en DB")
```

## Restricciones

- NUNCA distribuir sin aprobación de Emmanuel.
- Si OWM falla, omitir la sección de clima en lugar de inventar datos.
- Si no hay ideas del radar, usar las de los últimos 3 días.
- Máximo 400 palabras en el newsletter final.
