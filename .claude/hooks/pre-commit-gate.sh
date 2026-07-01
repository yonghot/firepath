#!/bin/bash
# Pre-commit Gate — Lint + Type Check before commit
echo "=== Pre-commit Gate ==="

# TypeScript check
if command -v npx &> /dev/null && [ -f "tsconfig.json" ]; then
  echo "Running TypeScript check..."
  npx tsc --noEmit 2>&1
  if [ $? -ne 0 ]; then
    echo "FAIL: TypeScript errors found. Fix before committing."
    exit 1
  fi
  echo "PASS: TypeScript"
fi

# ESLint check
if [ -f ".eslintrc.json" ] || [ -f "eslint.config.mjs" ]; then
  echo "Running ESLint..."
  npx eslint src/ --quiet 2>&1
  if [ $? -ne 0 ]; then
    echo "FAIL: ESLint errors found."
    exit 1
  fi
  echo "PASS: ESLint"
fi

# Impeccable design anti-slop scan (non-blocking warning).
# NOTE: impeccable v2.3.2 has no --fast or --baseline flag (only --json/--gpt/--gemini).
# Pre-existing findings are snapshotted in baseline.json; this stage reports, does not block.
if command -v npx &> /dev/null && [ -f ".impeccable.md" ]; then
  echo "Running Impeccable design scan (src/)..."
  npx impeccable detect src/ 2>&1 || echo "WARN: Impeccable found design issues — review against baseline.json before committing."
fi

echo "=== Gate Passed ==="
