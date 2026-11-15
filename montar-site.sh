#!/usr/bin/env bash
# Monta a pasta .site que a Vercel publica (chamado pelo buildCommand do vercel.json).
set -euo pipefail
cd "$(dirname "$0")"
rm -rf .site
mkdir -p .site/horarios
cp index.html .site/
cp horarios/index.html .site/horarios/index.html
mkdir -p .site/cases
cp -r cases/. .site/cases/
cp -r ecossistema/dist .site/ecossistema
bash analises-instagram/publicar-site.sh
