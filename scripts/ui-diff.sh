#!/bin/bash

# Check for updates to shadcn/ui components
cd packages/ui
echo "Checking for shadcn/ui component updates..."
bunx --bun shadcn@latest diff
