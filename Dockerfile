# ── Stage 1: Install dependencies ──────────────────────────────
# This layer is cached until package.json or package-lock.json changes.
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && npm cache clean --force

# ── Stage 2: Build the Next.js application ────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

# Copy config files first (rarely change → better cache hit)
COPY tsconfig.json next.config.ts drizzle.config.ts postcss.config.mjs ./
COPY package.json ./

# Copy source code (changes often → separate layer)
COPY src ./src
COPY public ./public
COPY scripts ./scripts

ENV NEXT_TELEMETRY_DISABLED=1
# Cap Node.js heap to 1.5GB to prevent OOM on small VPS (2CPU/4GB)
ENV NODE_OPTIONS="--max-old-space-size=1536"

RUN npm run build

# ── Stage 3: Production image ─────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Next.js standalone output includes server.js + required node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Drizzle schema push: copy config, schema, drizzle-kit + .bin symlink
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./
COPY --from=builder --chown=nextjs:nodejs /app/src/db/schema.ts ./src/db/schema.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/db/connection.ts ./src/db/connection.ts
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/drizzle-kit ./node_modules/drizzle-kit
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin/drizzle-kit ./node_modules/.bin/drizzle-kit

# Startup script
COPY --from=builder --chown=nextjs:nodejs /app/scripts/start.sh ./start.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "./start.sh"]
