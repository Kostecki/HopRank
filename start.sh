#!/bin/sh

# Exit on any error
set -e

echo "Starting HopRank application..."

# Run database migrations
echo "Running database migrations..."
pnpm migrate

# Start the application
echo "Starting the server..."
exec pnpm start