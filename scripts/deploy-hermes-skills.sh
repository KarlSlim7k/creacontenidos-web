#!/bin/bash
# scripts/deploy-hermes-skills.sh
# Copia skills y config de Hermes al volumen del contenedor y corrige permisos.
# Uso: bash scripts/deploy-hermes-skills.sh
# Requiere: sshpass, acceso al VPS configurado en VPS_HOST/VPS_PASS

set -e

CONTAINER="crea_hermes"
CODE_DIR="/etc/dokploy/compose/test-crea-7ahi34/code"
SKILLS_SRC="services/hermes-skills"

echo "▶ Copiando skills..."
for skill_dir in $CODE_DIR/$SKILLS_SRC/*/; do
  skill_name=$(basename "$skill_dir")
  docker exec --user root "$CONTAINER" mkdir -p "/opt/data/skills/$skill_name"
  docker cp "$skill_dir/SKILL.md" "$CONTAINER:/opt/data/skills/$skill_name/SKILL.md"
  echo "  ✓ $skill_name"
done

echo "▶ Copiando config..."
docker cp "$CODE_DIR/config/hermes/config.yaml" "$CONTAINER:/opt/data/config.yaml"
docker cp "$CODE_DIR/config/hermes/SOUL.md" "$CONTAINER:/opt/data/SOUL.md"

echo "▶ Corrigiendo permisos..."
docker exec --user root "$CONTAINER" chown -R hermes:hermes \
  /opt/data/skills \
  /opt/data/cron/jobs.json \
  /opt/data/config.yaml \
  /opt/data/SOUL.md 2>/dev/null || true

echo "✅ Deploy completado. Reinicia el contenedor si es necesario: docker restart $CONTAINER"
