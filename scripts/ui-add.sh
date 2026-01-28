#!/bin/bash

# Usage: ./scripts/ui-add.sh <component-name>
# Example: ./scripts/ui-add.sh button dialog sheet

if [ -z "$1" ]; then
    echo "Usage: ./scripts/ui-add.sh <component-name> [component-name ...]"
    echo "Example: ./scripts/ui-add.sh button dialog sheet"
    exit 1
fi

cd packages/ui

# Add each component
for component in "$@"; do
    echo "Adding shadcn/ui component: $component"
    # Run interactively - let stdin pass through naturally for prompts
    bunx --bun shadcn@latest add "$component"
done

echo "✅ Components added successfully!"
