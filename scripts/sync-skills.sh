#!/bin/bash
# scripts/sync-skills.sh
# Detecta drift entre specs en docs/updates/ y skills en .opencode/skills/.
# NO regenera skills automaticamente — solo alerta.
#
# Por que: las skills son resumenes operativos editados a mano. Si las
# regenerara automaticamente desde los specs, perderia la curaduria (decisiones
# de que entra, ejemplos practicos, etc). Este script solo avisa cuando hay
# drift para que un humano revise.
#
# Uso:
#   bash scripts/sync-skills.sh                  # check basico
#   bash scripts/sync-skills.sh --update-hashes  # actualizar hashes tras sync manual

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SPECS_DIR="$REPO_ROOT/docs/updates"
SKILLS_DIR="$REPO_ROOT/.opencode/skills"
STATE_FILE="$SKILLS_DIR/.last-sync"

# Mapa: spec -> skill relacionada
# Si agregas un spec o skill, actualiza este mapa.
declare -A SPEC_TO_SKILL=(
  ["CREA_Pagina_Publica_Transformacion.md"]="crea-pagina-publica crea-design-system"
  ["CREA_CRM_Pipedrive_HubSpot.md"]="crea-crm"
)

# --- args ---
UPDATE_HASHES=false
for arg in "$@"; do
  case "$arg" in
    --update-hashes) UPDATE_HASHES=true ;;
    -h|--help)
      echo "Uso: bash scripts/sync-skills.sh [--update-hashes]"
      echo ""
      echo "Detecta drift entre specs en docs/updates/ y skills en .opencode/skills/."
      echo "Sin flags: solo reporta drift."
      echo "Con --update-hashes: actualiza el state file (corre tras sincronizar manualmente)."
      exit 0
      ;;
  esac
done

# --- calculo de hashes actuales ---
declare -A CURRENT_HASHES
for spec in "${!SPEC_TO_SKILL[@]}"; do
  spec_path="$SPECS_DIR/$spec"
  if [[ -f "$spec_path" ]]; then
    # Hash del spec completo (md5sum estable, no fecha).
    current_hash=$(md5sum "$spec_path" | awk '{print $1}')
    CURRENT_HASHES["$spec"]="$current_hash"
  else
    echo "ERROR: spec no encontrado: $spec_path"
    exit 1
  fi
done

# --- leer hashes previos ---
declare -A PREVIOUS_HASHES
if [[ -f "$STATE_FILE" ]]; then
  while IFS=: read -r spec hash; do
    [[ -z "$spec" || -z "$hash" ]] && continue
    PREVIOUS_HASHES["$spec"]="$hash"
  done < "$STATE_FILE"
fi

# --- comparar ---
DRIFT=false
for spec in "${!SPEC_TO_SKILL[@]}"; do
  current="${CURRENT_HASHES[$spec]}"
  previous="${PREVIOUS_HASHES[$spec]:-}"

  if [[ -z "$previous" ]]; then
    echo "[NEW]    $spec (sin hash previo)"
    DRIFT=true
  elif [[ "$current" != "$previous" ]]; then
    echo "[DRIFT]  $spec (cambio desde ultima sync)"
    DRIFT=true
  else
    echo "[OK]     $spec"
  fi
done

# --- actualizar state si se pidio ---
if $UPDATE_HASHES; then
  {
    for spec in "${!CURRENT_HASHES[@]}"; do
      echo "$spec:${CURRENT_HASHES[$spec]}"
    done
  } > "$STATE_FILE"
  echo ""
  echo "Hashes actualizados en $STATE_FILE"
  exit 0
fi

# --- reporte final ---
echo ""
if $DRIFT; then
  cat <<EOF

⚠ Hay drift entre specs y skills.

Skills afectadas:
EOF
  for spec in "${!SPEC_TO_SKILL[@]}"; do
    current="${CURRENT_HASHES[$spec]}"
    previous="${PREVIOUS_HASHES[$spec]:-}"
    if [[ -z "$previous" ]] || [[ "$current" != "$previous" ]]; then
      for skill in ${SPEC_TO_SKILL[$spec]}; do
        echo "  - $SKILLS_DIR/$skill/SKILL.md (relacionado con $spec)"
      done
    fi
  done
  cat <<EOF

Pasos recomendados:
  1. Abrir el spec modificado: docs/updates/<spec>
  2. Comparar con la skill operativa: .opencode/skills/<skill>/SKILL.md
  3. Actualizar la skill a mano (mantener tono operativo, no copy-paste)
  4. Correr de nuevo: bash scripts/sync-skills.sh --update-hashes

EOF
  exit 1
else
  echo "✓ Todo sincronizado."
  exit 0
fi