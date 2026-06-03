#!/bin/bash
# Cloudflare Dynamic DNS Update Script
# Updates DNS A record when public IP changes
#
# Required environment variables (set in /etc/cloudflare-ddns.conf):
# - CF_API_TOKEN: Cloudflare API token with Zone:DNS:Edit permissions
# - CF_ZONE_ID: Zone ID from Cloudflare dashboard
# - CF_RECORD_NAME: DNS record to update (e.g., api.example.com)
#
# Optional environment variables:
# - CF_TTL: DNS record TTL in seconds (default: 300)
# - CF_PROXIED: Whether to proxy through Cloudflare (default: false)
# - CF_MAX_RETRIES: Maximum retry attempts for transient failures (default: 3)
# - CF_RETRY_DELAY: Initial delay between retries in seconds (default: 5)

# Temporary files to clean up
TEMP_FILES=()

# Cleanup function called on exit
cleanup() {
    for temp_file in "${TEMP_FILES[@]}"; do
        rm -f "$temp_file" 2>/dev/null
    done
}

# Register cleanup trap
trap cleanup EXIT

# Load configuration
CONFIG_FILE="/etc/cloudflare-ddns.conf"
if [ -f "$CONFIG_FILE" ]; then
    # shellcheck source=/dev/null
    source "$CONFIG_FILE"
else
    echo "Error: Configuration file not found at $CONFIG_FILE"
    echo "Please create it with CF_API_TOKEN, CF_ZONE_ID, and CF_RECORD_NAME"
    exit 1
fi

# Validate required variables
if [ -z "$CF_API_TOKEN" ] || [ -z "$CF_ZONE_ID" ] || [ -z "$CF_RECORD_NAME" ]; then
    echo "Error: Missing required configuration variables"
    exit 1
fi

# Set defaults for optional variables
CF_TTL="${CF_TTL:-300}"
CF_PROXIED="${CF_PROXIED:-false}"
CF_MAX_RETRIES="${CF_MAX_RETRIES:-3}"
CF_RETRY_DELAY="${CF_RETRY_DELAY:-5}"

# Check required dependencies
for cmd in curl jq grep mktemp; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        echo "Error: Required command '$cmd' not found. Please install it."
        exit 1
    fi
done

LOG_FILE="/var/log/cloudflare-ddns.log"

# Ensure log file is writable
if ! touch "$LOG_FILE" 2>/dev/null; then
    LOG_FILE="/tmp/cloudflare-ddns.log"
fi

IP_CACHE_FILE="/tmp/cloudflare-ddns-ip.cache"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_error() {
    log "ERROR: $1"
}

log_warn() {
    log "WARN: $1"
}

log_debug() {
    if [ "${CF_DEBUG:-false}" = "true" ]; then
        log "DEBUG: $1"
    fi
}

