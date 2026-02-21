# Slowglass Helper

A Foundry VTT module that enhances gameplay by automatically managing actor status effects (unconscious/dead based on HP) and tracking the usage of throwable weapons and ammunition for player characters during combat. It reports item usage to the Game Master via chat messages, with features tailored for D&D 5e item properties.

## Features

This module provides a suite of custom features and macros specifically designed for the Slowglass table, including:

- **Custom UI & Macros**: 
  - Visual, icon-driven dialogue macros for requesting **Saving Throws**, **Ability Checks**, and **Skill Checks** from players.
  - A suite of player-utility macros including **Select My Token** (displays token grid per player) and **Clear Chat Logs**.
  - A tool to easily parse and import plain-text game transcripts directly into Foundry Journal Entries.
- **Combat & Automation Enhancements**:
  - Automatically manages actor HP status effects, applying Unconscious/Dead conditions when appropriate.
  - Intercepts and tracks the usage of physical ammunition and thrown weapons behind the scenes, reporting depletion to the DM.
  - Custom visual encounter trackers and attack roll handlers to streamline combat displays in the chat.
- **Class-Specific Automation**:
  - Contains tailored listeners and logic for specific sub-classes, such as automatically distributing Temporary HP auras upon raging for the *Path of the World Tree Barbarian*.
- **Icon Library**:
  - Includes an auto-generated library of custom transparent and paper-backed tool, class, spell, and ability icons used throughout the module's custom interfaces.

## Installation

To install this module, you can use one of the following methods:

### Automatic Installation

1.  Open the Foundry VTT setup screen.
2.  Click on the "Add-on Modules" tab.
3.  Click the "Install Module" button.
4.  In the "Manifest URL" field, paste the following URL:
    `https://github.com/slowglass/foundry-slowglass/releases/latest/download/module.json`
5.  Click the "Install" button.

### Manual Installation

1.  Download the latest release zip file from the [releases page](https://github.com/slowglass/foundry-slowglass/releases).
2.  Extract the contents of the zip file into the `modules` directory of your Foundry VTT data folder.

## Development Installation

To install the latest development version of this module, use the following manifest URL:

`https://cdn.jsdelivr.net/gh/slowglass/foundry-slowglass@master/module.json`

## Local Development (Eccles Road)
Run 
```
./build.sh <server>
```
to copy code to that Foundry-13 server (default is test)