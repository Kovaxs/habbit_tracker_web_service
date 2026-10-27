# syntax=docker/dockerfile:1

# Build stage: compile the app and produce the standalone output.
FROM node:24-slim AS builder
WORKDIR /app

# Copy dependency manifests first for layer caching.
COPY package.json package-lock.json ./
# better-sqlite3 has no prebuilt binary for every platform (for example
# Node 24 on linux/arm64), so keep C/C++ build tools available for node-gyp.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/* \
    && npm ci

# Copy the rest of the source and build. The build runs on Linux, so
# better-sqlite3 gets its Linux native binary traced into the standalone output.
COPY . .
RUN npm run build

# Runtime stage: only the standalone server, static assets, and migrations.
FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    # Default storage location. Override with -e DATABASE_PATH or compose env.
    DATABASE_PATH=/data/habit-tracker.sqlite

# /data holds the SQLite database. The node user (uid 1000) owns it, so a
# bind mount keeps write access with a matching host uid.
RUN mkdir -p /data && chown node:node /data

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
# Database migrations are applied at startup through src/server/db/connection.ts.
COPY --from=builder --chown=node:node /app/drizzle ./drizzle

USER node
VOLUME /data
EXPOSE 3000

CMD ["node", "server.js"]
