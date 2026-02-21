// Macro Name: Import Transcripts
// Description: Imports a text transcript file into a Journal Entry within the 'Game transcripts' compendium.
// Icon: Core icons/svg/dice-target.svg

/* IMPORT TO COMPENDIUM: "Game transcripts" */

/* 1. CALCULATE DEFAULTS */
let d = new Date();
d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
let yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
let weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
let defaultYear = d.getUTCFullYear();
let defaultPageName = defaultYear + " Week " + weekNo;
let defaultJournalName = "Game Transcript";
let targetCompendiumLabel = "Game transcripts";

new Dialog({
  title: "Import Transcript to Compendium",
  content: `
    <form>
      <div class="form-group">
        <label>Journal Name:</label>
        <input type="text" id="journal-name" value="${defaultJournalName}">
      </div>
      <div class="form-group">
        <label>Page Name:</label>
        <input type="text" id="page-name" value="${defaultPageName}">
      </div>
      <div class="form-group">
        <label>Select File:</label>
        <input type="file" id="file-upload" accept=".txt">
      </div>
      <p><i>Target Compendium: <strong>${targetCompendiumLabel}</strong></i></p>
    </form>
    `,
  buttons: {
    import: {
      icon: `<i class="fas fa-file-import"></i>`,
      label: "Import",
      callback: async (html) => {
        const fileInput = html.find("#file-upload")[0];
        const journalName = html.find("#journal-name").val();
        const pageName = html.find("#page-name").val();
        const file = fileInput.files[0];

        if (!file) return ui.notifications.warn("No file selected.");
        if (!journalName || !pageName) return ui.notifications.warn("Journal and Page names are required.");

        /* 2. FIND COMPENDIUM */
        // We look for the pack by its visible label "Game transcripts"
        const pack = game.packs.find(p => p.metadata.label === targetCompendiumLabel);

        if (!pack) {
          return ui.notifications.error("Could not find a Compendium named '" + targetCompendiumLabel + "'");
        }

        if (pack.locked) {
          return ui.notifications.warn("The Compendium '" + targetCompendiumLabel + "' is Locked. Please right-click it and 'Toggle Edit Lock' first.");
        }

        /* 3. SEARCH INSIDE COMPENDIUM */
        // We must ensure the index is loaded to search it
        await pack.getIndex();
        let entryIndex = pack.index.find(i => i.name === journalName);
        let targetJournal = null;

        if (entryIndex) {
          // Fetch the full document from the compendium
          targetJournal = await pack.getDocument(entryIndex._id);

          // Check for Duplicate Page
          let existingPage = targetJournal.pages.find(p => p.name === pageName);
          if (existingPage) {
            return ui.notifications.error("Error: A page named '" + pageName + "' already exists in the Compendium Journal.");
          }
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            /* --- PARSING LOGIC (SAFE MODE) --- */
            let text = e.target.result;
            let cleanText = "";
            let splitTag = "[" + "source:";
            let parts = text.split(splitTag);

            cleanText = parts[0];
            for (let i = 1; i < parts.length; i++) {
              let chunk = parts[i];
              let endBracket = chunk.indexOf("]");
              if (endBracket !== -1) {
                cleanText += chunk.substring(endBracket + 1);
              } else {
                cleanText += chunk;
              }
            }

            let lines = cleanText.split("\n");
            let mergedLines = [];

            for (let i = 0; i < lines.length; i++) {
              let l = lines[i].trim();
              if (l.length > 0) mergedLines.push(l);
            }
            lines = mergedLines;
            mergedLines = [];

            for (let i = 0; i < lines.length; i++) {
              let current = lines[i];
              if (current.endsWith("|") && i < lines.length - 1) {
                mergedLines.push(current + " " + lines[i + 1]);
                i++;
              } else {
                mergedLines.push(current);
              }
            }
            lines = mergedLines;

            let rows = [];
            let currentSpeaker = "";
            let currentTime = "";
            let currentBuffer = [];

            for (let i = 0; i < lines.length; i++) {
              let line = lines[i];
              let splitParts = line.split("|");
              let isHeader = false;

              if (splitParts.length === 2) {
                let p2 = splitParts[1].trim();
                if (p2.includes(":") && p2.length < 10) isHeader = true;
              }

              if (isHeader) {
                if (currentSpeaker) {
                  rows.push({ s: currentSpeaker, t: currentTime, d: currentBuffer.join("<br>") });
                }
                currentSpeaker = splitParts[0].trim();
                currentTime = splitParts[1].trim();
                currentBuffer = [];
              } else {
                currentBuffer.push(line);
              }
            }

            if (currentSpeaker) {
              rows.push({ s: currentSpeaker, t: currentTime, d: currentBuffer.join("<br>") });
            }

            let tableHTML = `<table border="1" style="width:100%"><thead><tr><td style="width:137px"><strong>Speaker</strong></td><td style="width:66px"><strong>Time</strong></td><td><strong>Transcript</strong></td></tr></thead><tbody>`;

            for (let i = 0; i < rows.length; i++) {
              let r = rows[i];
              tableHTML += `<tr><td><p><strong>${r.s}</strong></p></td><td><p>${r.t}</p></td><td><p>${r.d}</p></td></tr>`;
            }
            tableHTML += "</tbody></table>";

            /* --- SAVING TO COMPENDIUM LOGIC --- */
            if (targetJournal) {
              // Update existing Compendium Entry
              await targetJournal.createEmbeddedDocuments("JournalEntryPage", [{
                name: pageName,
                type: "text",
                text: { content: tableHTML, format: 1 }
              }]);
              ui.notifications.info("Updated Journal inside Compendium '" + targetCompendiumLabel + "'.");
            } else {
              // Create New Entry directly inside Compendium
              // We use the {pack: ...} option to force it into the compendium
              await JournalEntry.create({
                name: journalName,
                pages: [{
                  name: pageName,
                  type: "text",
                  text: { content: tableHTML, format: 1 }
                }]
              }, { pack: pack.collection });

              ui.notifications.info("Created new Journal inside Compendium '" + targetCompendiumLabel + "'.");
            }

          } catch (err) {
            console.error(err);
            ui.notifications.error(err.message);
          }
        };
        reader.readAsText(file);
      }
    }
  },
  default: "import"
}).render(true);