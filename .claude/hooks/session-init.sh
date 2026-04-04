#!/bin/bash
# Session Init Hook — Check environment and show progress
echo "=== FIREPath Session Init ==="

# Check if we're in the right directory
if [ ! -f "CLAUDE.md" ]; then
  echo "WARNING: Not in FIREPath project root"
  exit 1
fi

# Show current progress
if [ -f "docs/PROGRESS.md" ]; then
  head -10 docs/PROGRESS.md
fi

# Check env file
if [ ! -f ".env.local" ]; then
  echo "NOTE: .env.local not found — create from .env.example"
fi

echo "=== Session Ready ==="
