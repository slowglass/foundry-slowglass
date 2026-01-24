#!/bin/bash
# Load the variables
source .env

# Run the build script
./scripts/build.sh

FOUNDRY_PATH="/home/cjd/services/foundry/${FOUNDRY_GAME}/Data/modules/foundry-slowglass"

# Clear remote packs directory to prevent LevelDB corruption/stale files
ssh ${FOUNDRY_HOST} "rm -rf ${FOUNDRY_PATH}/packs"

# Copy runtime files to remote
scp -r src styles lang templates packs icons module.json ${FOUNDRY_HOST}:${FOUNDRY_PATH}

# Fix permissions
ssh ${FOUNDRY_HOST} chown -R cjd ${FOUNDRY_PATH}
