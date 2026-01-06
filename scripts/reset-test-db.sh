#!/bin/bash
# Reset Test Database
# Run this locally to completely reset the test database on EC2

set -e

echo "⚠️  Reset Test Database"
echo "======================="
echo "This will DELETE all data in the test database!"
echo ""

read -p "Are you sure? (type 'yes' to confirm): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Cancelled."
    exit 0
fi

# Configuration - update these or use environment variables
HOST="${HOST:-your-ec2-host}"
USERNAME="${USERNAME:-ubuntu}"
KEY_PATH="${KEY_PATH:-~/.ssh/id_rsa}"

# Expand tilde in KEY_PATH
KEY_PATH="${KEY_PATH/#\~/$HOME}"

if [ ! -f "$KEY_PATH" ]; then
    echo "Error: SSH key not found at $KEY_PATH"
    echo "Please set KEY_PATH environment variable to your SSH key location"
    exit 1
fi

if [ "$HOST" == "your-ec2-host" ]; then
    echo "Error: Please set HOST environment variable or update this script"
    echo "Usage: HOST=your-ec2-ip ./scripts/reset-test-db.sh"
    exit 1
fi

echo ""
echo "Connecting to $HOST..."

ssh -i "$KEY_PATH" -o ConnectTimeout=10 -o ServerAliveInterval=5 -o ServerAliveCountMax=3 "$USERNAME@$HOST" << 'ENDSSH'
cd ~/10xcoder-test 2>/dev/null || { echo "Test environment not found"; exit 1; }

# Export environment variables
export APP_CONTAINER_NAME=10xcoder_test_app
export DB_CONTAINER_NAME=10xcoder_test_db
export REDIS_CONTAINER_NAME=10xcoder_test_redis
export NGINX_CONTAINER_NAME=10xcoder_test_nginx
export DB_VOLUME_NAME=postgres_test_data
export REDIS_VOLUME_NAME=redis_test_data
export NGINX_PORT=8080
export COMPOSE_PROJECT_NAME=10xcoder-test

echo "Stopping containers..."
docker compose down

echo "Removing database volume..."
docker volume rm postgres_test_data 2>/dev/null || true

echo "Removing redis volume..."
docker volume rm redis_test_data 2>/dev/null || true

echo "Starting fresh containers..."
docker compose up -d

echo ""
echo "✅ Test database reset complete!"
echo "Fresh containers are starting up..."
sleep 5
docker compose ps
ENDSSH

echo ""
echo "Test database has been reset."
