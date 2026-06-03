#!/bin/bash
# Setup Cloudflare Dynamic DNS
# Run this script once on the server to configure DDNS

set -e

echo "🔧 Cloudflare Dynamic DNS Setup"
echo "================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (sudo)"
    exit 1
fi

# Prompt for configuration
read -sp "Enter Cloudflare API Token: " CF_API_TOKEN
echo
read -p "Enter Cloudflare Zone ID: " CF_ZONE_ID
read -p "Enter DNS Record Name (e.g., api.example.com): " CF_RECORD_NAME

# Validate inputs
if [ -z "$CF_API_TOKEN" ] || [ -z "$CF_ZONE_ID" ] || [ -z "$CF_RECORD_NAME" ]; then
    echo "Error: All fields are required"
    exit 1
fi
# Create configuration file
CONFIG_FILE="/etc/cloudflare-ddns.conf"
cat > "$CONFIG_FILE" << EOF
# Cloudflare DDNS Configuration
CF_API_TOKEN="$CF_API_TOKEN"
CF_ZONE_ID="$CF_ZONE_ID"
CF_RECORD_NAME="$CF_RECORD_NAME"
EOF

chmod 600 "$CONFIG_FILE"
echo "✅ Configuration saved to $CONFIG_FILE"

# Copy DDNS script to /usr/local/bin
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ ! -f "$SCRIPT_DIR/cloudflare-ddns.sh" ]; then
    echo "Error: cloudflare-ddns.sh not found in $SCRIPT_DIR"
    exit 1
fi
cp "$SCRIPT_DIR/cloudflare-ddns.sh" /usr/local/bin/cloudflare-ddns
chmod +x /usr/local/bin/cloudflare-ddns
echo "✅ DDNS script installed to /usr/local/bin/cloudflare-ddns"

# Setup cron jobs
CRON_JOB="*/5 * * * * /usr/local/bin/cloudflare-ddns >> /var/log/cloudflare-ddns.log 2>&1"
REBOOT_JOB="@reboot sleep 30 && /usr/local/bin/cloudflare-ddns >> /var/log/cloudflare-ddns.log 2>&1"

# Add to crontab - remove any existing cloudflare-ddns entries first (exact match on script path)
# Using grep -v -F to match the exact script path, not just partial strings
(crontab -l 2>/dev/null | grep -v -F "/usr/local/bin/cloudflare-ddns"; echo "$CRON_JOB"; echo "$REBOOT_JOB") | crontab -
echo "✅ Cron job configured (runs every 5 minutes + on reboot)"
echo ""
echo "🚀 Running initial DNS update..."
/usr/local/bin/cloudflare-ddns

echo ""
echo "✅ Cloudflare DDNS setup complete!"
echo ""
echo "Commands:"
echo "  - Manual update: sudo /usr/local/bin/cloudflare-ddns"
echo "  - View logs: tail -f /var/log/cloudflare-ddns.log"
echo "  - Edit config: sudo nano /etc/cloudflare-ddns.conf"
