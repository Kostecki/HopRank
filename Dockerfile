# Base for dev/build
FROM node:25-slim AS base
RUN npm install -g pnpm
WORKDIR /app

# Install all (dev) deps with build tools
FROM base AS deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Use a cache for the pnpm store to speed subsequent builds
RUN --mount=type=cache,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile

# Build the app (frontend + backend) with env injection
FROM deps AS build
COPY app/ ./app
COPY public/ ./public
COPY vite.config.ts tsconfig.json drizzle.config.ts postcss.config.cjs react-router.config.ts theme.ts ./
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Build-time public env variables
ARG VITE_WS_URL
ARG VITE_ALGOLIA_APP_ID
ARG VITE_ALGOLIA_API_K
ARG VITE_UMAMI_SRC_URL
ARG VITE_UMAMI_WEBSITE_ID
ARG VITE_LATEST_COMMIT_HASH
ARG VITE_LATEST_COMMIT_MESSAGE

# Export so Vite can read process.env.* during build
ENV VITE_WS_URL=$VITE_WS_URL \
    VITE_ALGOLIA_APP_ID=$VITE_ALGOLIA_APP_ID \
    VITE_ALGOLIA_API_K=$VITE_ALGOLIA_API_K \
    VITE_UMAMI_SRC_URL=$VITE_UMAMI_SRC_URL \
    VITE_UMAMI_WEBSITE_ID=$VITE_UMAMI_WEBSITE_ID \
    VITE_LATEST_COMMIT_HASH=$VITE_LATEST_COMMIT_HASH \
    VITE_LATEST_COMMIT_MESSAGE=$VITE_LATEST_COMMIT_MESSAGE

RUN pnpm run build

# Prune dev deps to production-only
FROM deps AS prod-deps
# Prune uses the existing node_modules from deps
RUN pnpm prune --prod

# Final runtime image (Debian slim)
FROM node:25-slim AS runner
RUN apt-get update \
  && apt-get install -y --no-install-recommends tzdata tini ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm
WORKDIR /app

# Ensure the database folder exists
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

ENTRYPOINT ["/usr/bin/tini", "--"]
ENV NODE_ENV=production
EXPOSE 3000 4000
CMD ["./start.sh"]