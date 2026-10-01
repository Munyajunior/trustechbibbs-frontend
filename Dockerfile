# syntax=docker/dockerfile:1
# =============================================================================
# THIBBS frontend image — Next.js standalone output.
#
#   docker build -t thibbs-frontend \
#     --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1 \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://www.example.com \
#     --build-arg NEXT_PUBLIC_ENV=production .
#
# NOTE: NEXT_PUBLIC_* values are inlined into the browser bundle at BUILD time,
# so they must be passed as build args — setting them at `docker run` has no
# effect on client-side code. A different environment means a different image.
# =============================================================================

# ---- Dependencies -----------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
RUN npm install --global pnpm@12.0.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=trustech-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm config set fetch-retries 5 \
    && pnpm config set fetch-timeout 300000 \
    && pnpm install --frozen-lockfile

# ---- Build ------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_ENV=production
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_ENV=$NEXT_PUBLIC_ENV \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build

# ---- Runtime ----------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# `output: "standalone"` emits a minimal server + only the deps it actually uses.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/en').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
