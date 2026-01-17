const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MACRO_DIR = path.join(__dirname, '..', 'macro');
const PACK_SRC_DIR = path.join(__dirname, '..', 'src', 'packs', 'macros');

// Ensure output directory exists
if (!fs.existsSync(PACK_SRC_DIR)) {
    fs.mkdirSync(PACK_SRC_DIR, { recursive: true });
}

/**
 * Generates a consistent 16-character ID for a given string.
 * @param {string} name 
 * @returns {string}
 */
function generateId(name) {
    return crypto.createHash('md5').update(name).digest('hex').substring(0, 16);
}

/**
 * Converts a JS macro file to a Foundry VTT Macro JSON.
 * @param {string} fileName 
 */
function convertMacro(fileName) {
    if (!fileName.endsWith('.js')) return;

    const filePath = path.join(MACRO_DIR, fileName);
    const content = fs.readFileSync(filePath, 'utf8');
    const macroName = path.basename(fileName, '.js').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    // Attempt to extract description from JSDoc-style comments
    let description = "";
    const descMatch = content.match(/\* Description: (.*)/);
    if (descMatch) {
        description = descMatch[1];
    }

    const macroId = generateId(macroName);

    const macroData = {
        "name": macroName,
        "type": "script",
        "author": "slowglass",
        "img": `modules/foundry-slowglass/icons/macros/${path.basename(fileName, '.js')}.png`,
        "scope": "global",
        "command": content,
        "folder": null,
        "sort": 0,
        "ownership": {
            "default": 0
        },
        "flags": {},
        "_id": macroId,
        "_key": `!macros!${macroId}`,
        "_stats": {
            "systemId": "dnd5e",
            "systemVersion": "4.0.0",
            "coreVersion": "13.350",
            "createdTime": Date.now(),
            "modifiedTime": Date.now(),
            "lastModifiedBy": "slowglass"
        }
    };

    // Check if custom icon exists, else fallback
    const iconPath = path.join(__dirname, '..', 'icons', 'macros', `${path.basename(fileName, '.js')}.png`);
    if (!fs.existsSync(iconPath)) {
        macroData.img = "icons/svg/dice-target.svg";
    }

    const outputFileName = `macro_${macroName.replace(/\s+/g, '_')}_${macroId}.json`;
    const outputPath = path.join(PACK_SRC_DIR, outputFileName);

    fs.writeFileSync(outputPath, JSON.stringify(macroData, null, 2));
    console.log(`Converted: ${fileName} -> ${outputFileName} (Icon: ${macroData.img})`);
}

// Process all files in the macro directory
fs.readdirSync(MACRO_DIR).forEach(convertMacro);

console.log('Macro conversion complete.');
