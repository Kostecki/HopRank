# Base stage: Install pnpm globally
FROM node:23-slim AS base
RUN npm install -g pnpm

# Development dependencies (full install)
FROM base AS development-dependencies-env
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .

# Production dependencies (only prod deps)
FROM base AS production-dependencies-env
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Build app
FROM base AS build-env
WORKDIR /app

ARG BASE_URL
ARG SESSION_SECRET
ARG DATABASE_PATH
ARG MIGRATIONS_PATH
ARG FB_OAUTH_CLIENT_ID
ARG FB_OAUTH_CLIENT_SECRET
ARG FB_OAUTH_AUTH_ENDPOINT
ARG FB_OAUTH_TOKEN_ENDPOINT
ARG FB_OAUTH_USERINFO_ENDPOINT
ARG VITE_ALGOLIA_APP_ID
ARG VITE_ALGOLIA_API_KEY

ENV BASE_URL=$BASE_URL
ENV SESSION_SECRET=$SESSION_SECRET
ENV DATABASE_PATH=$DATABASE_PATH
ENV MIGRATIONS_PATH=$MIGRATIONS_PATH
ENV FB_OAUTH_CLIENT_ID=$FB_OAUTH_CLIENT_ID
ENV FB_OAUTH_CLIENT_SECRET=$FB_OAUTH_CLIENT_SECRET
ENV FB_OAUTH_AUTH_ENDPOINT=$FB_OAUTH_AUTH_ENDPOINT
ENV FB_OAUTH_TOKEN_ENDPOINT=$FB_OAUTH_TOKEN_ENDPOINT
ENV FB_OAUTH_USERINFO_ENDPOINT=$FB_OAUTH_USERINFO_ENDPOINT
ENV VITE_ALGOLIA_APP_ID=$VITE_ALGOLIA_APP_ID
ENV VITE_ALGOLIA_API_KEY=$VITE_ALGOLIA_API_KEY

COPY --from=development-dependencies-env /app /app
RUN pnpm build

# Final runtime image - SWITCH to Alpine!
FROM node:23-alpine

# Set working directory
WORKDIR /app

# Install pnpm runtime (because Alpine image has nothing)
RUN npm install -g pnpm

# Copy only what's needed
COPY package.json pnpm-lock.yaml ./
COPY --from=production-dependencies-env /app/node_modules ./node_modules
COPY --from=build-env /app/build ./build

EXPOSE 3000

CMD ["pnpm", "start"]
