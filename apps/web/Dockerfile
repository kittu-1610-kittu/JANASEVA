# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app

# ─── Dependencies ─────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# ─── Development ──────────────────────────────────────────────────────────────
FROM deps AS development
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ─── Builder ──────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── Production ───────────────────────────────────────────────────────────────
FROM base AS production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
