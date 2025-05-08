# -----------------------------------
# Base image with pnpm installed
FROM node:24-slim AS base
RUN npm install -g pnpm

# -----------------------------------
# Install dependencies
FROM base AS deps
WORKDIR /app

# Copy only package manifests first
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# -----------------------------------
# Build the app (frontend + backend)
FROM deps AS build
WORKDIR /app

# Copy app source
COPY app/ ./app

# Copy config files
COPY public/ ./public
COPY vite.config.ts tsconfig.json drizzle.config.ts postcss.config.cjs react-router.config.ts theme.ts ./
COPY package.json pnpm-lock.yaml ./

# Inject public build-time environment variables
ARG VITE_LOCALE
ENV VITE_LOCALE=$VITE_LOCALE

ARG VITE_TZ
ENV VITE_TZ=$VITE_TZ

ARG VITE_WS_URL
ENV VITE_WS_URL=$VITE_WS_URL

ARG VITE_ALGOLIA_APP_ID
ENV VITE_ALGOLIA_APP_ID=$VITE_ALGOLIA_APP_ID

ARG VITE_ALGOLIA_API_KEY
ENV VITE_ALGOLIA_API_KEY=$VITE_ALGOLIA_API_KEY

ARG VITE_UNTAPPD_CHECKIN
ENV VITE_UNTAPPD_CHECKIN=$VITE_UNTAPPD_CHECKIN

# Build the frontend + backend
RUN pnpm run build

# -----------------------------------
# Install production-only dependencies
FROM base AS prod-deps
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Rebuild native modules for Node 24-slim inside this stage
RUN pnpm rebuild better-sqlite3

# -----------------------------------
# Final runtime image
FROM base AS runner

RUN apt-get update && apt-get install -y tzdata tini && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy runtime artifacts
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/public ./public
COPY --from=build /app/app/database/migrations ./migrations
COPY package.json pnpm-lock.yaml ./

# Cleanup
RUN rm -rf /root/.pnpm-store /tmp/*

# Setup tini for signal handling
ENTRYPOINT ["/usr/bin/tini", "--"]

# Expose app ports
EXPOSE 3000
EXPOSE 4000

# Start the web server
CMD ["pnpm", "start"]