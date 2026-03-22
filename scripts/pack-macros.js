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
const oldFolderId = generateId("FolderOldMacros");

const folderDoc = {
    "_id": oldFolderId,
    "name": "Old",
    "type": "script", // Actually, for compat, Foundry might expect packs to have a Folder document with specific format. 
    // In db files, a folder is identified by being a folder model. We will assign type: "Folder".
    "folder": null,
    "sort": 0,
    "color": "#444444",
    "flags": {},
    "_stats": {
        "systemId": "dnd5e",
        "systemVersion": "4.0.0",
        "coreVersion": "13.350",
        "createdTime": Date.now(),
        "modifiedTime": Date.now(),
        "lastModifiedBy": "slowglass"
    }
};
// We will change the type of Folder doc just in case it is strictly 'Folder'. In Foundry v10/v11+, folders in packs are documents.
folderDoc.type = "Folder"; 

function convertMacro(fileName, isOld) {
    if (!fileName.endsWith('.js')) return null;

    const baseDir = isOld ? path.join(MACRO_DIR, 'old') : MACRO_DIR;
    const filePath = path.join(baseDir, fileName);
    const content = fs.readFileSync(filePath, 'utf8');
    const defaultName = path.basename(fileName, '.js').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    let macroName = defaultName;
    
    // Parse metadata comments
    const lines = content.split('\n');
    for (let line of lines) {
        line = line.trim();
        const nameMatch = line.match(/^\/\/\s*Macro Name:\s*(.*?)\s*$/i);
        if (nameMatch) {
            macroName = nameMatch[1].trim();
        }
    }
    
    // To ensure old macros maintain their IDs if they had them before, we use the same defaultName.
    const macroId = generateId(defaultName);

    const macroData = {
        "name": macroName,
        "type": "script",
        "author": "slowglass",
        "img": "icons/svg/dice-target.svg", // Default
        "scope": "global",
        "command": content,
        "folder": isOld ? oldFolderId : null,
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

    // Parse metadata comments (again for other fields like icon)
    for (let line of lines) {
        line = line.trim();
        const iconMatch = line.match(/^\/\/\s*Icon:\s*(Module|Core)\s+(.*?)\s*$/i);
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
    .filter(f => fs.statSync(path.join(MACRO_DIR, f)).isFile())
    .map(f => convertMacro(f, false))
    .filter(Boolean);

// Read old macros
const oldDir = path.join(MACRO_DIR, 'old');
if (fs.existsSync(oldDir)) {
    const oldMacros = fs.readdirSync(oldDir)
        .filter(f => fs.statSync(path.join(oldDir, f)).isFile())
        .map(f => convertMacro(f, true))
        .filter(Boolean);
    
    if (oldMacros.length > 0) {
        // If there are old macros, we include the folder document and the scripts
        macros.push(folderDoc, ...oldMacros);
    }
}

// Update .db file: NeDB (JSONL) is one JSON object per line
const jsonlContent = macros.map(m => JSON.stringify(m)).join('\n');
fs.writeFileSync(OUTPUT_FILE, jsonlContent);

console.log(`Macro conversion complete. Generated ${macros.length} macros in ${OUTPUT_FILE}`);
