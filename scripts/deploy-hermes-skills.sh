#!/bin/bash
# scripts/deploy-hermes-skills.sh
# Copia skills y config de Hermes al volumen del contenedor con permisos correctos.
# Uso: ejecutar en el VPS tras git pull.
# No requiere argumentos — usa rutas fijas del proyecto en Dokploy.

set -e

CONTAINER="crea_hermes"
CODE_DIR="/etc/dokploy/compose/test-crea-7ahi34/code"
SKILLS_SRC="$CODE_DIR/services/hermes-skills"

echo "▶ Copiando skills..."
for skill_dir in "$SKILLS_SRC"/*/; do
  skill_name=$(basename "$skill_dir")
  # Crear directorio como hermes (no root)
  docker exec --user hermes "$CONTAINER" mkdir -p "/opt/data/skills/$skill_name"
  # Copiar archivo — docker cp siempre copia como root, así que hacemos chown inmediato
  docker cp "$skill_dir/SKILL.md" "$CONTAINER:/opt/data/skills/$skill_name/SKILL.md"
  docker exec --user root "$CONTAINER" chown hermes:hermes "/opt/data/skills/$skill_name/SKILL.md" \
                                                            "/opt/data/skills/$skill_name"
  echo "  ✓ $skill_name"
done

echo "▶ Copiando config y SOUL..."
docker cp "$CODE_DIR/config/hermes/config.yaml" "$CONTAINER:/opt/data/config.yaml"
docker cp "$CODE_DIR/config/hermes/SOUL.md"     "$CONTAINER:/opt/data/SOUL.md"
docker exec --user root "$CONTAINER" chown hermes:hermes /opt/data/config.yaml /opt/data/SOUL.md

echo "▶ Corrigiendo permisos generales de /opt/data/cron/ ..."
docker exec --user root "$CONTAINER" chown -R hermes:hermes /opt/data/cron/

echo "▶ Asegurando credenciales de Postgres en .env de Hermes ..."
docker exec --user hermes "$CONTAINER" bash -c "
  sed -i '/^POSTGRES_/d' /opt/data/.env
  echo 'POSTGRES_HOST=postgres'    >> /opt/data/.env
  echo 'POSTGRES_PORT=5432'        >> /opt/data/.env
  echo 'POSTGRES_DB=crea_db'       >> /opt/data/.env
  echo 'POSTGRES_USER=crea'        >> /opt/data/.env
  echo 'POSTGRES_PASSWORD=change_me' >> /opt/data/.env
"

echo "✅ Deploy completado — sin necesidad de restart."
echo "   Verifica con: docker exec $CONTAINER /opt/hermes/.venv/bin/hermes skills list"
