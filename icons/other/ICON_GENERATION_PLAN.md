# Icon Generation Plan

A two-layer compositing system for consistent, vintage-style icons.

## Overview

- **Base Layer**: Single paper/parchment background with transparent edges
- **Symbol Layer**: Individual icons with transparent backgrounds, overlay on paper
- **Format**: WebP (lossless) - 25-35% smaller than PNG, full Foundry VTT support
- **Size**: 512×512 pixels

---

## Phase 1: Paper Background

**Prompt:**
```
A vintage aged parchment paper texture, square format, with subtle worn edges and gentle coffee-stained watercolor marks. The paper should have a warm cream/ivory tone with subtle fiber texture visible. The edges should fade to full transparency creating a soft vignette effect. No illustrations, text, or symbols - just the pure parchment texture. Completely transparent corners. Top-down flat view, no perspective or shadows.
```

**Output**: `icons/base/paper-base.webp`

---

## Phase 2: Symbol Icons

### Common Prefix (prepend to ALL symbol prompts)

```
A detailed vintage engraving style illustration in sepia brown ink tones on a completely transparent background. The style should evoke Renaissance-era woodcut prints with fine crosshatching and line work. The symbol should be centered and fill approximately 60-70% of the canvas, leaving margin for the paper frame. No text labels. No background color. No shadows or glow effects. Pure linework illustration style.
```

### Individual Icon Prompts

#### Abilities

| Icon | Prompt |
|------|--------|
| charisma | A classical theatrical comedy/tragedy mask merged with an ornate lyre, decorated with laurel leaves |
| constitution | An anatomical heart surrounded by oak leaves representing endurance and vitality |
| dexterity | An elegant acrobat's hand catching three juggling balls, fingers gracefully extended |
| intelligence | An open tome with an owl perched on top, surrounded by geometric alchemical symbols |
| strength | A muscular forearm gripping a warhammer, with broken chains around the wrist |
| wisdom | A third eye opened within a lotus flower, radiating subtle light rays |

#### Anatomy

| Icon | Prompt |
|------|--------|
| brain-mystical | A detailed anatomical brain viewed from the side, surrounded by mystical alchemical planetary symbols |

#### Attributes

| Icon | Prompt |
|------|--------|
| ac | A medieval heater shield with ornate border designs and a central boss |
| attunement | A crystal orb with a hand reaching toward it, energy lines connecting fingers to crystal |
| bonus | A plus symbol decorated with ornate flourishes and leaf designs |
| penalty | A thick, solid minus symbol (horizontal bar) decorated with ornate baroque flourishes and thorny vine details, matching the visual weight of an ornate cross |
| light | A lit candle with radiating rays, flame drawn with detailed linework |
| range | A drawn bow with an arrow nocked, tension in the string visible, ready to fire |
| saving-throw | A protective hand raised in a warding gesture, with a deflected magical bolt |
| skillcheck | A d20 die showing the 20 face, with decorative scroll below |
| terrain | A compass rose overlaid on a topographic mountain sketch |
| test | An alchemist's flask with bubbling liquid, placed on testing scales |
| vision | A detailed human eye with rays emanating outward, surrounded by an ornate frame |

#### Dice

| Icon | Prompt |
|------|--------|
| d4 | A hand-drawn four-sided pyramid die, numbers 1-4 visible on faces. ISOLATED SUBJECT. NO BORDERS. |
| d6 | A hand-drawn six-sided cube die, with Arabic numerals (1-6) on the faces. NO PIPS/DOTS. ISOLATED SUBJECT. NO BORDERS. |
| d8 | A perfect REGULAR OCTAHEDRON (Platonic solid). Eight equilateral triangular faces. Represented resting on a vertex (point down). The central face is an equilateral triangle with the number '8'. Surrounding faces are also triangles. EXACTLY 8 faces total in the object structure. Arabic numerals. Geometric line art. ISOLATED SUBJECT. NO BORDERS. |
| d10 | A hand-drawn ten-sided trapezohedron die. ISOLATED SUBJECT. NO BORDERS. |
| d12 | A standard twelve-sided RPG die (dodecahedron) with pentagonal faces. The number '12' is clearly visible on the central face. NUMBERS MUST BE VISIBLE ON ALL OTHER FACES shown. Arabic numerals. Solid geometric structure. ISOLATED SUBJECT. NO BORDERS. |
| d20 | A single standard 20-sided RPG die (icosahedron). The number '20' is clearly visible on the central face. Solid geometric structure. ISOLATED SUBJECT. NO BORDERS. |
| advantage | Two d20 dice side-by-side, both clearly showing the number '20' on the top face using ARABIC numerals (20). NO ROMAN NUMERALS. An upward pointing arrow between them. ISOLATED SUBJECT. NO BORDERS. |
| disadvantage | Two d20 dice side-by-side, both clearly showing the number '1' on the top face using ARABIC numerals (1). NO ROMAN NUMERALS. A downward pointing arrow between them. ISOLATED SUBJECT. NO BORDERS. |
| roll | A hand rolling dice, motion lines indicating movement. ISOLATED SUBJECT. NO BORDERS. |

