# Stage 1: Install all dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate

# Build-time public env vars — Next.js bakes NEXT_PUBLIC_* into the JS bundle
# at compile time, so they must be present here (not just at runtime).
ARG NEXT_PUBLIC_BMAC_USERNAME
ARG NEXT_PUBLIC_AWIN_ID
ARG NEXT_PUBLIC_SPONSORED_URL
ARG NEXT_PUBLIC_SPONSORED_LABEL
ARG NEXT_PUBLIC_SPONSORED_TEXT

ENV NEXT_PUBLIC_BMAC_USERNAME=$NEXT_PUBLIC_BMAC_USERNAME
ENV NEXT_PUBLIC_AWIN_ID=$NEXT_PUBLIC_AWIN_ID
ENV NEXT_PUBLIC_SPONSORED_URL=$NEXT_PUBLIC_SPONSORED_URL
ENV NEXT_PUBLIC_SPONSORED_LABEL=$NEXT_PUBLIC_SPONSORED_LABEL
ENV NEXT_PUBLIC_SPONSORED_TEXT=$NEXT_PUBLIC_SPONSORED_TEXT

RUN npm run build

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/src/generated ./src/generated

# Install runtime deps needed for Prisma CLI (migrate deploy)
RUN npm install dotenv

# Create data directory for SQLite
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
