#!/bin/sh
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then
  echo "First run: installing dependencies (needs internet)..."
  npm install
  if [ $? -ne 0 ]; then
    echo "[ERROR] npm install failed. Please install Node.js LTS from https://nodejs.org and ensure internet access."
    exit 1
  fi
fi
echo "Starting server... (Ctrl+C to stop)"
node server.js
