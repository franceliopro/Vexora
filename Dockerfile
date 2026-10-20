FROM node:20-bookworm-slim
# pg_dump 16 (igual ao servidor) para o botão de backup + ffmpeg para áudio
RUN apt-get update && apt-get install -y --no-install-recommends git ffmpeg poppler-utils antiword unzip unrtf ca-certificates curl gnupg tar \
 && install -d /usr/share/postgresql-common/pgdg && curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc \
 && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
 && apt-get update && apt-get install -y --no-install-recommends postgresql-client-16 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN node scripts/check-imports.mjs
ENV MEDIA_DIR=/data/media PORT=3000
VOLUME /data
EXPOSE 3000
CMD ["node","src/server.js"]