# Validate IPv4 address format
# Rejects leading zeros (e.g., 192.168.01.1) to avoid octal interpretation
is_valid_ip() {
    local ip=$1
    
    # Check basic format: each octet must be 0, or 1-9 followed by optional digits (no leading zeros)
    # Pattern breakdown: (0|[1-9][0-9]{0,2}) matches "0" or "1-255" without leading zeros
    if ! echo "$ip" | grep -qE '^(0|[1-9][0-9]{0,2})\.(0|[1-9][0-9]{0,2})\.(0|[1-9][0-9]{0,2})\.(0|[1-9][0-9]{0,2})$'; then
        return 1
    fi
    
    # Validate each octet is 0-255 using base 10 arithmetic
    local IFS='.'
    local -a octets=($ip)
    local octet_val
    for octet in "${octets[@]}"; do
        # Use 10# prefix to force base 10 interpretation
        octet_val=$((10#$octet))
        if [ "$octet_val" -lt 0 ] || [ "$octet_val" -gt 255 ]; then
            return 1
        fi
    done
    
    return 0
}

# Retry wrapper with exponential backoff
# Args: $1 = max_retries, $2 = initial_delay, $3... = command to run
retry_with_backoff() {
    local max_retries=$1
    local delay=$2
    shift 2
    local attempt=1
    local result
    
    while [ $attempt -le "$max_retries" ]; do
        if "$@"; then
            return 0
        fi
        result=$?
        
        if [ $attempt -lt "$max_retries" ]; then
            log_warn "Attempt $attempt/$max_retries failed, retrying in ${delay}s..."
            sleep "$delay"
            delay=$((delay * 2))  # Exponential backoff
        fi
        attempt=$((attempt + 1))
    done
    
    log_error "All $max_retries attempts failed"
    return $result
}

# Get current public IP with retry
get_current_ip() {
    local ip
    local curl_exit
    
    # Try multiple IP services with fallback
    for service in "https://api.ipify.org" "https://ifconfig.me" "https://icanhazip.com"; do
        ip=$(curl -s --max-time 10 --connect-timeout 5 "$service" 2>/dev/null)
        curl_exit=$?
        
        if [ $curl_exit -eq 0 ] && is_valid_ip "$ip"; then
            echo "$ip"
            return 0
        fi
        
        log_debug "Failed to get IP from $service (curl exit: $curl_exit, ip: '$ip')"
    done
    
    log_error "Could not determine public IP from any service"
    return 1
}

# Make a Cloudflare API request with proper error handling
# Args: $1 = method, $2 = endpoint, $3 = data (optional for POST/PUT)
# Returns: 0 on success, 1 on failure
# Outputs: JSON response on success
cf_api_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local temp_file
    local http_code
    local response
    local curl_exit
    
    temp_file=$(mktemp)
    TEMP_FILES+=("$temp_file")
    
    local curl_args=(
        -s
        -w "%{http_code}"
        -o "$temp_file"
        --max-time 30
        --connect-timeout 10
        -X "$method"
        -H "Authorization: Bearer $CF_API_TOKEN"
        -H "Content-Type: application/json"
    )
    
    if [ -n "$data" ]; then
        curl_args+=(--data "$data")
    fi
    
    http_code=$(curl "${curl_args[@]}" "https://api.cloudflare.com/client/v4/$endpoint" 2>/dev/null)
    curl_exit=$?
    
    # Check if curl command itself failed
    if [ $curl_exit -ne 0 ]; then
        log_error "curl failed with exit code $curl_exit (network error or timeout)"
        rm -f "$temp_file"
        return 1
    fi
    
    response=$(cat "$temp_file" 2>/dev/null)
    rm -f "$temp_file"
    
    # Check for empty response
    if [ -z "$response" ]; then
        log_error "Empty response from Cloudflare API (HTTP: $http_code)"
        return 1
    fi
    
    # Check HTTP status code (2xx is success)
    if [ "$http_code" -lt 200 ] || [ "$http_code" -ge 300 ]; then
        log_error "Cloudflare API returned HTTP $http_code"
        log_debug "Response: $response"
        return 1
    fi
    
    # Parse and validate JSON response
    local success
    success=$(echo "$response" | jq -r '.success' 2>/dev/null)
    local jq_exit=$?
    
    if [ $jq_exit -ne 0 ]; then
        log_error "Failed to parse Cloudflare API response as JSON"
        log_debug "Raw response: $response"
        return 1
    fi
    
    if [ "$success" != "true" ]; then
        local errors
        errors=$(echo "$response" | jq -r '.errors[]?.message // "Unknown error"' 2>/dev/null)
        log_error "Cloudflare API error: $errors"
        return 1
    fi
    
    echo "$response"
    return 0
}

# Get DNS record ID
# Returns: 0 on success with record ID on stdout, 1 on failure
get_record_id() {
    local response
    local record_id
    
    response=$(cf_api_request "GET" "zones/$CF_ZONE_ID/dns_records?type=A&name=$CF_RECORD_NAME")
    if [ $? -ne 0 ]; then
        return 1
    fi
    
    record_id=$(echo "$response" | jq -r '.result[0].id' 2>/dev/null)
    if [ $? -ne 0 ] || [ -z "$record_id" ] || [ "$record_id" = "null" ]; then
        log_error "Could not extract record ID from API response"
        return 1
    fi
    
    echo "$record_id"
    return 0
}

# Get current DNS IP
# Returns: 0 on success with IP on stdout, 1 on failure
get_dns_ip() {
    local response
    local dns_ip
    
    response=$(cf_api_request "GET" "zones/$CF_ZONE_ID/dns_records?type=A&name=$CF_RECORD_NAME")
    if [ $? -ne 0 ]; then
        return 1
    fi
    
    dns_ip=$(echo "$response" | jq -r '.result[0].content' 2>/dev/null)
    if [ $? -ne 0 ]; then
        log_error "Could not parse DNS IP from API response"
        return 1
    fi
    
    # dns_ip could be null if record doesn't exist yet
    if [ "$dns_ip" = "null" ]; then
        log_warn "No existing DNS record found for $CF_RECORD_NAME"
        echo ""
        return 0
    fi
    
    echo "$dns_ip"
    return 0
}

# Update DNS record
# Args: $1 = IP address, $2 = record ID
# Returns: 0 on success, 1 on failure
update_dns() {
    local ip=$1
    local record_id=$2
    
    # Validate parameters
    if [ -z "$ip" ]; then
        log_error "update_dns called with empty IP address"
        return 1
    fi
    
    if ! is_valid_ip "$ip"; then
        log_error "update_dns called with invalid IP address: $ip"
        return 1
    fi
    
    if [ -z "$record_id" ]; then
        log_error "update_dns called with empty record_id"
        return 1
    fi
    
    # Validate CF_TTL is a positive integer
    if ! echo "$CF_TTL" | grep -qE '^[0-9]+$' || [ "$CF_TTL" -lt 1 ]; then
        log_warn "Invalid CF_TTL '$CF_TTL', using default 300"
        CF_TTL=300
    fi
    
    # Validate CF_PROXIED is boolean
    if [ "$CF_PROXIED" != "true" ] && [ "$CF_PROXIED" != "false" ]; then
        log_warn "Invalid CF_PROXIED '$CF_PROXIED', using default false"
        CF_PROXIED="false"
    fi
    
    local payload
    payload="{\"type\":\"A\",\"name\":\"$CF_RECORD_NAME\",\"content\":\"$ip\",\"ttl\":$CF_TTL,\"proxied\":$CF_PROXIED}"
    
    cf_api_request "PUT" "zones/$CF_ZONE_ID/dns_records/$record_id" "$payload"
    return $?
}

# ============================================================================
# Main logic
# ============================================================================

main() {
    local current_ip
    local cached_ip
    local dns_ip
    local record_id
    
    # Get current public IP with retries
    current_ip=$(retry_with_backoff "$CF_MAX_RETRIES" "$CF_RETRY_DELAY" get_current_ip)
    if [ $? -ne 0 ] || [ -z "$current_ip" ]; then
        log_error "Failed to determine current IP address after $CF_MAX_RETRIES attempts"
        exit 1
    fi
    
    log_debug "Current public IP: $current_ip"
    
    # Check cached IP first (faster than API call)
    cached_ip=""
    if [ -f "$IP_CACHE_FILE" ]; then
        cached_ip=$(cat "$IP_CACHE_FILE" 2>/dev/null)
        if [ $? -ne 0 ]; then
            log_warn "Could not read IP cache file"
            cached_ip=""
        fi
    fi
    
    if [ "$current_ip" = "$cached_ip" ]; then
        log_debug "IP unchanged from cache, nothing to do"
        exit 0
    fi
    
    # IP might have changed, verify with Cloudflare
    dns_ip=$(retry_with_backoff "$CF_MAX_RETRIES" "$CF_RETRY_DELAY" get_dns_ip)
    if [ $? -ne 0 ]; then
        log_error "Failed to get current DNS IP from Cloudflare after $CF_MAX_RETRIES attempts"
        exit 1
    fi
    
    log_debug "Current DNS IP: ${dns_ip:-<none>}"
    
    if [ "$current_ip" = "$dns_ip" ]; then
        # IP matches DNS, update cache and exit
        if ! echo "$current_ip" > "$IP_CACHE_FILE"; then
            log_warn "Could not update IP cache file"
        fi
        log_debug "IP matches DNS record, cache updated"
        exit 0
    fi
    
    # IP has changed, update DNS
    log "IP changed: ${dns_ip:-<none>} -> $current_ip"
    
    # Get record ID with retries
    record_id=$(retry_with_backoff "$CF_MAX_RETRIES" "$CF_RETRY_DELAY" get_record_id)
    if [ $? -ne 0 ] || [ -z "$record_id" ]; then
        log_error "Failed to find DNS record for $CF_RECORD_NAME after $CF_MAX_RETRIES attempts"
        exit 1
    fi
    
    log_debug "DNS Record ID: $record_id"
    
    # Update DNS with retries
    if retry_with_backoff "$CF_MAX_RETRIES" "$CF_RETRY_DELAY" update_dns "$current_ip" "$record_id"; then
        log "Successfully updated DNS record to $current_ip"
        if ! echo "$current_ip" > "$IP_CACHE_FILE"; then
            log_warn "Could not update IP cache file"
        fi
        exit 0
    else
        log_error "Failed to update DNS record after $CF_MAX_RETRIES attempts"
        exit 1
    fi
}

# Run main function
main
