#!/usr/bin/env bash
# Backup COMPLETO e portátil: banco (todas as empresas) + mídia + sessões WhatsApp + .env  →  backups/nexora-DATA.tar.gz
# Rode na pasta do projeto, no servidor. ATENÇÃO: o arquivo contém segredos (.env). Guarde-o em local seguro.
set -e; cd "$(dirname "$0")/.."; mkdir -p backups; T=$(mktemp -d); F=backups/nexora-$(date +%Y%m%d-%H%M).tar.gz
docker compose exec -T db pg_dump -Fc -U nexora nexora > "$T/db.dump"
docker compose cp app:/data "$T/appdata"
docker compose cp waha:/app/.sessions "$T/waha" 2>/dev/null || true
[ -f .env ] && cp .env "$T/env.backup"
tar -czf "$F" -C "$T" . && rm -rf "$T"; echo "OK → $F ($(du -h "$F" | cut -f1))"
