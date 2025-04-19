# -------------------------------
# Base build image with pnpm installed
FROM node:23-slim AS base
RUN npm install -g pnpm

# -------------------------------
# Install all dependencies (development)
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# -------------------------------
# Build app (frontend and backend)
FROM deps AS build
WORKDIR /app

# Inject build-time only env vars (only public VITE_*)
ARG VITE_ALGOLIA_APP_ID
ARG VITE_ALGOLIA_API_KEY
ENV VITE_ALGOLIA_APP_ID=$VITE_ALGOLIA_APP_ID
ENV VITE_ALGOLIA_API_KEY=$VITE_ALGOLIA_API_KEY

COPY . .
RUN pnpm run build

# -------------------------------
# Install production dependencies only (no dev deps)
FROM base AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# -------------------------------
# Final runtime image (no pnpm needed)
FROM node:23-alpine AS runner

WORKDIR /app

# Copy built output and runtime deps
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/migrations ./migrations
COPY package.json pnpm-lock.yaml ./

# 🛠 Rebuild native modules (like better-sqlite3) for Alpine/musl
RUN npm rebuild better-sqlite3

# Cleanup to minimize final image size
RUN apk add --no-cache tini \
  && npm cache clean --force \
  && rm -rf /root/.npm /root/.pnpm-store /tmp/*

# Use tini as entrypoint for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]


EXPOSE 3000

CMD ["node", "./build/server/index.js"]