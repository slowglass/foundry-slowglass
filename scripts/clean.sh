#!/bin/bash
# Complete Cleanup Script for Slowglass Helper
set -e

echo "Cleaning up build artifacts..."

# Remove packs
if [ -d "packs" ]; then
    echo "  - Removing packs/*.db"
    rm -rf packs/*.db
fi

# Remove generated releases
if [ -f "src/releases.js" ]; then
    echo "  - Removing src/releases.js"
    rm src/releases.js
fi

# Remove processed icons
if [ -d "icons/transparent" ]; then
    echo "  - Removing icons/transparent/"
    rm -rf icons/transparent/
fi

if [ -d "icons/paper" ]; then
    echo "  - Removing icons/paper/"
    rm -rf icons/paper/
fi

# Remove temporary build files
if [ -d ".build" ]; then
    echo "  - Removing .build/"
    rm -rf .build/
fi

if ls *.tar.gz >/dev/null 2>&1; then
    echo "  - Removing tar.gz files"
    rm *.tar.gz
fi

echo "Cleanup complete!"
