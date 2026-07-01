#!/bin/bash
# Verify and Continue — Check build health after changes
echo "=== Verify Build Health ==="

if [ -f "package.json" ] && command -v npx &> /dev/null; then
  # Quick TypeScript check
  # Use PIPESTATUS so the exit code reflects tsc, not tail (the pipe's last cmd).
  npx tsc --noEmit 2>&1 | tail -5
  if [ "${PIPESTATUS[0]}" -eq 0 ]; then
    echo "PASS: Build health OK"
  else
    echo "WARN: Build issues detected — review before continuing"
  fi
fi
