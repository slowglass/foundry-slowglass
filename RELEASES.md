# Release Notes

## Pre release

## v0.0.32

- **Journal System Overhaul:** Added `src/journal-manager.js` to automatically establish and sync module documentation (Foundry-Slowglass and Game journals) directly into the host VTT worlds with proper GM/Player permissions and HTML generation.
- **Automated Deploy Notes:** Scripted `generate-releases.js` inside the build steps to convert the Markdown release history into JS-exported HTML elements for clean Foundry journal synchronization.
- **Macro Modifications:** Updated user interaction macros (`ability.js`, `skills.js`) to support active-state context toggling and custom UI width rendering parameters.
- **Module Maintenance & Deploy Skills:** Established workflow docs (`SKILL.md`) and enhanced `live-update.sh` with Dockge stack management (automated stop/start) and UID-specific permission handling.

## v0.0.31

- More work on the release process

## v0.0.30

- Add and update skills for releasing and updating the module.

## v0.0.3

- Trigger GitHub Action rebuild
- Make scripts executable
- Add setup-encounter and summon-creatures macros
- Fix AttackRollHandler button replacement and World Tree rage logic
- Commit changes
- Change Kruck actions to be more generic (WIP)
- Update macros
- Add Healing support
- Docs: Added agent skills for icon design
- DevOps: Moved overflow detection script to scripts/, updated generation script with scaling support
- Added new class icons and weapon icons
- Add more icons - designed by AI
- Add new d20 icons and configs
- Update build scripts: Rename remove_blue.py to generate_icons.py and improve build.sh
- Update macros to use PNG icons
- Add icons/.gitignore
- Add raw images and SVG icons
- Implement build system: Add build.sh and move live-update.sh
- Add blue removal scripts and parameter files
- Refactor icons folder structure - Add 4 top-level sections: blue, transparent, paper, other - Move blue symbol icons from symbols/ to blue/ - Move transparent SVG icons to transparent/ - Move paper-base.png to paper/ - Move documentation files to other/
- Start to use .env file
- Restucture the project
- Clean up macro building
- Add new macros and place in compendium
- Add macro scripts for abilities and skills
- Feature: Add Kruck's Rage Aura handler
- Add Select macros
- chore: reorganize project documentation and remove unused macro
- Change build.sh to deploy,.sh
- Move macros to the correct place
- Macros
- Roll request working with basic macro
- Push assets to game
- Add start of simple smart rolling
- Update gitignore
- Chat Archiving Overhaul & Maintenance Tools
- Add following  - Small Crossbow Bolts  - Chat Archiving
- Add delete next
- Update Module Name
- Add Action Type requester
- Add vscode settings
- docs: Update README.md with detailed module description
- refactor: Remove PowerShell build scripts and update module description
- docs: Update GEMINI.md
- feat: Allow build script to target different Foundry VTT paths
- Update what we send to Tardis
- Code clean up
- Code recovered from backup - no idea how it was lost
- feat: Add build.sh script for Linux environments
- Refactor: Introduce ActorManager class and rename file (#2)
- Big death (#1)

## v0.0.1

- Release Version: v0.0.1
- Initial commit
- Initial commit

