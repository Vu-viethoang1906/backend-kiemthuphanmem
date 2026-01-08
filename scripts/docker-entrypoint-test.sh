#!/bin/sh
# ============================================
# Docker Entrypoint Script for Test Environment
# ============================================

set -e

echo "Starting test environment setup..."

# Check if node_modules exists and has content
if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
    echo "Installing dependencies..."
    npm install
    echo "Dependencies installed successfully!"
else
    echo "Dependencies already installed, checking for updates..."
    npm install
fi

echo "Test environment ready!"

# Execute the command passed to docker run
exec "$@"
