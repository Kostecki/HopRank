# -----------------------------------
# Base image with pnpm installed
FROM node:24-slim AS base
RUN npm install -g pnpm

# -----------------------------------
# Install development dependencies
FROM base AS deps
WORKDIR /app

# Copy only package manifests first
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# -----------------------------------
# Build the app (frontend + backend)
FROM deps AS build
WORKDIR /app

# Copy app source folder
COPY app/ ./app

# Copy config files
COPY public/ ./public
COPY vite.config.ts tsconfig.json drizzle.config.ts postcss.config.cjs react-router.config.ts theme.ts ./
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Inject public build-time environment variables
ARG VITE_WS_URL
ENV VITE_WS_URL=$VITE_WS_URL

ARG VITE_ALGOLIA_APP_ID
ENV VITE_ALGOLIA_APP_ID=$VITE_ALGOLIA_APP_ID

ARG VITE_ALGOLIA_API_KEY
ENV VITE_ALGOLIA_API_KEY=$VITE_ALGOLIA_API_KEY

ARG VITE_UMAMI_SRC_URL
ENV VITE_UMAMI_SRC_URL=$VITE_UMAMI_SRC_URL

ARG VITE_UMAMI_WEBSITE_ID
ENV VITE_UMAMI_WEBSITE_ID=$VITE_UMAMI_WEBSITE_ID

ARG VITE_LATEST_COMMIT_HASH
ENV VITE_LATEST_COMMIT_HASH=$VITE_LATEST_COMMIT_HASH

ARG VITE_LATEST_COMMIT_MESSAGE
ENV VITE_LATEST_COMMIT_MESSAGE=$VITE_LATEST_COMMIT_MESSAGE

# Build the frontend + backend
RUN pnpm run build

# -----------------------------------
# Install production-only dependencies
FROM base AS prod-deps
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# -----------------------------------
# Final runtime image
FROM node:24-alpine AS runner

WORKDIR /app

# Copy package manifests first
COPY package.json pnpm-lock.yaml ./

# Enable pnpm in this stage
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install tzdata, tini, and minimal build deps for better-sqlite3
# Rebuild better-sqlite3 and clean everything in one layer
RUN apk add --no-cache tzdata tini python3 g++ make musl-dev && \
  pnpm install --prod --frozen-lockfile && \
  apk del python3 g++ make musl-dev && \
  pnpm store prune && \
  rm -rf /root/.npm /root/.pnpm-store /tmp/*

# Copy runtime artifacts
COPY --from=build /app/build ./build
COPY --from=build /app/public ./public
COPY --from=build /app/app/database/migrations ./database/migrations

# Ensure database folder exists
RUN mkdir -p /app/database

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Set production environment
ENV NODE_ENV=production

# Expose app ports
EXPOSE 3000 4000

# Start the app
CMD ["pnpm", "start"]