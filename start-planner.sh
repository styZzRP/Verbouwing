#!/bin/sh
# Project Ons Thuis starten
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is niet gevonden. Installeer het gratis via https://nodejs.org"
  exit 1
fi
node server.js
