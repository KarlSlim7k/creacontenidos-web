#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HTML="$ROOT/pages/tercer-tiempo.html"
CSS="$ROOT/assets/css/components.css"

fail() { echo "FAIL: $1" >&2; exit 1; }

count() { grep -rE "$1" "$HTML" "$CSS" 2>/dev/null | wc -l || true; }

if [[ $(count 'btn-tt-naranja') -ne 0 ]]; then fail "btn-tt-naranja aun presente"; fi
if grep -rE 'color-naranja|color-dorado' "$CSS" 2>/dev/null | grep -q .; then fail "color-naranja/color-dorado presente en CSS"; fi
if grep -rE 'style="[^"]*color:var\(--color-noche\)"' "$HTML" 2>/dev/null | grep -q .; then fail "inline --color-noche presente"; fi

echo "PASS: tokens TT OK"
