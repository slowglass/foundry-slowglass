const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MACRO_DIR = path.join(__dirname, '..', 'macros');
const OUTPUT_FILE = path.join(__dirname, '..', 'packs', 'slowglass-macros.db');

// Ensure output directory exists
if (!fs.existsSync(path.dirname(OUTPUT_FILE))) {
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
}

/**
 * Generates a consistent 16-character ID for a given string.
 */
function generateId(name) {
    return crypto.createHash('md5').update(name).digest('hex').substring(0, 16);
}

/**
 * Converts a JS macro file to a Foundry VTT Macro JSON.
 */
function convertMacro(fileName) {
    if (!fileName.endsWith('.js')) return null;

    const filePath = path.join(MACRO_DIR, fileName);
    const content = fs.readFileSync(filePath, 'utf8');
    const macroName = path.basename(fileName, '.js').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const macroId = generateId(macroName);

    const macroData = {
        "name": macroName,
        "type": "script",
        "author": "slowglass",
        "img": "icons/svg/dice-target.svg", // Default
        "scope": "global",
        "command": content,
        "folder": null,
        "sort": 0,
        "ownership": {
            "default": 0
        },
        "flags": {},
        "_id": macroId,
        "_stats": {
            "systemId": "dnd5e",
            "systemVersion": "4.0.0",
            "coreVersion": "13.350",
            "createdTime": Date.now(),
            "modifiedTime": Date.now(),
            "lastModifiedBy": "slowglass"
        }
    };

    // Parse metadata comments
    const lines = content.split('\n');
    for (const line of lines) {
        const iconMatch = line.match(/^\/\/\s*Icon:\s*(Module|Core)\s+(.*)$/i);
        if (iconMatch) {
            const sourceType = iconMatch[1].toLowerCase();
            const iconPath = iconMatch[2].trim();
            macroData.img = sourceType === 'module' ? `modules/foundry-slowglass/icons/${iconPath}` : `icons/${iconPath}`;
            break;
        }
    }

    return macroData;
}

// Collect all macro objects
const macros = fs.readdirSync(MACRO_DIR)
    .map(convertMacro)
    .filter(Boolean);

// Update .db file: NeDB (JSONL) is one JSON object per line
const jsonlContent = macros.map(m => JSON.stringify(m)).join('\n');
fs.writeFileSync(OUTPUT_FILE, jsonlContent);

console.log(`Macro conversion complete. Generated ${macros.length} macros in ${OUTPUT_FILE}`);
