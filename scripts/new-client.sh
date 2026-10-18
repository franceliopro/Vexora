#!/usr/bin/env bash
# MODO ILHA (opcional): uma stack inteira separada por cliente (servidor/banco só dele).
# Para várias empresas na MESMA stack, use o painel /platform.html — é o modo padrão.
# uso: ./scripts/new-client.sh nome 3101 https://crm.cliente.com
set -e; cd "$(dirname "$0")/.."; N=$1; P=${2:-3101}; mkdir -p clients; r(){ openssl rand -hex "${1:-16}"; }
cat > clients/$N.env <<EOF
APP_PORT=$P
PUBLIC_URL=${3:-http://localhost:$P}
JWT_SECRET=$(r 32)
POSTGRES_PASSWORD=$(r 16)
APP_DB_PASSWORD=$(r 16)
PLATFORM_KEY=$(r 16)
WAHA_KEY=$(r 12)
PGADMIN_EMAIL=admin@$N.local
PGADMIN_PASSWORD=$(r 12)
PGADMIN_PORT=$((P+1000))
PGADMIN_BIND=127.0.0.1
EOF
docker compose -p nexora_$N --env-file clients/$N.env up -d --build; echo "Cliente $N no ar: porta $P"
