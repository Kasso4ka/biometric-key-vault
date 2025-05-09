FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat

FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma/
COPY tsconfig.json ./tsconfig.json

RUN corepack enable pnpm && \
    pnpm i --frozen-lockfile

RUN pnpm prisma generate

FROM deps AS builder
WORKDIR /app

COPY fuzzy-extractor/pkg ./fuzzy-extractor/pkg

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_LINT=true
RUN pnpm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]