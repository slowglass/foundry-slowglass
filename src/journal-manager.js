import { RELEASES_MD } from "./releases.js";

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

    await this._setupFoundrySlowglassJournal();
    await this._setupGameJournal();

    this._openJournal("Foundry-Slowglass");
    this._openJournal("Game");
  }

  static async _setupFoundrySlowglassJournal() {
    const name = "Foundry-Slowglass";
    let journal = game.journal.getName(name);

    if (!journal) {
      console.log(`Foundry-Slowglass | Creating journal "${name}"`);
      const journalData = {
        name: name,
        ownership: {
          default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER
        },
        pages: [
          {
            name: name,
            type: "text",
            text: {
              content: "<p>Contains a list of all the changes made per release.</p><h2>pr-release</h2><p>Any changes made should be added to the pr-release section until a formal release is made.</p>",
              format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML
            }
          },
          {
            name: "Releases",
            type: "text",
            text: {
              content: RELEASES_MD,
              format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.MARKDOWN
            }
          }
        ]
      };
      journal = await JournalEntry.create(journalData);
    } else {
      let isChanged = false;
      const newOwnership = foundry.utils.deepClone(journal.ownership);

      // Ensure observer access default
      const currentOwnership = newOwnership?.default ?? 0;
      if (currentOwnership < CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER) {
        isChanged = true;
        newOwnership.default = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
      }

      if (isChanged) {
        console.log(`Foundry-Slowglass | Updating observer access for "${name}"`);
        await journal.update({ "ownership": newOwnership });
      }

      // Ensure the Releases page exists and is up to date
      const releasesPage = journal.pages.find(p => p.name === "Releases");
      if (releasesPage) {
        console.log(`Foundry-Slowglass | Updating "Releases" page (content length: ${RELEASES_MD?.length ?? 0})`);
        await releasesPage.update({
          "text.content": RELEASES_MD,
          "text.format": CONST.JOURNAL_ENTRY_PAGE_FORMATS.MARKDOWN
        });
      } else {
        console.log(`Foundry-Slowglass | Creating "Releases" page`);
        await JournalEntryPage.create({
          name: "Releases",
          type: "text",
          text: {
            content: RELEASES_MD,
            format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.MARKDOWN
          }
        }, { parent: journal });
      }
    }
  }

  static async _setupGameJournal() {
    const name = "Game";
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
            content: "<p>Game journal</p>",
            format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML
          }
        }]
      };
      journal = await JournalEntry.create(journalData);
    } else {
      let isChanged = false;
      const newOwnership = foundry.utils.deepClone(journal.ownership);

      const currentOwnership = newOwnership?.default ?? 0;
      if (currentOwnership < CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER) {
        isChanged = true;
        newOwnership.default = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
      }

      if (isChanged) {
        console.log(`Foundry-Slowglass | Updating observer access for "${name}"`);
        await journal.update({ "ownership": newOwnership });
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
