---
name: icon_design
description: Guidelines and prompts for generating Foundry VTT icons in the Slowglass visual style.
---

# Icon Design Skill

This skill provides guidelines and prompts for generating icons compatible with the Foundry Slowglass module.

## Common Style Description (Prompt for Nano Banana Pro)

When generating new icons, use the following style descriptors to match the existing asset library:

> **Subject**: [Item Name] (e.g., "A vintage drafting compass", "A muscular arm symbol for strength")
>
> **Art Style**: Hand-drawn ink sketch, vintage illustration, detailed line art, engraving style, etching.
>
> **Line Work**: Dark, confident lines with cross-hatching or stippling for shading. High contrast.
>
> **Color**: Monochrome dark ink (black or very dark blue-grey) on a **solid vibrant blue background**.
>
> **Composition**: Centered single object, white/negative space is strictly omitted (replaced by the blue background), clear silhouette.
>
> **Texture**: The object itself should have texture (wood, metal, skin) conveyed through lines, not photorealism. The background should be uniform for easy removal, but the style implies a "technical drawing" or "tome illustration".

## Technical Specifications
*   **Dimensions**: 1024x1024 pixels
*   **Format**: PNG
*   **Background Color**: Blue (approx. RGB 0, 0, 255 or similar distinct chroma key blue).
*   **Filename Convention**: `[name]-symbol-blue.png`

## Example Prompt
*"A vintage engraving of a mysterious brain symbol. The subject is drawn in **warm sepia and ivory ink colors**, heavily detailed with crosshatching. The background is a **solid, flat, digital pure blue (#0000FF)** for chroma keying. **CRITICAL: The subject must be ISOLATED against the pure blue background. Do not apply paper texture to the blue background. Only the subject should look like paper/ink.** Center the subject. No shadows, no vignettes, no borders."*

## After generatuin
- Ask for location and name for the icon file (place in the icons/blue folder)
- Examine the file and generate a json file to use with skills/generate_icons.py (name of the json file should be the same as the icon file with .json extension appended after the .png extension)