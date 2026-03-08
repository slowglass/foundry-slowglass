const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const releasesMdPath = path.join(__dirname, '..', 'RELEASES.md');

// Generate RELEASES.md from git history ONLY if it does not exist
if (!fs.existsSync(releasesMdPath)) {
    console.log('RELEASES.md not found. Generating from git history...');
    try {
        let md = '# Release Notes\n\n';
        const allCommits = execSync('git log --pretty=format:"%H|%s|%d"', { encoding: 'utf8' }).split('\n');

        let activeTag = 'Unreleased / pr-release';
        let grouped = { [activeTag]: [] };
        let tagOrder = [activeTag];

        for (let line of allCommits) {
            const parts = line.split('|');
            if (parts.length < 3) continue;
            const [hash, msg, refs] = parts;

            if (refs && refs.includes('tag: ')) {
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
            if (tag === 'Unreleased / pr-release') continue;
            md += `## ${tag}\n\n`;
            for (let msg of grouped[tag]) {
                let cleanMsg = msg.replace('Module Update:', '').trim();
                md += `- ${cleanMsg}\n`;
            }
            md += '\n';
        }

        fs.writeFileSync(releasesMdPath, md);
        console.log('✅ Created RELEASES.md');
    } catch (e) {
        console.error('Error generating RELEASES.md:', e);
    }
}

// Now read RELEASES.md and generate src/releases.js
if (fs.existsSync(releasesMdPath)) {
    const mdContent = fs.readFileSync(releasesMdPath, 'utf8');
    const outputPath = path.join(__dirname, '..', 'src', 'releases.js');
    // Escape backticks and backslashes
    const safeContent = mdContent.replace(/\\/g, '\\\\').replace(/`/g, '\\`');

    const fileContent = `export const RELEASES_MD = \`${safeContent}\`;\n`;
    fs.writeFileSync(outputPath, fileContent);
    console.log('✅ Generated src/releases.js from RELEASES.md');
} else {
    console.error("RELEASES.md still does not exist.");
}
