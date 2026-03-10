#!/usr/bin/env bash
# =============================================================================
# server-ops.sh — Production Server Operations Utility
# =============================================================================
# Usage: ./scripts/server-ops.sh <command> [args]
#
# Commands:
#   status       Show running container statuses
#   logs         Tail logs (optionally for a specific service)
#   restart      Restart all application services
#   prune        Remove orphan containers, dangling images, and build cache
#   migrate      Run database migrations manually
#   reset-db     ⚠️  Wipe Postgres volume and reinitialize
#   reset-redis  ⚠️  Flush all Redis data
# =============================================================================

set -euo pipefail

COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-10xcoder-prod}"
export COMPOSE_PROJECT_NAME

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

confirm() {
  echo -e "${RED}⚠️  WARNING: $1${NC}"
  read -rp "Type 'yes' to confirm: " response
  if [[ "$response" != "yes" ]]; then
    echo "Aborted."
    exit 1
  fi
}

cmd_status() {
  echo -e "${GREEN}📊 Application Stack${NC}"
  docker compose ps
  echo ""
  echo -e "${GREEN}📊 Infrastructure Stack${NC}"
  docker compose -f docker-compose.infra.yml ps
}

cmd_logs() {
  local service="${1:-}"
  if [[ -n "$service" ]]; then
    echo -e "${GREEN}📋 Tailing logs for: ${service}${NC}"
    docker compose logs -f "$service"
  else
    echo -e "${GREEN}📋 Tailing all application logs${NC}"
    docker compose logs -f
  fi
}

cmd_restart() {
  echo -e "${YELLOW}🔄 Restarting application services...${NC}"
  docker compose restart
  echo -e "${GREEN}✅ Services restarted${NC}"
  cmd_status
}

cmd_prune() {
  echo -e "${YELLOW}🗑️  Removing orphan containers (keeping stack running)...${NC}"
  docker compose up -d --remove-orphans 2>/dev/null || true
  docker compose -f docker-compose.infra.yml up -d --remove-orphans 2>/dev/null || true

  echo -e "${YELLOW}🗑️  Removing dangling images...${NC}"
  docker image prune -f

  echo -e "${YELLOW}🗑️  Removing unused build cache...${NC}"
  docker builder prune -f

  echo -e "${YELLOW}🗑️  Removing stopped containers...${NC}"
  docker container prune -f

  echo -e "${GREEN}✅ Cleanup complete${NC}"
  docker system df
}

cmd_migrate() {
  echo -e "${YELLOW}🧪 Running database migrations...${NC}"
  docker compose --profile migrate run --rm --build migrate
  echo -e "${GREEN}✅ Migrations complete${NC}"
}

cmd_reset_db() {
  confirm "This will PERMANENTLY DELETE all database data and reinitialize from scratch."

  echo -e "${YELLOW}🛑 Stopping application and database...${NC}"
  docker compose down

  echo -e "${YELLOW}🗑️  Removing Postgres volume...${NC}"
  docker volume rm "${COMPOSE_PROJECT_NAME}_postgres_data" 2>/dev/null || true

  echo -e "${YELLOW}🚀 Restarting services...${NC}"
  docker compose up -d db redis
  echo "⏳ Waiting for DB to be ready..."
  sleep 10

  echo -e "${YELLOW}🧪 Running migrations...${NC}"
  docker compose --profile migrate run --rm --build migrate

  echo -e "${YELLOW}🚀 Starting server...${NC}"
  docker compose up -d

  echo -e "${GREEN}✅ Database reset complete${NC}"
  cmd_status
}

cmd_reset_redis() {
  confirm "This will FLUSH ALL Redis data (queues, sessions, caches)."

  echo -e "${YELLOW}🗑️  Flushing Redis...${NC}"
  # Safely parse REDIS_PASSWORD from .env without sourcing/evaluating
  if [[ -f .env ]]; then
    parsed_password=$(grep -E '^(export[[:space:]]+)?REDIS_PASSWORD=' .env | tail -n 1 | sed -E 's/^(export[[:space:]]+)?REDIS_PASSWORD=//' | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
    if [[ -n "$parsed_password" ]]; then
      export REDIS_PASSWORD="$parsed_password"
    fi
  fi
  if [[ -z "${REDIS_PASSWORD:-}" ]]; then
    echo -e "${RED}❌ REDIS_PASSWORD is not set. Cannot flush Redis.${NC}"
    exit 1
  fi
  docker compose exec -e REDISCLI_AUTH="${REDIS_PASSWORD}" -T redis redis-cli FLUSHALL

  echo -e "${GREEN}✅ Redis flushed${NC}"
}

# ── Main ─────────────────────────────────────────

case "${1:-}" in
  status)     cmd_status ;;
  logs)       cmd_logs "${2:-}" ;;
  restart)    cmd_restart ;;
  prune)      cmd_prune ;;
  migrate)    cmd_migrate ;;
  reset-db)   cmd_reset_db ;;
  reset-redis) cmd_reset_redis ;;
  *)
    echo "Usage: $0 <command> [args]"
    echo ""
    echo "Commands:"
    echo "  status       Show running container statuses"
    echo "  logs [svc]   Tail logs (optionally for a specific service)"
    echo "  restart      Restart all application services"
    echo "  prune        Remove orphan containers and dangling images"
    echo "  migrate      Run database migrations"
    echo "  reset-db     ⚠️  Wipe and reinitialize database"
    echo "  reset-redis  ⚠️  Flush all Redis data"
    exit 1
    ;;
esac
