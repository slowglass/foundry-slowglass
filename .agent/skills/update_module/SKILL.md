---
name: update_module
description: Instructions on how to update the module.
---

# Update Module Skill

This skill outlines the process for live-updating the Foundry Slowglass module locally without going through a full release process.

## Instructions
When instructed to run an update on the module, you must perform these steps systematically:

1. **Evaluate Recent Code Changes:** 
   Use `git --no-pager diff $(git describe --tags --abbrev=0)..HEAD` to look at the actual code diffs of the files modified since the last tag.
2. **Generate Summary:** 
   Analyze the raw code changes from the diff and compile a short, concise summary of exactly what logic, features, or fixes were coded during this cycle. Do not just blindly copy git commit messages—write a meaningful summary based on what the code diff shows.
3. **Update `RELEASES.md`:** 
   Open `RELEASES.md` and *replace* the previous content underneath the `## Pre release` section with your newly compiled summary of the code changes. 
4. **Commit the Docs:** 
   Commit the modifications to `RELEASES.md` to git (e.g. `git commit -am "Module Update: Update pre-release notes"`).
5. **Deploy the Update:** 
   Execute the live-update deployment script, ensuring that you append the `--skip-images` flag by default to drastically speed up the sync process:
   `./scripts/live-update.sh --skip-images`
