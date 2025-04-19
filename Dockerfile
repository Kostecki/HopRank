# syntax=docker/dockerfile:1.5

# -------------------------------
# Base image with pnpm installed
FROM node:23-slim AS base
RUN npm install -g pnpm

# -------------------------------
# Install development dependencies
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# -------------------------------
# Build the app (frontend and backend)
FROM deps AS build
WORKDIR /app

# Copy only necessary source files
COPY app/. ./database/
COPY vite.config.ts tsconfig.json drizzle.config.ts postcss.config.cjs react-router.config.ts theme.ts ./
COPY package.json pnpm-lock.yaml ./

# Inject build-time environment variables
ARG VITE_ALGOLIA_APP_ID
ARG VITE_ALGOLIA_API_KEY
ENV VITE_ALGOLIA_APP_ID=$VITE_ALGOLIA_APP_ID
ENV VITE_ALGOLIA_API_KEY=$VITE_ALGOLIA_API_KEY

# Build frontend and backend
RUN pnpm run build

# -------------------------------
# Install production-only dependencies
FROM base AS prod-deps
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# -------------------------------
# Final runtime image
FROM node:23-alpine AS runner

WORKDIR /app

# Copy built app and runtime deps
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/database ./database
COPY package.json pnpm-lock.yaml ./

# Rebuild native modules for Alpine/musl
RUN npm rebuild better-sqlite3

# Clean up and install tini
RUN apk add --no-cache tini \
  && npm cache clean --force \
  && rm -rf /root/.npm /root/.pnpm-store /tmp/*

ENTRYPOINT ["/sbin/tini", "--"]

EXPOSE 3000

CMD ["node", "./build/server/index.js"]