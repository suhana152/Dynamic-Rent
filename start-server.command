#!/bin/bash
# Double-click this file (macOS: rename usage via Finder > Open, or run
# `./start-server.command` in Terminal) to serve DynamicRent locally.
# This avoids the browser's CORS block on fetch() over file:// URLs.
cd "$(dirname "$0")"
echo "Starting DynamicRent at http://localhost:8000 ..."
echo "Press Ctrl+C to stop."
python3 -m http.server 8000 || python -m http.server 8000
