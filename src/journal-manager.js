export class JournalManager {
  static init() {
    this._ensureJournalsExist();
  }

  static async _ensureJournalsExist() {
    if (!game.user.isGM) {
      this._openJournal("Foundry-Slowglass");
      this._openJournal("Game");
      return;
    }

    await this._createJournalIfNotExists(
      "Foundry-Slowglass",
      "<p>Contains a list of all the changes made per release.</p><h2>pr-release</h2><p>Any changes made should be added to the pr-release section until a formal release is made.</p>"
    );
    await this._createJournalIfNotExists("Game", "<p>Game journal</p>");

    this._openJournal("Foundry-Slowglass");
    this._openJournal("Game");
  }

  static async _createJournalIfNotExists(name, initialContent) {
    let journal = game.journal.getName(name);

    if (!journal) {
      console.log(`Foundry-Slowglass | Creating journal "${name}"`);
      const journalData = {
        name: name,
        ownership: {
          default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER
        },
        pages: [{
          name: name,
          type: "text",
          text: {
            content: initialContent,
            format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML
          }
        }]
      };
      journal = await JournalEntry.create(journalData);
    } else {
      let isChanged = false;

      // Ensure observer access default
      // default ownership is stored as an integer flag on DocumentOwnership configuration
      const currentOwnership = journal.ownership?.default ?? 0;
      if (currentOwnership < CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER) {
         isChanged = true;
      }

      if(isChanged) {
        console.log(`Foundry-Slowglass | Updating observer access for "${name}"`);
        await journal.update({ "ownership.default": CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER });
      }
    }
  }

  static _openJournal(name) {
    const journal = game.journal.getName(name);
    if (journal) {
      journal.sheet.render(true);
    } else {
      console.warn(`Foundry-Slowglass | Cannot open journal "${name}" - not found`);
    }
  }
}
