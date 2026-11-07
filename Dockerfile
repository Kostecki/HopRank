# syntax=docker/dockerfile:1

# Matches mise.toml.
ARG NODE_VERSION=26.13.0

# Install and build run on the build machine's own platform: the output is
# platform-independent JS, and better-sqlite3 (the only native dependency)
# ships prebuilds for every platform and picks one at runtime. Only the
# runtime stage is built per target platform, so arm64 needs no emulation.
FROM --platform=$BUILDPLATFORM node:${NODE_VERSION}-alpine AS base
WORKDIR /hop-rank
COPY package.json ./
RUN npm install -g "pnpm@$(node -p "require('./package.json').packageManager.split('@')[1]")"

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,target=/pnpm-store \
	pnpm install --frozen-lockfile --store-dir /pnpm-store

FROM deps AS build
COPY app/ ./app
COPY public/ ./public
COPY vite.config.ts tsconfig.json postcss.config.cjs react-router.config.ts theme.ts ./

# Public values inlined into the bundle at build time
ARG VITE_WS_URL
ARG VITE_ALGOLIA_APP_ID
ARG VITE_ALGOLIA_API_K
ARG VITE_UMAMI_SRC_URL
ARG VITE_UMAMI_WEBSITE_ID
ARG VITE_LATEST_COMMIT_HASH
ARG VITE_LATEST_COMMIT_MESSAGE

RUN pnpm run build

# A fresh install, so no dev dependency is left behind.
FROM base AS prod-deps
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,target=/pnpm-store \
	pnpm install --frozen-lockfile --prod --store-dir /pnpm-store

FROM node:${NODE_VERSION}-alpine AS runner
RUN apk add --no-cache tini

WORKDIR /hop-rank
ENV NODE_ENV=production

# App files stay owned by root, so the server can't modify itself. Only the
# database directory (a volume in production) is writable by the node user.
COPY --from=prod-deps /hop-rank/node_modules ./node_modules
COPY --from=build /hop-rank/build ./build
COPY drizzle/ ./drizzle
COPY scripts/migrate.mjs ./scripts/
COPY package.json ./
COPY --chmod=755 start.sh ./
RUN mkdir -p app/database && chown node:node app/database

USER node

EXPOSE 3000 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
	CMD wget -qO- http://127.0.0.1:3000/healthz >/dev/null || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["./start.sh"]
