# -----------------------------------
# Base image with pnpm installed
FROM node:24-slim AS base
RUN npm install -g pnpm

# -----------------------------------
# Build the app (frontend + backend)
FROM base AS build
WORKDIR /app

# Copy app source and config
COPY app/ ./app
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

RUN pnpm install --frozen-lockfile
RUN pnpm run build

# -----------------------------------
# Final runtime image
FROM base AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y tzdata tini && rm -rf /var/lib/apt/lists/*

# Copy built artifacts and full node_modules (already installed above)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/public ./public
COPY --from=build /app/app/database/migrations ./migrations
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Rebuild better-sqlite3 in final environment (Node 24-slim)
RUN pnpm rebuild better-sqlite3

# Cleanup
RUN rm -rf /root/.pnpm-store /tmp/*

# Setup tini
ENTRYPOINT ["/usr/bin/tini", "--"]

EXPOSE 3000 4000

CMD ["pnpm", "start"]
