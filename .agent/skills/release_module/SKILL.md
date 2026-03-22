---
name: release_module
description: Instructions on how to release a new version of the module.
---

# Release Module Skill

This skill outlines the process for releasing a new version of the Foundry Slowglass module.

## Steps to Release

When a new release is required, follow these steps in order:

1. **Update RELEASES.md**: Move the contents of the `## Pre release` section to a new version section (e.g., `## v0.0.32`) and remove the `Pre release` section.
2. **Update Manifest Version**: Remove the `-snapshot` suffix from the `version` number in `module.json`. (e.g., `"version": "0.0.32-snapshot"` becomes `"version": "0.0.32"`).
3. **Commit Version Update**: Commit the changes to `module.json` and `RELEASES.md`.
4. **Tag the Release**: Add a git tag corresponding to the new version number, prefixed with `v` (e.g., `v0.0.32`).
   `git tag v<version-number>`
5. **Push Tag and Branch**: Push the commit and the newly created tag to the remote repository.
   `git push origin master v<version-number>`
6. **Prepare for Next Development Cycle**: Increment the point release number in `module.json` and append `-snapshot` to it (e.g., `"version": "0.0.33-snapshot"`).
7. **Commit and Push**: Commit the version increment and push it to the repository.
