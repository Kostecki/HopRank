# -----------------------------------
# Base for dev/build
FROM node:25-slim AS base
RUN npm install -g pnpm
WORKDIR /app

# Install dev deps
FROM base AS deps

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Build stage with env injection
FROM deps AS build
WORKDIR /app
COPY app/ ./app
COPY public/ ./public
COPY vite.config.ts tsconfig.json drizzle.config.ts postcss.config.cjs react-router.config.ts theme.ts ./
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Build-time public env variables (must be declared in this stage)
ARG VITE_WS_URL
ARG VITE_ALGOLIA_APP_ID
ARG VITE_ALGOLIA_API_K
ARG VITE_UMAMI_SRC_URL
ARG VITE_UMAMI_WEBSITE_ID
ARG VITE_LATEST_COMMIT_HASH
ARG VITE_LATEST_COMMIT_MESSAGE

# Export them so Vite can read process.env.* during build
ENV VITE_WS_URL=$VITE_WS_URL \
    VITE_ALGOLIA_APP_ID=$VITE_ALGOLIA_APP_ID \
    VITE_ALGOLIA_API_K=$VITE_ALGOLIA_API_K \
    VITE_UMAMI_SRC_URL=$VITE_UMAMI_SRC_URL \
    VITE_UMAMI_WEBSITE_ID=$VITE_UMAMI_WEBSITE_ID \
    VITE_LATEST_COMMIT_HASH=$VITE_LATEST_COMMIT_HASH \
    VITE_LATEST_COMMIT_MESSAGE=$VITE_LATEST_COMMIT_MESSAGE

RUN pnpm run build

# -----------------------------------
# Install production-only dependencies on Alpine (compile native modules)
FROM node:25-alpine AS prod-deps
RUN apk add --no-cache tzdata python3 make g++
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

# -----------------------------------
# Final runtime image
FROM node:25-alpine AS runner
RUN apk add --no-cache tzdata tini
RUN npm install -g pnpm
WORKDIR /app

RUN mkdir -p /app/database

# Copy runtime artifacts
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/public ./public
COPY --from=build /app/app/database/migrations ./app/database/migrations
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
COPY package.json pnpm-lock.yaml ./
COPY start.sh ./
RUN chmod +x start.sh

ENTRYPOINT ["/sbin/tini", "--"]
ENV NODE_ENV=production
EXPOSE 3000 4000
CMD ["./start.sh"]