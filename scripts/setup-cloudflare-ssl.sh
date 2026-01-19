#!/bin/bash
# Setup Cloudflare Origin SSL Certificate
# Run this script once on the server to configure SSL certificates

set -e

echo "🔐 Cloudflare Origin SSL Certificate Setup"
echo "==========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (sudo)"
    exit 1
fi

# Create SSL directory
SSL_DIR="/etc/ssl/cloudflare"
mkdir -p "$SSL_DIR"
chmod 755 "$SSL_DIR"

echo "📋 Instructions to get your Origin Certificate:"
echo ""
echo "1. Go to Cloudflare Dashboard → Your Domain → SSL/TLS → Origin Server"
echo "2. Click 'Create Certificate'"
echo "3. Keep 'Generate private key and CSR with Cloudflare' selected"
echo "4. Add your hostnames (e.g., *.10xcoder.club, 10xcoder.club)"
echo "5. Choose certificate validity (15 years recommended)"
echo "6. Click 'Create'"
echo "7. Copy the Origin Certificate (PEM format)"
echo "8. Copy the Private Key"
echo ""

# Get certificate
echo "📜 Paste your Origin Certificate (PEM format), then press Ctrl+D:"
CERT_FILE="$SSL_DIR/origin.pem"
cat > "$CERT_FILE"
chmod 644 "$CERT_FILE"
echo ""
echo "✅ Certificate saved to $CERT_FILE"

# Get private key
echo ""
echo "🔑 Paste your Private Key (PEM format), then press Ctrl+D:"
KEY_FILE="$SSL_DIR/origin-key.pem"
cat > "$KEY_FILE"
chmod 600 "$KEY_FILE"
echo ""
echo "✅ Private key saved to $KEY_FILE"

# Verify files exist and have content
if [ ! -s "$CERT_FILE" ]; then
    echo "❌ Error: Certificate file is empty"
    exit 1
fi

if [ ! -s "$KEY_FILE" ]; then
    echo "❌ Error: Private key file is empty"
    exit 1
fi

echo ""
echo "✅ SSL certificates configured successfully!"
echo ""
echo "📁 Certificate location: $CERT_FILE"
echo "📁 Private key location: $KEY_FILE"
echo ""
echo "🔄 Next steps:"
echo "   1. Add port 443 to your AWS Security Group"
echo "   2. Push your code changes to trigger deployment"
echo "   3. Set Cloudflare SSL mode to 'Full (strict)'"
echo "   4. Test: curl -v https://api.10xcoder.club"
echo ""
