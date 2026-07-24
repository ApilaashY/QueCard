# 1. Base image for shared dependencies
FROM node:26-slim AS base

# 2. Dependencies stage
FROM base AS deps
WORKDIR /app

# Copy package files to install dependencies
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
RUN npm ci

# 3. Builder stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate the Prisma client locally for Next.js to use in code compilation
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
ENV REDIS_URL=redis://localhost:6379

RUN npm run build

# 4. Runner stage (Production)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create a secure, non-root system user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --home /home/nextjs nextjs

# Copy the optimized standalone server assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy prisma config + schema so `prisma db push` can run at startup
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

# Copy node_modules so the `prisma` CLI is available at runtime
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy the startup entrypoint
COPY --chown=nextjs:nodejs docker/entrypoint.sh ./entrypoint.sh

USER nextjs

EXPOSE 3000

# Run migrations then start the app
CMD ["sh", "entrypoint.sh"]
