# Slowglass Helper

A Foundry VTT module that enhances gameplay by automatically managing actor status effects (unconscious/dead based on HP) and tracking the usage of throwable weapons and ammunition for player characters during combat. It reports item usage to the Game Master via chat messages, with features tailored for D&D 5e item properties.

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