#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
# Capture output must live outside the project source; the app keeps running.
/usr/bin/time -p bash -c ': "${CAPTURE_URL:?Set CAPTURE_URL}"; : "${CAPTURE_DIR:?Set CAPTURE_DIR}"'
/usr/bin/time -p bash -c 'mkdir -p "$CAPTURE_DIR"; echo "capturing $CAPTURE_URL into $CAPTURE_DIR"'
/usr/bin/time -p node capture-run.mjs
/usr/bin/time -p bash -c 'ls -la "$CAPTURE_DIR/final-desktop.png" "$CAPTURE_DIR/final-mobile.png"'
