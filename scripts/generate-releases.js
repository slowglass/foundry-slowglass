const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Extract tags and messages
try {
    let logOutput = execSync('git log --tags --simplify-by-decoration --pretty="format:%ci|%d|%an"', { encoding: 'utf8' });
    let html = '<h2>Release Notes</h2>';

    let currentTag = null;
    let currentTagDate = null;

    // We can also get commits between tags but let's just make it simpler by running standard git log between tags
    const tags = execSync('git tag -l -n99 --sort=-v:refname', { encoding: 'utf8' }).trim().split('\n');

    // Actually, wait, let's just grab the whole commit history
    const allCommits = execSync('git log --pretty=format:"%H|%s|%d"', { encoding: 'utf8' }).split('\n');

    let activeTag = 'Unreleased / pr-release';
    let grouped = { [activeTag]: [] };
    let tagOrder = [activeTag];

    for (let line of allCommits) {
        const parts = line.split('|');
        if (parts.length < 3) continue;
        const [hash, msg, refs] = parts;

        // Look for a tag in the refs
        if (refs.includes('tag: ')) {
            const match = refs.match(/tag: (v[\d\.]+)/);
            if (match) {
                activeTag = match[1];
                if (!grouped[activeTag]) {
                    grouped[activeTag] = [];
                    tagOrder.push(activeTag);
                }
            }
        }

        grouped[activeTag].push(msg);
    }

    for (let tag of tagOrder) {
        if (grouped[tag].length === 0) continue;
        if (tag === 'Unreleased / pr-release') {
            // Skip unreleased for now or include it? User said "current release notes by version number"
            continue;
        }
        html += `<h3>${tag}</h3><ul>`;
        for (let msg of grouped[tag]) {
            // Clean up conventional commit prefix or Module Update
            let cleanMsg = msg.replace('Module Update:', '').trim();
            html += `<li>${cleanMsg}</li>`;
        }
        html += `</ul>`;
    }

    const outputPath = path.join(__dirname, '..', 'src', 'releases.js');
    const fileContent = `export const RELEASES_HTML = \`${html.replace(/`/g, '\\`')}\`;\n`;
    fs.writeFileSync(outputPath, fileContent);
    console.log('✅ Generated src/releases.js');

} catch (e) {
    console.error('Error generating releases:', e);
}
