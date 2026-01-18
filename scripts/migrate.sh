#!/bin/bash
# =============================================================================
# Database Migration Script
# =============================================================================
# This script runs Drizzle ORM migrations against the database.
# Uses `drizzle-kit migrate` to apply versioned SQL migration files.
#
# Usage:
#   ./scripts/migrate.sh                    # Run migrations
#   ./scripts/migrate.sh --status           # Check migration status
#   ./scripts/migrate.sh --generate         # Generate new migration
#   ./scripts/migrate.sh --dry-run          # Preview pending migrations
#
# Environment Variables:
#   DATABASE_URL    - Full PostgreSQL connection URL (preferred)
#   OR individual variables:
#   POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
API_DIR="$PROJECT_ROOT/apps/api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# URL-encode a string (handles special characters in passwords)
url_encode() {
    local string="$1"
    local strlen=${#string}
    local encoded=""
    local pos c o
    
    for (( pos=0 ; pos<strlen ; pos++ )); do
        c=${string:$pos:1}
        case "$c" in
            [-_.~a-zA-Z0-9] ) o="$c" ;;
            * ) printf -v o '%%%02X' "'$c" ;;
        esac
        encoded+="$o"
    done
    echo "$encoded"
}

# Build DATABASE_URL if not provided
build_database_url() {
    if [ -n "$DATABASE_URL" ]; then
        return
    fi

    if [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_PASSWORD" ] || [ -z "$POSTGRES_DB" ]; then
        log_error "Database credentials not found!"
        echo ""
        echo "Please provide either:"
        echo "  - DATABASE_URL environment variable"
        echo "  - Or all of: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_HOST"
        exit 1
    fi

    POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
    POSTGRES_PORT="${POSTGRES_PORT:-5432}"
    
    # URL-encode credentials to handle special characters
    local encoded_user
    local encoded_pass
    encoded_user=$(url_encode "$POSTGRES_USER")
    encoded_pass=$(url_encode "$POSTGRES_PASSWORD")
    
    export DATABASE_URL="postgresql://${encoded_user}:${encoded_pass}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
}

# Load .env file if exists
load_env() {
    local env_file="$API_DIR/.env"
    if [ -f "$env_file" ]; then
        log_info "Loading environment from $env_file"
        set -a
        # shellcheck disable=SC1090
        source "$env_file"
        set +a
    fi
}

# Check database connection
check_connection() {
    log_info "Checking database connection..."
    
    # Extract connection details from DATABASE_URL
    if command -v psql &> /dev/null; then
        if psql "$DATABASE_URL" -c "SELECT 1" &> /dev/null; then
            log_success "Database connection successful"
            return 0
        else
            log_error "Cannot connect to database"
            return 1
        fi
    else
        log_warning "psql not available, skipping connection check"
        return 0
    fi
}

# Ensure dependencies are installed from lockfile
ensure_dependencies() {
    cd "$API_DIR"
    
    if ! command -v bun &> /dev/null; then
        log_error "bun not found. Please install Bun: https://bun.sh"
        exit 1
    fi
    
    # Verify required packages are declared in package.json
    local missing_deps=()
    
    if ! grep -q '"drizzle-kit"' package.json; then
        missing_deps+=("drizzle-kit")
    fi
    if ! grep -q '"drizzle-orm"' package.json; then
        missing_deps+=("drizzle-orm")
    fi
    if ! grep -q '"postgres"' package.json; then
        missing_deps+=("postgres")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing required packages in package.json: ${missing_deps[*]}"
        log_info "Please add them to your package.json dependencies or devDependencies"
        exit 1
    fi
    
    # Check if node_modules exists and is valid, if not run bun install
    if [ ! -d "node_modules" ] || [ ! -d "node_modules/drizzle-kit" ]; then
        log_info "Installing dependencies from lockfile..."
        bun install --frozen-lockfile || {
            log_warning "Frozen lockfile install failed, running regular install..."
            bun install
        }
    fi
}

# Run migrations using drizzle-kit migrate
run_migrations() {
    log_info "Running database migrations..."
    
    cd "$API_DIR"
    ensure_dependencies
    
    # Check if there are migration files
    if [ ! -d "drizzle" ] || [ -z "$(ls -A drizzle/*.sql 2>/dev/null)" ]; then
        log_warning "No migration files found in apps/api/drizzle/"
        log_info "Generate migrations first with: ./scripts/migrate.sh --generate"
        exit 1
    fi
    
    # Run migrations using drizzle-kit migrate
    bunx drizzle-kit migrate --config=src/drizzle.config.ts
    log_success "Migrations applied successfully!"
}

# Show migration status
show_status() {
    log_info "Checking migration status..."
    
    cd "$API_DIR"
    ensure_dependencies
    
    # List pending migrations by checking migration files
    log_info "Migration files in apps/api/drizzle/:"
    echo ""
    
    if [ -d "drizzle" ] && [ -n "$(ls -A drizzle/*.sql 2>/dev/null)" ]; then
        ls -la "$API_DIR/drizzle/"*.sql 2>/dev/null | while read line; do
            echo "  $line"
        done
    else
        echo "  No migration files found"
    fi
    
    echo ""
    
    # Check drizzle-kit status if available
    bunx drizzle-kit check --config=src/drizzle.config.ts 2>/dev/null || {
        log_warning "Could not run drizzle-kit check (may not be supported in this version)"
    }
}

# Generate new migration
generate_migration() {
    log_info "Generating new migration from schema changes..."
    
    cd "$API_DIR"
    ensure_dependencies
    
    bunx drizzle-kit generate --config=src/drizzle.config.ts
    log_success "Migration generated! Check apps/api/drizzle/ directory"
}

# Dry run - preview pending migrations without applying
dry_run() {
    log_info "Previewing pending migrations (dry run - no changes will be made)..."
    
    cd "$API_DIR"
    ensure_dependencies
    
    echo ""
    
    # List migration files that would be applied
    if [ -d "drizzle" ] && [ -n "$(ls -A drizzle/*.sql 2>/dev/null)" ]; then
        log_info "The following migration files will be applied:"
        echo ""
        
        for sql_file in drizzle/*.sql; do
            if [ -f "$sql_file" ]; then
                filename=$(basename "$sql_file")
                echo "  📄 $filename"
            fi
        done
        
        echo ""
        log_info "To preview the SQL content of each migration:"
        echo ""
        
        for sql_file in drizzle/*.sql; do
            if [ -f "$sql_file" ]; then
                filename=$(basename "$sql_file")
                echo "  ─────────────────────────────────────────────"
                echo "  📄 $filename"
                echo "  ─────────────────────────────────────────────"
                # Show first 30 lines of each migration
                head -30 "$sql_file" | sed 's/^/  /'
                lines=$(wc -l < "$sql_file")
                if [ "$lines" -gt 30 ]; then
                    echo "  ... ($(($lines - 30)) more lines)"
                fi
                echo ""
            fi
        done
        
        echo ""
        log_info "To apply these migrations, run: ./scripts/migrate.sh"
    else
        log_warning "No migration files found in apps/api/drizzle/"
        log_info "Generate migrations first with: ./scripts/migrate.sh --generate"
    fi
}

# Main
main() {
    echo ""
    echo "==========================================="
    echo "  🗄️  Database Migration Tool"
    echo "==========================================="
    echo ""

    # Load environment
    load_env
    build_database_url

    # Parse arguments
    case "${1:-}" in
        --status)
            check_connection
            show_status
            ;;
        --generate)
            generate_migration
            ;;
        --dry-run)
            dry_run
            ;;
        --help|-h)
            echo "Usage: $0 [OPTION]"
            echo ""
            echo "Options:"
            echo "  (none)       Run pending migrations (drizzle-kit migrate)"
            echo "  --status     Check migration status and list migration files"
            echo "  --generate   Generate new migration from schema changes"
            echo "  --dry-run    Preview pending migrations without applying"
            echo "  --help       Show this help message"
            echo ""
            echo "Migration Strategy:"
            echo "  1. Make changes to schema files in apps/api/src/db/schema/"
            echo "  2. Run './scripts/migrate.sh --generate' to create migration file"
            echo "  3. Review the generated SQL in apps/api/drizzle/"
            echo "  4. Run './scripts/migrate.sh --dry-run' to preview"
            echo "  5. Run './scripts/migrate.sh' to apply migrations"
            echo ""
            ;;
        *)
            check_connection
            run_migrations
            ;;
    esac
}

main "$@"
