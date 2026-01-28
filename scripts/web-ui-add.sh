#!/bin/bash

# Wrapper script to add shadcn components from web directory
# This ensures components are added to packages/ui with correct paths
# 
# Usage: ./scripts/web-ui-add.sh <component-name> [component-name ...]
# Or from apps/web: bun run ui:add <component-name>

if [ -z "$1" ]; then
  echo "Usage: ./scripts/web-ui-add.sh <component-name> [component-name ...]"
  echo "Example: ./scripts/web-ui-add.sh button dialog sheet"
  echo ""
  echo "This script adds shadcn components to packages/ui."
  echo "It uses packages/ui/components.json to ensure correct paths."
  exit 1
fi

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
UI_DIR="$PROJECT_ROOT/packages/ui"

# Change to UI directory where components should be added
cd "$UI_DIR" || exit 1

echo "📦 Adding shadcn components to packages/ui..."
echo "   Using packages/ui/components.json configuration"
echo ""

# Add each component using the UI package's components.json
for component in "$@"; do
  echo "➕ Adding component: $component"
  
  # Run shadcn interactively - let stdin pass through naturally
  # When run from an interactive terminal, prompts will work correctly
  # The --yes flag was removed to allow proper interactive prompts
  bunx --bun shadcn@latest add "$component"
  
  exit_code=$?
  if [ $exit_code -eq 0 ]; then
    echo "   ✅ $component added successfully"
  else
    echo "   ❌ Failed to add $component (exit code: $exit_code)"
    # Don't exit on error, continue with next component
  fi
done

# Run the fix script to correct any import paths
echo ""
echo "🔧 Fixing import paths..."
cd "$PROJECT_ROOT" || exit 1
bash "$SCRIPT_DIR/fix-shadcn-imports.sh"

echo ""
echo "✅ Done! Components added to packages/ui/src/components"
echo ""
echo "💡 Components use @/lib/utils and @/components/* which resolve"
echo "   correctly via packages/ui/tsconfig.json"
