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

ARG VITE_ALGOLIA_APP_ID
ARG VITE_ALGOLIA_API_KEY

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
