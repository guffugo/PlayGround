#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
PORT="${PORT:-3000}"
export PORT
/usr/bin/time -p bash -c 'echo "project dir: $PWD, port: $PORT"'
# Install dependencies when a package manifest exists (no-op for this static project).
/usr/bin/time -p bash -c 'if [ -f package.json ]; then if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi; else echo "no package.json; skipping install"; fi'
# Build when a build script exists (no-op for this prebuilt static project).
/usr/bin/time -p bash -c 'if [ -f package.json ] && node -e "process.exit(require(\"./package.json\").scripts && require(\"./package.json\").scripts.build ? 0 : 1)"; then npm run build; else echo "no build script; using checked-in dist/"; fi'
# Static output must live inside the project directory.
/usr/bin/time -p test -f dist/index.html
# Publish built-output metadata for the controller (worker metadata only).
/usr/bin/time -p bash -c 'd="$PWD/dist"; o="${OPENCODE_WEB_DIR:?}"; mkdir -p "$o"; printf "{\"project\":\"%s\",\"directory\":\"%s\"}\n" "$PWD" "$d" > "$o/deployment-output.json"; cat "$o/deployment-output.json"'
# Serve the built static directory in the foreground.
/usr/bin/time -p node serve-dist.mjs "$PWD/dist"
