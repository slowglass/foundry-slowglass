---
description: Packing Macros into a Compendium
---

This workflow explains how to manage macros as source files and pack them into a Foundry VTT compendium.

## Prerequisites

- Foundry VTT installed (with `fvtt` CLI configured)
- Node.js installed

## 1. Convert JS Macros to Compendium Source

Run the helper script to read `macro/*.js` files and create/update Foundry Document JSONs in `src/packs/macros/`:

```bash
node scripts/pack-macros.js
```

This ensures that any changes you make to the `.js` files are reflected in the source JSONs.

## 2. Pack the Compendium

Run the `fvtt` command to pack the source JSONs into the binary LevelDB format required by Foundry.

**Run this on the machine where Foundry VTT is installed:**

```bash
# General syntax
# fvtt package pack <package-name> --id <pack-name> --in <source-dir> --out <dest-dir> --type <type>

# Specific command for this module
# Note: --type is for Package Type (Module/System/World). For Compendium Type, use --compendiumType
fvtt package pack foundry-slowglass --compendiumName slowglass-macros --in ./src/packs/macros --out ./packs --compendiumType Macro
```

> **Note:** Ensure you run this from the module root directory (`foundry-slowglass/`).

## 3. Verify in Foundry

1. Restart Foundry VTT.
2. Enable the **Slowglass Helper** module.
3. Open the **Compendiums** tab.
4. You should see a **Slowglass Macros** compendium containing your macros.
