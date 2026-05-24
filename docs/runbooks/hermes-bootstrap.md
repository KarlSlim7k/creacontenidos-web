# Runbook: Primer arranque de crea_hermes (Fase 0)

Fecha: 2026-05  
Plan de referencia: [`PLAN_HERMES.md`](../../PLAN_HERMES.md) §8 y §9  
Criterio de salida de Fase 0: `hermes doctor` en verde + Emmanuel recibe saludo por Telegram + el agente ejecuta `SELECT 1` contra Postgres.

---

## 1. Prerrequisitos

Antes de ejecutar este runbook, confirma que tienes:

- [ ] **`OPENCODE_API_KEY`** — plan OpenCode Go (temporal para Fase 0/1)
- [ ] **`TELEGRAM_BOT_TOKEN`** — obtener de `@BotFather` en Telegram
- [ ] **`TELEGRAM_HOME_CHANNEL`** — chat_id de Emmanuel (obtener con `@userinfobot`)
- [ ] Acceso SSH al VPS (`root@76.13.123.24`)
- [ ] Dokploy activo en el VPS

Las siguientes keys son **opcionales en Fase 0** (activar en fases posteriores):

- `OPENROUTER_API_KEY` (Fase 1+)
- `ELEVENLABS_API_KEY` (Fase 3+)
- `FB_PAGE_ACCESS_TOKEN` / `FB_PAGE_ID` (Fase 1+)

---

## 2. Configurar variables de entorno en Dokploy

1. Abre el panel Dokploy → proyecto `test-crea` → **Environment**.
2. Añade las variables (una por línea, nunca en el repo):

```
OPENCODE_API_KEY=<tu key de OpenCode Go>
TELEGRAM_BOT_TOKEN=<token de @BotFather>
TELEGRAM_HOME_CHANNEL=<chat_id de Emmanuel>
```

3. Guarda. Dokploy inyecta estas variables en el contenedor al levantar.

> ⚠️ NUNCA commitear estas variables al repo. Ver restricción §13.3 del plan.

---

## 3. Copiar archivos de configuración al volumen de Hermes

El volumen `hermes_data` se monta en `/opt/data` dentro del contenedor. Los archivos de config deben copiarse ahí en el primer arranque:

```bash
# Desde el VPS
ssh root@76.13.123.24

# Copiar config.yaml y SOUL.md al volumen
docker cp /etc/dokploy/compose/test-crea-7ahi34/code/config/hermes/config.yaml crea_hermes:/opt/data/config.yaml
docker cp /etc/dokploy/compose/test-crea-7ahi34/code/config/hermes/SOUL.md crea_hermes:/opt/data/SOUL.md
```

> En fases futuras, esto se automatizará con un `entrypoint.sh` en el Dockerfile de Hermes.

---

## 4. Levantar el servicio

```bash
# Desde el VPS, en el directorio del proyecto
cd /etc/dokploy/compose/test-crea-7ahi34/code

# Levantar solo hermes (postgres ya debe estar corriendo)
docker compose up -d hermes

# Verificar que levantó
docker compose ps hermes
docker logs crea_hermes --tail 50
```

---

## 5. Autenticación de Nous Portal (cuando se migre a producción)

> **Fase 0**: omitir este paso — se usa OpenCode Go, no Nous Portal.  
> **Fase 1+ / producción**: ejecutar cuando se tenga la cuenta Nous Portal.

```bash
docker exec -it crea_hermes hermes auth
# Sigue el flujo OAuth en el navegador
```

---

## 6. Validación del arranque

```bash
# Conectarse al contenedor
docker exec -it crea_hermes bash

# 1. Verificar estado general
hermes doctor

# 2. Ver config cargada
hermes config show

# 3. Validar conexión a Postgres
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT 1;"

# 4. Listar skills (vacío en Fase 0 — se poblan en Fases 1-3)
hermes skills list

# 5. Verificar permisos de bind-mounts
ls -la /output/img /output/audio
```

Salida esperada de `hermes doctor`:
```
✅ Modelo: opencode-go configurado
✅ Postgres: conexión OK
✅ Volúmenes: /output/img, /output/audio accesibles
✅ Gateway: escuchando
```

---

## 7. Prueba de saludo por Telegram (criterio de salida Fase 0)

```bash
docker exec -it crea_hermes hermes chat -q \
  "Preséntate brevemente a Emmanuel como el editor automatizado de CREA Contenidos. Mensaje corto, en español."
```

El mensaje debe llegar al canal configurado en `TELEGRAM_HOME_CHANNEL`.  
Si no llega, verificar el token y el chat_id con:

```bash
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates"
```

---

## 8. Ajuste de permisos de volúmenes compartidos

Hermes corre con UID 10000; `crea_web` corre como `www-data`. Ejecutar una sola vez:

```bash
docker exec crea_hermes chmod 0775 /output/img /output/audio
docker exec crea_hermes chown 10000:www-data /output/img /output/audio
```

---

## 9. Checklist de cierre de Fase 0

- [ ] `hermes doctor` reporta verde sin errores
- [ ] Emmanuel recibe el saludo de prueba por Telegram
- [ ] `SELECT 1` contra Postgres ejecuta correctamente
- [ ] Volúmenes `shared_img` y `shared_audio` con permisos correctos
- [ ] Variables de entorno configuradas en Dokploy (no en el repo)

Al completar este checklist, actualizar el estado de Fase 0 en `PLAN_HERMES.md` §9 de `📋 Pendiente` a `✅ Completa`.

---

## 10. Rollback

Si el servicio no levanta o causa problemas:

```bash
# Detener y remover el contenedor de hermes
docker compose stop hermes
docker compose rm -f hermes

# El servicio web y postgres no se ven afectados
docker compose ps
```

El legacy (`services/*.js` + cron) sigue funcionando hasta la Fase 7 — este servicio corre en paralelo sin interferir.

---

## Referencias

- `PLAN_HERMES.md` §8 — Implementación en Dokploy  
- `PLAN_HERMES.md` §9 — Criterios de salida por fase  
- `PLAN_HERMES.md` §13.4 — Comandos de validación  
- `docs/runbooks/incidents-and-fallbacks.md` — Fallbacks si Hermes no responde
