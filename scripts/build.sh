#!/bin/bash
set -e

# Create necessary directories
mkdir -p packs
mkdir -p icons/transparent

# Build Macros
echo "Building Macros..."
node scripts/pack-macros.js
fvtt package pack foundry-slowglass --compendiumName slowglass-macros --in ./.build/packs/macros --out ./packs --compendiumType Macro

# Build Icons
echo "Processing Icons..."
python3 scripts/remove_blue.py --input icons/blue --output icons/transparent

echo "Build Complete!"
