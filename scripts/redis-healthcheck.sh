#!/bin/sh
# Redis healthcheck script
# Reads REDIS_PASSWORD from environment to avoid exposing it in container config

# Check if REDIS_PASSWORD is set
if [ -z "$REDIS_PASSWORD" ]; then
    # Try to read from file if environment variable not set
    if [ -f "/run/secrets/redis_password" ]; then
        REDIS_PASSWORD=$(cat /run/secrets/redis_password | tr -d '\n\r')
    else
        echo "Error: REDIS_PASSWORD not set and no secrets file found"
        exit 1
    fi
fi

# Use REDISCLI_AUTH environment variable (redis-cli reads this automatically)
# This is the recommended way to pass password without command line exposure
export REDISCLI_AUTH="$REDIS_PASSWORD"

# Run the ping command
if redis-cli ping | grep -q "PONG"; then
    exit 0
else
    exit 1
fi
