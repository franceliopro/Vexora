#!/usr/bin/env bash
# Restaura um backup (do backup.sh OU do botão "Baixar backup" do painel da plataforma) num servidor novo.
# Uso: 1) clone o projeto no servidor novo   2) ./scripts/restore.sh caminho/nexora-xxxx.tar.gz
set -e; cd "$(dirname "$0")/.."; [ -f "$1" ] || { echo "uso: $0 arquivo.tar.gz"; exit 1; }
T=$(mktemp -d); tar -xzf "$1" -C "$T"; [ -f "$T/db.dump" ] || { echo "backup inválido (sem db.dump)"; exit 1; }
[ -f .env ] || { [ -f "$T/env.backup" ] && cp "$T/env.backup" .env && echo ".env restaurado do backup (ajuste PUBLIC_URL se o domínio mudou)"; } || { echo "crie o .env antes (./scripts/setup.sh)"; exit 1; }
docker compose up -d db; until docker compose exec -T db pg_isready -U nexora >/dev/null 2>&1; do sleep 2; done
docker compose exec -T db pg_restore --clean --if-exists --no-owner -U nexora -d nexora < "$T/db.dump"
docker compose up -d --build
sleep 8
if [ -d "$T/appdata" ]; then docker compose cp "$T/appdata/." app:/data; fi
[ -d "$T/media" ] && docker compose cp "$T/media" app:/data/
[ -d "$T/baileys" ] && docker compose cp "$T/baileys" app:/data/
[ -d "$T/waha" ] && docker compose cp "$T/waha/." waha:/app/.sessions
docker compose restart app waha; rm -rf "$T"; echo "Restauração concluída."
