#!/usr/bin/env bash
# Copia os relatórios gerados para o site (.site/analise/).
#   .site/analise/<cliente>/<AAAA-MM>/  → relatório daquele mês
#   .site/analise/<cliente>/            → relatório mais recente
# Só os .html saem daqui; os JSON (com notas internas) ficam no repositório.
set -euo pipefail
cd "$(dirname "$0")"
destino="../.site/analise"
for pasta in clientes/*/; do
  cliente=$(basename "$pasta")
  ultimo=""
  for rel in "$pasta"*.html; do
    [ -e "$rel" ] || continue
    mes=$(basename "$rel" .html)
    mkdir -p "$destino/$cliente/$mes"
    cp "$rel" "$destino/$cliente/$mes/index.html"
    ultimo="$rel"
  done
  if [ -n "$ultimo" ]; then cp "$ultimo" "$destino/$cliente/index.html"; fi
done
