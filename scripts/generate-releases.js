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
    let mdContent = fs.readFileSync(releasesMdPath, 'utf8');
    const outputPath = path.join(__dirname, '..', 'src', 'releases.js');
    
    // Strip empty Pre release sections dynamically before exporting
    mdContent = mdContent.replace(/## Pre release\s*(?=##)/, '');

    // Parse to simple HTML
    let htmlContent = mdContent
        .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
        .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
        .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.*?)`/g, '<code>$1</code>');
        
    // Handle bullet points
    let inList = false;
    let newHtml = [];
    const lines = htmlContent.split('\n');
    for (let line of lines) {
        if (line.startsWith('- ')) {
            if (!inList) {
                newHtml.push('<ul>');
                inList = true;
            }
            newHtml.push(`<li>${line.substring(2)}</li>`);
        } else {
            if (inList) {
                newHtml.push('</ul>');
                inList = false;
            }
            // Add <br> for empty lines if not in a list and not after a heading
            if (line.trim() === '' && !newHtml[newHtml.length - 1]?.endsWith('</h1>') && !newHtml[newHtml.length - 1]?.endsWith('</h2>')) {
                 // Do nothing or add br
            } else if (line.trim() !== '') {
                 // if not heading, wrap in p? Actually just raw is fine or add <p> for lines without tags
                 if (!line.startsWith('<')) {
                     newHtml.push(`<p>${line}</p>`);
                 } else {
                     newHtml.push(line);
                 }
            }
        }
    }
    if (inList) newHtml.push('</ul>');
    htmlContent = newHtml.join('\n');

    // Escape backticks and backslashes
    const safeContent = mdContent.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
    const safeHtmlContent = htmlContent.replace(/\\/g, '\\\\').replace(/`/g, '\\`');

    const fileContent = `export const RELEASES_MD = \`${safeContent}\`;\nexport const RELEASES_HTML = \`${safeHtmlContent}\`;\n`;
    fs.writeFileSync(outputPath, fileContent);
    console.log('✅ Generated src/releases.js from RELEASES.md');
} else {
    console.error("RELEASES.md still does not exist.");
}

