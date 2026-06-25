#!/usr/bin/env bash
# Start the dev backend using the active Python environment.
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
exec python -m uvicorn main:app --reload --port 8000
