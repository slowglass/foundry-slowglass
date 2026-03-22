#!/bin/bash
# Load the variables
source .env

# Run the build script
./scripts/build.sh

SKIP_IMAGES=false
RESTART=true
GAMES=()

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --skip-images) SKIP_IMAGES=true ;;
        --no-restart) RESTART=false ;;
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
  echo "--------------------------------------"
  echo "Updating game: ${GAME}..."
  
  # Dockge stack location
  STACK_PATH="/home/cjd/services/dockge/stacks/foundry-${GAME}"
  # Foundry Data location
  DATA_PATH="/home/cjd/services/foundry/${GAME}"
  # Module target path
  MODULE_PATH="${DATA_PATH}/Data/modules/foundry-slowglass"

  if [ "$RESTART" = true ]; then
    echo "Stopping stack at ${STACK_PATH}..."
    ssh ${FOUNDRY_HOST} "cd ${STACK_PATH} && docker compose stop"
  fi

  echo "Extracting files to ${MODULE_PATH}..."
  ssh ${FOUNDRY_HOST} "mkdir -p ${MODULE_PATH} && tar -xzf /tmp/$TAR_NAME -C ${MODULE_PATH} && chown -R cjd ${MODULE_PATH}"

  if [ "$RESTART" = true ]; then
    echo "Starting stack at ${STACK_PATH}..."
    ssh ${FOUNDRY_HOST} "cd ${STACK_PATH} && docker compose up -d"
  fi
done

echo "--------------------------------------"
echo "Cleaning up..."
rm $TAR_NAME
ssh ${FOUNDRY_HOST} "rm /tmp/$TAR_NAME"
echo "Live update complete!"
