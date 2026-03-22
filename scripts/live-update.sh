#!/bin/bash
# Load the variables
source .env

# Run the build script
./scripts/build.sh

SKIP_IMAGES=false
GAMES=()

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --skip-images) SKIP_IMAGES=true ;;
        -*) echo "Unknown parameter passed: $1"; exit 1 ;;
        *) GAMES+=("$1") ;;
    esac
    shift
done

# Determine which games to update
if [ ${#GAMES[@]} -eq 0 ]; then
  GAMES=("nbdsm" "sotr")
fi

TAR_NAME="update.tar.gz"

echo "Creating tar file..."
if [ "$SKIP_IMAGES" = true ]; then
  tar -czf $TAR_NAME src styles lang templates module.json
else
  tar -czf $TAR_NAME src styles lang templates icons module.json
fi

echo "Copying to ${FOUNDRY_HOST}..."
scp $TAR_NAME ${FOUNDRY_HOST}:/tmp/$TAR_NAME

for GAME in "${GAMES[@]}"; do
  echo "Updating game: ${GAME}..."
  FOUNDRY_PATH="/home/cjd/services/foundry/${GAME}/Data/modules/foundry-slowglass"

  # Extract tar and fix permissions (packs are deliberately omitted to preserve remote compendiums)
  ssh ${FOUNDRY_HOST} "mkdir -p ${FOUNDRY_PATH} && tar -xzf /tmp/$TAR_NAME -C ${FOUNDRY_PATH} && chown -R cjd ${FOUNDRY_PATH}"
done

echo "Cleaning up..."
rm $TAR_NAME
ssh ${FOUNDRY_HOST} "rm /tmp/$TAR_NAME"
