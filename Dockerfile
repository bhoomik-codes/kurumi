# syntax=docker/dockerfile:1
# KURUMI app root: kurumi/ (Electron 30 + LanceDB + better-sqlite3)
# -----------------------------------------------------------------------------
# Stage 1 — compile native modules against the same glibc / toolchain as runtime
# -----------------------------------------------------------------------------
FROM node:20-bookworm AS native-builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    pkg-config \
    libsqlite3-dev \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY kurumi/package.json kurumi/package-lock.json ./
RUN npm ci

COPY kurumi/ ./
RUN npx electron-rebuild -f -w @lancedb/lancedb better-sqlite3

# -----------------------------------------------------------------------------
# Stage 2 — runtime GUI + optional in-container VNC / noVNC
# -----------------------------------------------------------------------------
FROM node:20-bookworm AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    tini \
    python3 \
    python3-websockify \
    tigervnc-standalone-server \
    novnc \
    ca-certificates \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libsqlite3-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
  && rm -rf /var/lib/apt/lists/*

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

COPY --from=native-builder /app /app

ENV KURUMI_DOCKER=1 \
    NODE_ENV=development

ENV XDG_CONFIG_HOME=/kurumi/persist

EXPOSE 5173 6080

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]
