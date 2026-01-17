#!/bin/bash
# Load the variables
source .env

FOUNDRY_PATH="/home/cjd/services/foundry/${FOUNDRY_GAME}/Data/modules/foundry-slowglass"
node scripts/pack-macros.js
mkdir -p packs
fvtt package pack foundry-slowglass --compendiumName slowglass-macros --in ./.build/packs/macros --out ./packs --compendiumType Macro

# Clear remote packs directory to prevent LevelDB corruption/stale files
ssh ${FOUNDRY_HOST} "rm -rf ${FOUNDRY_PATH}/packs"

# Copy runtime files to remote
scp -r src styles lang templates packs icons module.json ${FOUNDRY_HOST}:${FOUNDRY_PATH}

# Fix permissions
ssh ${FOUNDRY_HOST} chown -R cjd ${FOUNDRY_PATH}

