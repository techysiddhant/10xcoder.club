#!/bin/bash
# Add a user to Dozzle for log access
# Run this script on the server where Dozzle is running

echo "🔧 Add Dozzle User"
echo "=================="

# Check dependencies
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed"
    exit 1
fi

# Get the dozzle data directory
DOZZLE_DATA_DIR=""
for dir in ~/10xcoder-prod/dozzle_data ~/10xcoder-test/dozzle_data /opt/dozzle_data; do
    if [ -d "$dir" ]; then
        DOZZLE_DATA_DIR="$dir"
        break
    fi
done

if [ -z "$DOZZLE_DATA_DIR" ]; then
    echo "Creating dozzle_data directory..."
    DOZZLE_DATA_DIR=~/10xcoder-prod/dozzle_data
    mkdir -p "$DOZZLE_DATA_DIR"
fi

USERS_FILE="$DOZZLE_DATA_DIR/users.yml"

# Prompt for username and password
read -p "Enter username: " USERNAME
read -sp "Enter password: " PASSWORD
echo ""

if [ -z "$USERNAME" ] || [ -z "$PASSWORD" ]; then
    echo "Error: Username and password are required"
    exit 1
fi

# Generate password hash securely (avoid passing password on command line)
echo "Generating password hash..."
PASSWORD_HASH=""

# Method 1: Use openssl via stdin (primary - avoids command line exposure)
# SHA-512 crypt hash compatible with Dozzle
PASSWORD_HASH=$(echo -n "$PASSWORD" | docker run --rm -i alpine sh -c "apk add -q --no-cache openssl && openssl passwd -6 -stdin" 2>/dev/null)

# Method 2: Last resort - use SHA256 if SHA512 not available
if [ -z "$PASSWORD_HASH" ]; then
    echo "Trying SHA256 fallback..."
    PASSWORD_HASH=$(echo -n "$PASSWORD" | docker run --rm -i alpine sh -c "apk add -q --no-cache openssl && openssl passwd -5 -stdin" 2>/dev/null)
fi

# Validate hash was generated
if [ -z "$PASSWORD_HASH" ]; then
    echo "Error: Failed to generate password hash"
    echo "Please ensure Docker is running and can pull images"
    exit 1
fi

# Validate hash format (should start with $5$ or $6$ for SHA256/SHA512)
if ! echo "$PASSWORD_HASH" | grep -qE '^\$[56]\$'; then
    echo "Error: Generated hash has invalid format: $PASSWORD_HASH"
    echo "Expected hash to start with \$5\$ (SHA-256) or \$6\$ (SHA-512)"
    exit 1
fi

echo "✅ Password hash generated successfully"

# Create or update users.yml
if [ ! -f "$USERS_FILE" ]; then
    echo "users:" > "$USERS_FILE"
    chmod 640 "$USERS_FILE"
fi

# Check if user already exists (username is a YAML key, e.g., "  admin:")
# The pattern looks for the username as an indented key under "users:"
USER_KEY_PATTERN="^  ${USERNAME}:"

if grep -q "$USER_KEY_PATTERN" "$USERS_FILE" 2>/dev/null; then
    echo "User '$USERNAME' already exists. Updating password..."
    
    # Try using yq if available (safer YAML handling)
    if command -v yq &> /dev/null; then
        # Use strenv() for safe injection - avoids shell/YAML interpretation of special chars
        export USERNAME PASSWORD_HASH
        if ! yq -i '.users[strenv("USERNAME")].password = strenv("PASSWORD_HASH")' "$USERS_FILE"; then
            echo "Error: Failed to update password using yq"
            exit 1
        fi
    else
        # Fallback: Use awk to update password within the user block
        TEMP_FILE=$(mktemp)
        
        awk -v user="$USERNAME" -v hash="$PASSWORD_HASH" '
        BEGIN { in_user_block = 0 }
        {
            # Check if we are entering the target user block
            if ($0 ~ "^  " user ":") {
                in_user_block = 1
                print
                next
            }
            # Check if we are leaving the user block (new key at same indent level)
            if (in_user_block && /^  [a-zA-Z0-9_-]+:/ && $0 !~ /^    /) {
                in_user_block = 0
            }
            # Replace password line if in user block
            if (in_user_block && /^    password:/) {
                print "    password: \"" hash "\""
                next
            }
            print
        }
        ' "$USERS_FILE" > "$TEMP_FILE"
        
        if [ $? -ne 0 ]; then
            echo "Error: Failed to update password using awk"
            rm -f "$TEMP_FILE"
            exit 1
        fi
        
        mv "$TEMP_FILE" "$USERS_FILE"
        chmod 640 "$USERS_FILE"
    fi
else
    # Add new user
    cat >> "$USERS_FILE" << EOF
  $USERNAME:
    name: "$USERNAME"
    password: "$PASSWORD_HASH"
EOF
fi

# Verify the users file contains the user
if ! grep -q "$USER_KEY_PATTERN" "$USERS_FILE"; then
    echo "Error: Failed to write user '$USERNAME' to $USERS_FILE"
    exit 1
fi

# Verify the password was written
if ! grep -A2 "$USER_KEY_PATTERN" "$USERS_FILE" | grep -q "password:"; then
    echo "Error: Failed to write password for user '$USERNAME'"
    exit 1
fi

echo "✅ User '$USERNAME' added to $USERS_FILE"

# Restart Dozzle container if running
if docker ps --format '{{.Names}}' | grep -q "dozzle"; then
    echo "Restarting Dozzle container..."
    docker restart dozzle
    echo "✅ Dozzle restarted"
else
    echo "ℹ️  Dozzle is not running. Start it with docker compose up -d"
fi

echo ""
echo "Done! User '$USERNAME' can now access Dozzle."
