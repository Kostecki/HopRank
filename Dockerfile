# -----------------------------------
# Install production-only dependencies ON ALPINE (musl)
FROM node:25-alpine AS prod-deps
RUN apk add --no-cache tzdata python3 make g++
RUN npm install -g pnpm
WORKDIR /app

# Copy manifests + workspace config BEFORE pnpm commands
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# If you still see "Ignored build scripts" warnings, uncomment the next line:
# RUN pnpm approve-builds better-sqlite3 esbuild

RUN pnpm install --prod --frozen-lockfile

# -----------------------------------
# Final runtime image (Alpine)
FROM node:25-alpine AS runner
RUN apk add --no-cache tzdata tini
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


ENTRYPOINT ["/sbin/tini", "--"]
ENV NODE_ENV=production
EXPOSE 3000 4000
CMD ["./start.sh"]