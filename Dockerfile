# Base image with pnpm
FROM node:24-slim AS base
RUN npm install -g pnpm

# Dependencies + Build
FROM base AS build
WORKDIR /app

# Install system deps needed for native modules
RUN apt-get update && apt-get install -y build-essential python3 && rm -rf /var/lib/apt/lists/*

# Copy files and install all deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Inject public envs
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

COPY . .
RUN pnpm run build

# Production image
FROM node:24-slim AS runner
WORKDIR /app

RUN npm install -g pnpm

# Install tini and tzdata
RUN apt-get update && apt-get install -y tini tzdata && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["/usr/bin/tini", "--"]

# Copy built app and runtime deps
COPY --from=build /app/build ./build
COPY --from=build /app/public ./public
COPY --from=build /app/app/database/migrations ./migrations
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Copy just prod deps
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3000
EXPOSE 4000

CMD ["pnpm", "start"]
