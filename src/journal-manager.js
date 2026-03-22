import { RELEASES_MD, RELEASES_HTML } from "./releases.js";

/**
 * Manages the creation and maintenance of module-specific journal entries.
 */
export class JournalManager {
  static _isInitializing = false;

  /**
   * Initializes the JournalManager.
   * Called during the Foundry 'ready' hook.
   */
  static async init() {
    if (this._isInitializing) return;
    this._isInitializing = true;

    try {
      await this._ensureJournalsExist();
    } catch (error) {
      console.error("Foundry-Slowglass | JournalManager init failed:", error);
    } finally {
      this._isInitializing = false;
    }
  }

  /**
   * Orchestrates the creation and updating of required journals.
   */
  static async _ensureJournalsExist() {
    // Both GMs and Players try to open, but only GMs can create/update
    if (!game.user.isGM) {
      console.log("Foundry-Slowglass | Player detected, opening journals if they exist.");
      this._openJournal("Foundry-Slowglass", "Releases");
      return;
    }

    console.log("Foundry-Slowglass | GM detected, verifying journal setup.");
    await this._setupFoundrySlowglassJournal();

    this._openJournal("Foundry-Slowglass", "Releases");
  }

  /**
   * Sets up the module-specific journal with release notes.
   */
  static async _setupFoundrySlowglassJournal() {
    const name = "Foundry-Slowglass";
    let journal = game.journal.getName(name);

    if (!journal) {
      console.log(`Foundry-Slowglass | Creating new journal "${name}"`);
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
              content: "<p>Contains a list of all the changes made per release.</p>",
              format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML
            }
          },
          {
            name: "Releases",
            type: "text",
            text: {
              content: RELEASES_HTML,
              markdown: RELEASES_MD,
              format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML
            }
          }
        ]
      };
      journal = await JournalEntry.create(journalData);
    } else {
      // Journal exists, verify ownership and content
      let updateNeeded = false;
      const updates = {};

      if ((journal.ownership.default ?? 0) < CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER) {
        console.log(`Foundry-Slowglass | Updating permissions for "${name}"`);
        updates["ownership.default"] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
        updateNeeded = true;
      }

      if (updateNeeded) {
        await journal.update(updates);
      }

      // Sync the main page content
      const mainPage = journal.pages.find(p => p.name === name);
      const expectedMainContent = "<p>Contains a list of all the changes made per release.</p>";
      if (mainPage && mainPage.text?.content !== expectedMainContent) {
        console.log(`Foundry-Slowglass | Updating main page content to remove legacy instructions.`);
        await journal.updateEmbeddedDocuments("JournalEntryPage", [{
          _id: mainPage.id,
          text: { content: expectedMainContent, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML }
        }]);
      }

      // Ensure the Pre-Release page is removed if it was accidentally created
      const preReleasePage = journal.pages.find(p => p.name === "Pre-Release");
      if (preReleasePage) {
        console.log(`Foundry-Slowglass | Removing deprecated "Pre-Release" page...`);
        await preReleasePage.delete();
      }

      // Sync the Releases page
      const releasesPage = journal.pages.find(p => p.name === "Releases");
      if (releasesPage) {
        const currentContent = releasesPage.text?.content;
        const currentFormat = releasesPage.text?.format;
        const targetFormat = CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML;

        // Only update if content or format has changed to avoid unnecessary database hits
        if (currentContent !== RELEASES_HTML || currentFormat !== targetFormat) {
          console.log(`Foundry-Slowglass | Content mismatch in "Releases" page. Updating sync...`);
          try {
            await journal.updateEmbeddedDocuments("JournalEntryPage", [{
              _id: releasesPage.id,
              text: {
                content: RELEASES_HTML,
                markdown: RELEASES_MD,
                format: targetFormat
              }
            }]);
            console.log(`Foundry-Slowglass | "Releases" journal page successfully synchronized.`);

            // If the sheet is open, re-render it
            if (journal.sheet.rendered) journal.sheet.render(false);
          } catch (err) {
            console.error(`Foundry-Slowglass | Failed to update "Releases" journal page:`, err);
          }
        } else {
          console.log(`Foundry-Slowglass | "Releases" journal page is already up to date.`);
        }
      } else {
        console.log(`Foundry-Slowglass | "Releases" page missing from journal. Creating it...`);
        await JournalEntryPage.create({
          name: "Releases",
          type: "text",
          text: {
            content: RELEASES_HTML,
            markdown: RELEASES_MD,
            format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML
          }
        }, { parent: journal });
      }
    }
  }


  /**
   * Opens the specified journal sheet for the user.
   */
  static _openJournal(name, pageName = null) {
    const journal = game.journal.getName(name);
    if (journal) {
      let renderOptions = {};
      if (pageName) {
        const page = journal.pages.find(p => p.name === pageName);
        if (page) renderOptions = { pageId: page.id };
      }

      // Ensure the sheet is rendered
      if (!journal.sheet.rendered) {
        journal.sheet.render(true, renderOptions);
      } else if (renderOptions.pageId && journal.sheet.goToPage) {
        journal.sheet.goToPage(renderOptions.pageId);
      }
    } else {
      console.warn(`Foundry-Slowglass | Cannot open journal "${name}" - not found.`);
    }
  }
}