#### Documents

| Icon | Prompt |
|------|--------|
| reference-books | A stack of three leather-bound tomes with ornate spine decorations |
| scroll-sealed | A rolled parchment scroll secured with a wax seal |

#### Navigational

| Icon | Prompt |
|------|--------|
| pointing-hand | A manicule (pointing hand symbol) in the style of medieval manuscripts |

#### Skills

| Icon | Prompt |
|------|--------|
| acrobatics | A figure performing a backflip, limbs extended in graceful arc |
| animal-handling | A gentle hand petting a wolf, the wolf's head tilted trustingly |
| arcana | A glowing rune circle with mystical symbols and a wand |
| athletics | A classical Greek athlete illustration throwing a discus. Discobolus style. Muscular definition. Dynamic pose. ISOLATED SUBJECT. NO BORDERS. |
| deception | A theatrical mask with a forked tongue emerging |
| history | A stack of ancient scrolls and a thick leather-bound tome with a quill pen. Dust and age. ISOLATED SUBJECT. NO BORDERS. |
| insight | A magnifying glass examining a face, revealing hidden expression |
| intimidation | A roaring lion's head with fierce expression |
| investigation | A detective's magnifying glass over footprints |
| medicine | The Bowl of Hygieia. A chalice with a serpent coiled around the stem and poised above the bowl. Symbol of pharmacy and healing. Vintage engraving. ISOLATED SUBJECT. NO BORDERS. |
| nature | An oak leaf with acorn, surrounded by small forest creatures |
| perception | An alert owl's face with large watchful eyes |
| performance | A lute with musical notes floating above |
| persuasion | Two hands in a handshake, decorated ribbons around wrists |
| religion | A radiant sunburst behind a temple altar |
| sleight-of-hand | Dexterous hands manipulating a spread of vintage Tarot cards. The cards show intricate Renaissance-style art (Major Arcana). Magician's flourish. ISOLATED SUBJECT. NO BORDERS. |
| stealth | A cloaked figure melting into shadows, only eyes visible |
| survival | A campfire with a tent and stars above |

#### Tools

| Icon | Prompt |
|------|--------|
| artisan-tools | A leather apron with hammer, chisel, and measuring tools |
| drafting-compass | A drafting compass drawing a perfect circle, ruler alongside |
| eraser-vintage | A vintage rubber eraser with eraser shavings |

---

## Phase 3: Compositing (The 3-Image Workflow)

For each icon, we generate three distinct files:

1. **Original Generation** (`{name}-symbol-blue.png`)
   - The raw output from the generation model
   - Contains the symbol on a solid blue (#0000FF) background
   - Kept for reference and regeneration

2. **Transparent Symbol** (`{name}-symbol.png`)
   - Processed using `scripts/remove_blue.py`
   - Blue background removed via chroma keying to create transparency
   - Used for compositing

3. **Final Icon** (`{name}.png`)
   - The symbol composited onto the paper base
   - Opacity set to 50% for visibility and blend
   - Located in the final destination folder (e.g., `icons/abilities/`)

### Processing Commands

**1. Remove Blue Background:**
```bash
python3 scripts/remove_blue.py \
  icons/symbols/category/name-symbol-blue.png \
  icons/symbols/category/name-symbol.png
```

**2. Composite onto Paper:**
```bash
convert icons/base/paper-base.png \
  \( icons/symbols/category/name-symbol.png -alpha set -channel A -evaluate multiply 0.50 +channel \) \
  -gravity center -composite \
  icons/category/name.png
```
