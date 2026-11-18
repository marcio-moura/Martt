#!/usr/bin/env bash
# Monta a pasta .site que a Vercel publica (chamado pelo buildCommand do vercel.json).
set -euo pipefail
cd "$(dirname "$0")"
rm -rf .site
mkdir -p .site/horarios .site/edicao
cp index.html .site/
cp horarios/index.html .site/horarios/index.html
cp edicao/index.html .site/edicao/index.html
cp -r portfolio .site/portfolio
cp -r ecossistema/dist .site/ecossistema
bash analises-instagram/publicar-site.sh
