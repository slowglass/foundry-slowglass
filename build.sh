#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Check if jq is installed
if ! command -v jq &> /dev/null
then
    echo "jq could not be found. Please install it to run this script."
    exit 1
fi

# Get the module data from the module.json file
MODULE_ID=$(jq -r '.id' module.json)
MODULE_VERSION=$(jq -r '.version' module.json)

# Create the zip file name
ZIP_FILE_NAME="${MODULE_ID}-${MODULE_VERSION}.zip"

echo "Creating zip file: ${ZIP_FILE_NAME}"

# Get the list of files to exclude
# .git directory, any existing zip files, and the build.sh script itself
EXCLUDE_PATTERNS=(
    ".git/*"
    "*.zip"
    "build.sh"
    "build.ps1" # Exclude the powershell script as well
    ".github/*" # Exclude github workflows
)

# Build the exclude options for the zip command
ZIP_EXCLUDE=""
for pattern in "${EXCLUDE_PATTERNS[@]}"; do
    ZIP_EXCLUDE+=" -x \"$pattern\""
done

# Create the zip file
# The -r option is for recursive zipping
# The eval is used because ZIP_EXCLUDE is a string that needs to be evaluated as part of the command
eval zip -r "${ZIP_FILE_NAME}" . ${ZIP_EXCLUDE}

echo "Module zip file created: ${ZIP_FILE_NAME}"
