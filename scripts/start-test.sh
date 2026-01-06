#!/bin/bash
# Start Test Environment
# Run this locally to start the test environment on EC2

set -e

echo "🚀 Starting Test Environment"
echo "============================"

# Configuration - update these or use environment variables
HOST="${HOST:-your-ec2-host}"
USERNAME="${USERNAME:-ubuntu}"
KEY_PATH="${KEY_PATH:-~/.ssh/id_rsa}"
PROJECT_NAME="${PROJECT_NAME:-10xcoder-test}"

if [ "$HOST" == "your-ec2-host" ]; then
    echo "Error: Please set HOST environment variable or update this script"
    echo "Usage: HOST=your-ec2-ip ./scripts/start-test.sh"
    exit 1
fi

echo "Connecting to $HOST..."

ssh -i "$KEY_PATH" "$USERNAME@$HOST" << 'ENDSSH'
cd ~/10xcoder-test 2>/dev/null || { echo "Test environment not deployed yet"; exit 1; }

# Export environment variables
export APP_CONTAINER_NAME=10xcoder_test_app
export DB_CONTAINER_NAME=10xcoder_test_db
export REDIS_CONTAINER_NAME=10xcoder_test_redis
export NGINX_CONTAINER_NAME=10xcoder_test_nginx
export DB_VOLUME_NAME=postgres_test_data
export REDIS_VOLUME_NAME=redis_test_data
export NGINX_PORT=8080
export COMPOSE_PROJECT_NAME=10xcoder-test

# Start containers
docker compose up -d

echo ""
echo "✅ Test environment started!"
docker compose ps
ENDSSH

echo ""
echo "Test environment is now running at http://$HOST:8080"
