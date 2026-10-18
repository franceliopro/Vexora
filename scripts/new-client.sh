#!/usr/bin/env bash
# uso: ./scripts/new-client.sh nome 3101 https://crm.cliente.com
set -e; N=$1; P=${2:-3100}; U=${3:-http://localhost:$P}; mkdir -p clients
cat > clients/$N.env <<EOF
APP_PORT=$P
PUBLIC_URL=$U
JWT_SECRET=$(openssl rand -hex 24)
POSTGRES_PASSWORD=$(openssl rand -hex 16)
WAHA_KEY=$(openssl rand -hex 12)
EOF
docker compose -p nexora_$N --env-file clients/$N.env up -d --build
echo "Cliente $N no ar: $U (banco, volume e WAHA próprios)"
