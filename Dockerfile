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
COPY package.json pnpm-lock.yaml ./

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
FROM node:23-alpine AS runner

RUN apk add tzdata

WORKDIR /app

# Ensure the database folder exists
RUN mkdir -p /app/database

# Copy only runtime artifacts
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/public ./public
COPY --from=build /app/app/database/migrations ./database/migrations
COPY package.json pnpm-lock.yaml ./

# Rebuild native modules for Alpine/musl
RUN npm rebuild better-sqlite3

# Cleanup and install tini
RUN apk add --no-cache tini \
  && npm cache clean --force \
  && rm -rf /root/.npm /root/.pnpm-store /tmp/*

# Setup tini for correct signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Set environment to production
ENV NODE_ENV=production

# Expose app port
EXPOSE 3000
EXPOSE 4000

# Start the app
CMD ["npm", "start"]