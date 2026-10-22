# ── Stage 1: Install dependencies ──────────────────────────────
# This layer is cached until package.json or package-lock.json changes.
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && npm cache clean --force

# ── Stage 2: Build the Next.js application ────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

# Copy config files first (rarely change → better cache hit)
COPY tsconfig.json next.config.ts drizzle.config.ts postcss.config.mjs ./
COPY package.json ./

# Copy source code (changes often → separate layer)
COPY src ./src
COPY public ./public
COPY scripts ./scripts

# Client-side flags are inlined by `next build` (next.config.ts `env`), so they
# must be known here, not at runtime. Non-secret values only: this image is
# public. Defaults reproduce the current production bundle
# (docs/ops/ci-baseline.md). ARGs stay in this stage and never reach the
# runtime image. Empty URL ARGs are unset so they are not inlined as "".
ARG DOCKYARD_AUTH_ENABLED=false
ARG DOCKYARD_GITHUB_AUTH_ENABLED=false
ARG DOCKYARD_SESSION_IDLE_TIMEOUT=1800
ARG NEXT_PUBLIC_KUMA_URL=
ARG NEXT_PUBLIC_SITE_URL=

ENV NEXT_TELEMETRY_DISABLED=1
# Cap Node.js heap to 1.5GB to prevent OOM on small VPS (2CPU/4GB)
ENV NODE_OPTIONS="--max-old-space-size=1536"

RUN [ -n "$NEXT_PUBLIC_KUMA_URL" ] || unset NEXT_PUBLIC_KUMA_URL; \
    [ -n "$NEXT_PUBLIC_SITE_URL" ] || unset NEXT_PUBLIC_SITE_URL; \
    npm run build

# ── Stage 2b: schema-push tooling (versions from the lock file) ──
FROM node:22-alpine AS migrator
WORKDIR /migrate
COPY package-lock.json /tmp/
RUN v() { node -p "require('/tmp/package-lock.json').packages['node_modules/$1'].version"; } && \
    npm init -y >/dev/null && \
    npm install --ignore-scripts --no-audit --no-fund \
      "drizzle-kit@$(v drizzle-kit)" "drizzle-orm@$(v drizzle-orm)" "postgres@$(v postgres)" && \
    npm cache clean --force

# ── Stage 3: Production image ─────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Next.js standalone output includes server.js + required node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Drizzle schema push runs from /app/migrate, which has drizzle-kit with its
# full dependency tree (esbuild etc.); copying single packages left it broken (BUG-024).
COPY --from=migrator --chown=nextjs:nodejs /migrate ./migrate
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./migrate/
COPY --from=builder --chown=nextjs:nodejs /app/src/db/schema.ts ./migrate/src/db/schema.ts

# Startup script
COPY --from=builder --chown=nextjs:nodejs /app/scripts/start.sh ./start.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "./start.sh"]
