// Macro Name: GM Encounter Logs
// Description: Adds formatted notes with Harptos game-time and real-world time to a 'Logs' Journal entry.
// Icon: Module other/documents/scroll-sealed.png

const getFormattedHarptosDate = (async () => {

    // --- Helper Function: Get Ordinal Suffix (st, nd, rd, th) ---
    const getOrdinal = (day) => {
        if (day > 3 && day < 21) return 'th'; // 11th, 12th, 13th
        switch (day % 10) {
            case 1:  return 'st';
            case 2:  return 'nd';
            case 3:  return 'rd';
            default: return 'th';
        }
    };

    const datetime = game.time.components; 
    const calendar = game.time.calendar;

    // --- Defensive Check ---
    if (!datetime || !calendar || !calendar.months || typeof datetime.month === 'undefined') {
        console.error("Harptos date components are incomplete.");
        return ["ERROR: Calendar data not initialized.", "00:00:00"];
    }
    // --- End Defensive Check ---

    const day = datetime.dayOfMonth;
    const monthIndex = datetime.month;
    const year = datetime.year + 1501; 
    const monthArray = Array.from(calendar.months.values());
    const monthKey = monthArray[monthIndex]?.name;
    const monthName = monthKey ? game.i18n.localize(monthKey) : 'Unknown Month';
    const dayWithOrdinal = `${day}${getOrdinal(day)}`;
    const hour = String(datetime.hour).padStart(2, '0');
    const minute = String(datetime.minute).padStart(2, '0');
    const second = String(datetime.second).padStart(2, '0');
    
    // The required string format: "5th Kythorn 1234 DR"
    return [`${dayWithOrdinal} ${monthName} ${year} DR`, `${hour}:${minute}:${second}`];
})();

async function getMessage(text) {
   var date = new Date().toLocaleDateString();
   var time = new Date().toLocaleTimeString();
   const [gameDate, gameTime] = await getFormattedHarptosDate;
   let newContent = `<p><b>${gameTime} <i>(${time} ${date})</i></b><div style="margin-left: 25px;">`;
   let lines = text.split(/\r\n|\r|\n/);
   
    lines.forEach((line) => {
       newContent += line + '<br />';
    });
   newContent += '</div></p>';
   return [gameDate, newContent];
}

async function updateLog(text) {
  const journalName = "Logs";
  const [date, message] = await getMessage(text);
  const embeddedEntryName = date

  // Get or Create the journal entry
  let entry = game.journal.getName(journalName);
  if (!entry) {
    entry = await JournalEntry.create({ name: journalName });
    ui.notifications.info("Created 'Logs' Journal entry.");
  }

  const page = entry.pages.find(p => p.name == embeddedEntryName);
  if (page === undefined) {
   await entry.createEmbeddedDocuments("JournalEntryPage", [{
     name: embeddedEntryName,
     type: "text",
     text: {
       content: message,
       format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML
     },
     title: { show: true, level: 2}
   }]);
  } else {
    let newContent = page.text.content ? page.text.content + message : message 
    await page.update({text: {
       content: newContent,
       format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML
    }});
  }
}

let dialog = new Dialog({
  title: "GM Encounter Log Entry",
  content: `
    <form>
      <div class="form-group">
        <label for="multiline-text">Enter note:</label>
        <textarea id="multiline-text" name="multiline-text" rows="5" style="width: 100%;"></textarea>
      </div>
    </form>
  `,
  buttons: {
    submit: {
      icon: '<i class="fas fa-check"></i>',
      label: "Save Note",
      callback: (html) => {
        let text = html.find("#multiline-text").val();
        if (text) {
          updateLog(text)
        } 
      },
    }
  },
  default: "submit",
  close: () => {},
}).render(true);