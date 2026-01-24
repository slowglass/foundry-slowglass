#!/bin/bash
set -e

# Create necessary directories
# Handle config
CLEAN=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --clean) CLEAN=true ;;
    esac
    shift
done

if [ "$CLEAN" = true ]; then
    echo "Cleaning output directories..."
    rm -rf icons/transparent icons/paper
fi

mkdir -p packs
mkdir -p icons/transparent

# Build Macros
echo "Building Macros..."
node scripts/pack-macros.js
fvtt package pack foundry-slowglass --compendiumName slowglass-macros --in ./.build/packs/macros --out ./packs --compendiumType Macro

# Build Icons
echo "Processing Icons..."
python3 scripts/generate_icons.py --input icons/blue --transparent icons/transparent --paper icons/paper

echo "Build Complete!"
