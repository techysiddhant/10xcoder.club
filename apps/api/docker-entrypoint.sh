#!/bin/sh
set -e

echo "🚀 Starting application..."

# Note: Database migrations should be handled either:
# 1. Programmatically at application startup (recommended for Drizzle)
# 2. As a separate CI/CD step before deployment
# The production image uses distroless and doesn't have drizzle-kit CLI

# Start the application
if [ ! -x "./server" ]; then
    echo "❌ Error: ./server not found or not executable"
    exit 1
fi

exec ./server
