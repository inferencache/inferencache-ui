#!/usr/bin/env bash
# Always run the backend with the conda promptcache environment's Python,
# regardless of which Python is on PATH.
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON="/Users/justingaddy/anaconda3/envs/promptcache/bin/python"

if [ ! -f "$PYTHON" ]; then
  echo "ERROR: conda env 'promptcache' not found at $PYTHON"
  echo "Run: conda create -n promptcache python pip && pip install -r requirements.txt"
  exit 1
fi

cd "$SCRIPT_DIR"
exec "$PYTHON" -m uvicorn main:app --reload --port 8000
