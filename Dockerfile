# Base with pnpm
FROM node:24-slim AS base
RUN npm install -g pnpm

# -------------------------------
# Build stage: Install + Build
FROM base AS build
WORKDIR /app

# Install dependencies (full)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy app source
COPY app/ ./app
COPY public/ ./public
COPY vite.config.ts tsconfig.json drizzle.config.ts postcss.config.cjs react-router.config.ts theme.ts ./

# Inject public env
ARG VITE_LOCALE
ARG VITE_TZ
ARG VITE_WS_URL
ARG VITE_ALGOLIA_APP_ID
ARG VITE_ALGOLIA_API_KEY
ARG VITE_UNTAPPD_CHECKIN

ENV VITE_LOCALE=$VITE_LOCALE
ENV VITE_TZ=$VITE_TZ
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_ALGOLIA_APP_ID=$VITE_ALGOLIA_APP_ID
ENV VITE_ALGOLIA_API_KEY=$VITE_ALGOLIA_API_KEY
ENV VITE_UNTAPPD_CHECKIN=$VITE_UNTAPPD_CHECKIN

# Build everything (this compiles better-sqlite3 bindings too)
RUN pnpm run build

# -------------------------------
# Final stage: Copy ready-to-run app
FROM base AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y tzdata tini && rm -rf /var/lib/apt/lists/*

# Copy everything from build
COPY --from=build /app /app

# Clean cache
RUN rm -rf /root/.pnpm-store /tmp/*

# Setup Tini
ENTRYPOINT ["/usr/bin/tini", "--"]

# Expose ports
EXPOSE 3000
EXPOSE 4000

# Start app
CMD ["pnpm", "start"]