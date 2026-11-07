#!/bin/sh
set -e

node scripts/migrate.mjs

exec node node_modules/@react-router/serve/bin.cjs ./build/server/index.js
