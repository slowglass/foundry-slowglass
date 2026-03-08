---
name: update_module
description: Instructions on how to update the module.
---

# Update Module Skill

This skill outlines the process for updating the Foundry Slowglass module locally without going through a full release process.

## Steps to Update

1. Update `RELEASES.md` with any changes since the last version in the `## Pre release` section.
2. Ensure all changes (including `RELEASES.md`) are committed.
3. Execute the following script located in the project:
   `./scripts/live-update.sh`
