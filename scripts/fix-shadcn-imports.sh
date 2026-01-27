#!/bin/bash

# Script to fix import paths in shadcn components after they're added
# This ensures components use correct import paths for packages/ui

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPONENTS_DIR="$PROJECT_ROOT/packages/ui/src/components"

if [ ! -d "$COMPONENTS_DIR" ]; then
  echo "❌ Components directory not found: $COMPONENTS_DIR"
  exit 1
fi

echo "🔧 Fixing import paths in shadcn components..."

# Find all component files
find "$COMPONENTS_DIR" -name "*.tsx" -type f | while read -r file; do
  # Skip if file doesn't exist or is empty
  [ ! -f "$file" ] && continue
  
  # Fix utils imports: change any incorrect paths to @/lib/utils
  # This handles cases where shadcn might generate wrong paths
  sed -i '' \
    -e "s|from ['\"]src/lib/utils['\"]|from '@/lib/utils'|g" \
    -e "s|from ['\"]\.\.\/lib\/utils['\"]|from '@/lib/utils'|g" \
    -e "s|from ['\"]\.\.\/\.\.\/lib\/utils['\"]|from '@/lib/utils'|g" \
    -e "s|from ['\"]\.\.\/\.\.\/\.\.\/lib\/utils['\"]|from '@/lib/utils'|g" \
    "$file" 2>/dev/null || true
  
  # Fix component imports within the same directory to use relative imports
  # This prevents path resolution issues when components reference each other
  component_name=$(basename "$file" .tsx)
  component_dir=$(dirname "$file")
  
  # Only fix @/components imports if they're importing from the same directory
  # For cross-directory imports, @/components is fine since packages/ui tsconfig handles it
  if [ "$component_dir" = "$COMPONENTS_DIR" ]; then
    # Replace @/components/X with ./X for same-directory imports
    sed -i '' \
      -e "s|from ['\"]@/components/\([^/'\"]*\)['\"]|from './\1'|g" \
      "$file" 2>/dev/null || true
  fi
done

echo "✅ Import paths fixed!"
