#!/usr/bin/env bash
# Cria o arquivo .env com senhas aleatórias fortes. Uso: ./scripts/setup.sh https://crm.seudominio.com voce@email.com
set -e; cd "$(dirname "$0")/.."; [ -f .env ] && { echo ".env já existe (apague se quiser recriar)"; exit 1; }
r(){ openssl rand -hex "${1:-16}"; }
cat > .env <<EOF
APP_PORT=3100
PUBLIC_URL=${1:-http://localhost:3100}
JWT_SECRET=$(r 32)
POSTGRES_PASSWORD=$(r 16)
APP_DB_PASSWORD=$(r 16)
PLATFORM_KEY=$(r 16)
WAHA_KEY=$(r 12)
PGADMIN_EMAIL=${2:-admin@nexora.local}
PGADMIN_PASSWORD=$(r 12)
PGADMIN_PORT=5050
PGADMIN_BIND=127.0.0.1
EOF
echo "Pronto. Guarde o .env em local seguro (senha do pgAdmin e PLATFORM_KEY estão nele)."; grep -E "PLATFORM_KEY|PGADMIN_(EMAIL|PASSWORD)" .env
