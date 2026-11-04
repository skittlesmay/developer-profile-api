FROM node:24-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

FROM base AS builder
COPY package.json package-lock.json ./
RUN npm ci --no-audit
COPY tsconfig.json tsconfig.build.json nest-cli.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npx --no-install prisma generate
RUN npm run build

FROM builder AS init
ENV NODE_ENV=production
USER node
CMD ["sh", "-c", "npx --no-install prisma migrate deploy && npx --no-install prisma db seed"]

FROM builder AS production-dependencies
RUN npm prune --omit=dev --omit=optional --ignore-scripts --no-audit --offline

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json package-lock.json LICENSE ./
USER node
CMD ["node", "dist/main.js"]
