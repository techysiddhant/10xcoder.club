#!/bin/bash
# Run Database Migrations on Production
# This script connects to the production database and applies pending migrations
# Run this BEFORE or AFTER deploying new code that requires schema changes

set -e

echo "🗄️  Production Database Migration"
echo "=================================="

# Configuration - can be overridden with environment variables
HOST="${HOST:-your-ec2-host}"
USERNAME="${USERNAME:-ubuntu}"
KEY_PATH="${KEY_PATH:-~/.ssh/id_rsa}"
PROJECT_NAME="${PROJECT_NAME:-10xcoder-prod}"

# Check required inputs
if [ "$HOST" == "your-ec2-host" ]; then
    echo "Error: Please set HOST environment variable"
    echo ""
    echo "Usage:"
    echo "  HOST=your-ec2-ip ./scripts/run-migrations.sh"
    echo ""
    echo "Options:"
    echo "  HOST          - EC2 host IP or domain (required)"
    echo "  USERNAME      - SSH username (default: ubuntu)"
    echo "  KEY_PATH      - Path to SSH key (default: ~/.ssh/id_rsa)"
    echo "  PROJECT_NAME  - Project name (default: 10xcoder-prod)"
    echo "  DRY_RUN       - Set to 'true' to preview without applying"
    exit 1
fi

DRY_RUN="${DRY_RUN:-false}"

echo "Host: $HOST"
echo "Project: $PROJECT_NAME"
echo "Dry Run: $DRY_RUN"
echo ""

# Confirm before proceeding
if [ "$DRY_RUN" != "true" ]; then
    echo "⚠️  WARNING: This will apply migrations to the PRODUCTION database!"
    read -p "Are you sure you want to continue? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "Cancelled."
        exit 0
    fi
fi

echo ""
echo "Connecting to $HOST..."

# Run migrations via SSH
ssh -i "$KEY_PATH" "$USERNAME@$HOST" << ENDSSH
set -e

cd ~/${PROJECT_NAME}

# Source environment variables
if [ -f .env ]; then
    export \$(grep -v '^#' .env | xargs)
fi

echo "📦 Current database container:"
docker compose ps db

# Build the database URL
DB_URL="postgresql://\${POSTGRES_USER}:\${POSTGRES_PASSWORD}@\${DB_CONTAINER_NAME:-localhost}:\${POSTGRES_PORT:-5432}/\${POSTGRES_DB}"

echo ""
echo "🔍 Checking pending migrations..."

# Option 1: Run migrations using the app container (if it has drizzle-kit)
# This requires the app container to have drizzle-kit installed

# Option 2: Run migrations by executing drizzle-kit in a temporary container
# This is more reliable as it doesn't depend on the app container's runtime

if [ "$DRY_RUN" == "true" ]; then
    echo ""
    echo "📋 DRY RUN - Would apply the following migrations:"
    ls -la apps/api/drizzle/*.sql 2>/dev/null || echo "No migration files found"
    echo ""
    echo "To apply migrations, run without DRY_RUN=true"
else
    echo ""
    echo "🚀 Applying migrations..."
    
    # Run drizzle-kit migrate using a temporary Node container
    # This connects to the database directly and applies migrations
    docker run --rm \
        --network ${PROJECT_NAME}_default \
        -v "\$(pwd)/apps/api:/app" \
        -w /app \
        -e DATABASE_URL="postgresql://\${POSTGRES_USER}:\${POSTGRES_PASSWORD}@db:5432/\${POSTGRES_DB}" \
        node:20-alpine \
        sh -c "npm install drizzle-kit drizzle-orm postgres && npx drizzle-kit push --config=src/drizzle.config.ts" 2>&1 || {
            echo "❌ Migration failed using drizzle-kit push"
            echo ""
            echo "Alternative: Run migrations manually:"
            echo "  1. SSH into the server: ssh -i $KEY_PATH $USERNAME@$HOST"
            echo "  2. cd ~/${PROJECT_NAME}"
            echo "  3. docker exec -it \${DB_CONTAINER_NAME} psql -U \${POSTGRES_USER} -d \${POSTGRES_DB}"
            echo "  4. Run the SQL from apps/api/drizzle/*.sql"
            exit 1
        }
    
    echo ""
    echo "✅ Migrations applied successfully!"
fi

echo ""
echo "📊 Database status:"
docker exec \${DB_CONTAINER_NAME:-10xcoder_prod_db} psql -U \${POSTGRES_USER} -d \${POSTGRES_DB} -c "\\dt" 2>/dev/null || echo "Could not list tables"
ENDSSH

echo ""
echo "✅ Migration script completed!"
