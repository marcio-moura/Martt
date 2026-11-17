#!/usr/bin/env bash
# Cadastra um cliente no estúdio a partir do modelo.
# Uso: bash design/novo-cliente.sh <pasta-em-kebab-case> "Nome do Cliente"
set -euo pipefail
cd "$(dirname "$0")/clientes"
[ $# -eq 2 ] || { echo 'Uso: bash design/novo-cliente.sh infinity-celulares "Infinity Celulares"'; exit 1; }
[ -e "$1" ] && { echo "Já existe: design/clientes/$1"; exit 1; }
cp -r _modelo "$1"
sed -i "s/NOME DO CLIENTE/$2/" "$1/marca.json" "$1/ficha.md" "$1/calendario/MODELO-AAAA-MM.md"
echo "design/clientes/$1 criado. Preencha ficha.md e marca.json e coloque o logo em marca/."
