#!/bin/bash
# Stop Test Environment
# Run this locally to stop the test environment on EC2 (preserves volumes)

set -e

echo "🛑 Stopping Test Environment"
echo "============================="

# Configuration - update these or use environment variables
HOST="${HOST:-your-ec2-host}"
USERNAME="${USERNAME:-ubuntu}"
KEY_PATH="${KEY_PATH:-~/.ssh/id_rsa}"
PROJECT_NAME="${PROJECT_NAME:-10xcoder-test}"

if [ "$HOST" == "your-ec2-host" ]; then
    echo "Error: Please set HOST environment variable or update this script"
    echo "Usage: HOST=your-ec2-ip ./scripts/stop-test.sh"
    exit 1
fi

echo "Connecting to $HOST..."
echo "Project: $PROJECT_NAME"

# Use heredoc without quotes to allow variable expansion
ssh -i "$KEY_PATH" "$USERNAME@$HOST" << ENDSSH
cd ~/${PROJECT_NAME} 2>/dev/null || { 
  echo "⚠️  Project directory ~/${PROJECT_NAME} not found"
  echo "Attempting to stop containers by name..."
  docker stop ${PROJECT_NAME//-/_}_app ${PROJECT_NAME//-/_}_db ${PROJECT_NAME//-/_}_redis ${PROJECT_NAME//-/_}_nginx 2>/dev/null || true
  docker rm ${PROJECT_NAME//-/_}_app ${PROJECT_NAME//-/_}_db ${PROJECT_NAME//-/_}_redis ${PROJECT_NAME//-/_}_nginx 2>/dev/null || true
  echo "✅ Container cleanup attempted"
  exit 0
}

# Export environment variables
export APP_CONTAINER_NAME=${PROJECT_NAME//-/_}_app
export DB_CONTAINER_NAME=${PROJECT_NAME//-/_}_db
export REDIS_CONTAINER_NAME=${PROJECT_NAME//-/_}_redis
export NGINX_CONTAINER_NAME=${PROJECT_NAME//-/_}_nginx
export DB_VOLUME_NAME=postgres_test_data
export REDIS_VOLUME_NAME=redis_test_data
export NGINX_PORT=8080
export COMPOSE_PROJECT_NAME=${PROJECT_NAME}

# Stop containers (keep volumes)
docker compose stop

echo ""
echo "✅ Test environment stopped!"
echo "Volumes are preserved. Run start-test.sh to restart."
ENDSSH

echo ""
echo "Test environment containers stopped. Volumes preserved."
