---
name: release_module
description: Instructions on how to release a new version of the module.
---

# Release Module Skill

This skill outlines the process for releasing a new version of the Foundry Slowglass module.

## Steps to Release

When a new release is required, follow these steps in order:

1. **Update Manifest Version**: Remove the `-snapshot` suffix from the `version` number in `module.json`. (e.g., `"version": "0.0.30-snapshot"` becomes `"version": "0.0.30"`).

2. **Tag the Release**: Add a git tag corresponding to the new version number, prefixed with `v` (e.g., `v0.0.30`).
   `git tag v<version-number>`

3. **Push the Tag**: Push the newly created tag to the remote repository.
   `git push origin v<version-number>`

4. **Prepare for Next Development Cycle**: Increment the point release number in `module.json` and append `-snapshot` to it (e.g., if you just released `0.0.30`, the new version should be `"0.0.31-snapshot"`).
   
5. **Commit and Push**: Commit the version updates to `module.json` and push them to the repository for the next development cycle.
