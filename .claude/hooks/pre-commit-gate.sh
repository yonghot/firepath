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

echo "=== Gate Passed ==="
