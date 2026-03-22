#!/bin/bash
set -e

# Create necessary directories
CLEAN=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --clean) CLEAN=true ;;
    esac
    shift
done

if [ "$CLEAN" = true ]; then
    echo "Cleaning output directories..."
    rm -rf icons/transparent icons/paper packs/*.db
fi

mkdir -p packs
mkdir -p icons/transparent

# Build Macros
echo "Packing Macros (NeDB/JSONL mode)..."
node scripts/pack-macros.js

echo "Generating Releases..."
node scripts/generate-releases.js

# Build Icons
echo "Processing Icons..."
python3 scripts/generate_icons.py --input icons/blue --transparent icons/transparent --paper icons/paper

echo "Build Complete!"
