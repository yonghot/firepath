#!/bin/bash
# Post-write Format — Auto-format written files
# This hook runs after file writes to ensure consistent formatting

FILE="$1"
if [ -z "$FILE" ]; then
  exit 0
fi

# Only format TypeScript/JavaScript files
case "$FILE" in
  *.ts|*.tsx|*.js|*.jsx)
    if command -v npx &> /dev/null && [ -f "node_modules/.bin/prettier" ]; then
      npx prettier --write "$FILE" 2>/dev/null
    fi
    ;;
esac
