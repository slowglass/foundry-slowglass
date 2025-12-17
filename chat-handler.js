export class ChatHandler {
    constructor() {
        this.registerContextOptions();
    }

    registerContextOptions() {
        // Attempt 1: getChatMessageContextOptions (Standard V13 Document pattern)
        Hooks.on("getChatMessageContextOptions", (html, options) => {
            this._addOption(options); // Use helper to add option
        });

        // Attempt 2: getChatLogEntryContext (Legacy V12)
        Hooks.on("getChatLogEntryContext", (html, options) => {
            this._addOption(options);
        });
    }

    _addOption(options) {
        // Avoid duplicates
        if (options.find(o => o.name === "slowglass.deleteFuture")) return;

        options.push({
            name: "slowglass.deleteFuture",
            icon: '<i class="fas fa-trash"></i>',
            condition: (li) => {
                // V13 Passing HTMLElement, V12 passing jQuery
                // Handle both cases
                const element = (li instanceof HTMLElement) ? li : li[0];
                const messageId = element.dataset.messageId;
                const message = game.messages.get(messageId);

                return game.user.isGM && message;
            },
            callback: (li) => this._onDeleteFuture(li)
        });

        options.push({
            name: "slowglass.archiveChat",
            icon: '<i class="fas fa-book-open"></i>',
            condition: (li) => {
                const element = (li instanceof HTMLElement) ? li : li[0];
                const messageId = element.dataset.messageId;
                const message = game.messages.get(messageId);
                return game.user.isGM && message;
            },
            callback: (li) => this._onArchiveChat(li)
        });
    }

    async _onDeleteFuture(li) {
        const element = (li instanceof HTMLElement) ? li : li[0];
        const messageId = element.dataset.messageId;
        const message = game.messages.get(messageId);
        if (!message) return;

        // Confirm deletion
        const confirm = await foundry.applications.api.DialogV2.confirm({
            window: { title: game.i18n.localize("slowglass.deleteFuture") },
            content: `<p>${game.i18n.localize("slowglass.deleteFutureConfirm")}</p>`,
            rejectClose: false,
            modal: true
        });

        if (!confirm) return;

        // Find all messages newer than or equal to this one
        // Messages are sorted by timestamp usually, but we can rely on timestamp for "newer"
        // However, Foundry store might not guarantee order in .contents if not sorted, 
        // but usually game.messages.contents is sorted by creation time? 
        // Actually, safest is to filter by timestamp >= message.timestamp
        // But if multiple messages have same timestamp, we might want to be careful.
        // Let's use timestamp.

        const timestamp = message.timestamp;

        // We want to delete this message and all messages that were created AFTER it.
        // We should strictly use > timestamp for "future" or >= for "this and future".
        // Requirement: "delete the card and all newer cards".

        const messagesToDelete = game.messages.filter(m => m.timestamp >= timestamp);
        const idsToDelete = messagesToDelete.map(m => m.id);

        if (idsToDelete.length > 0) {
            await ChatMessage.deleteDocuments(idsToDelete);
            ui.notifications.info(`Deleted ${idsToDelete.length} messages.`);
        }
    }

    async _onArchiveChat(li) {
        // 1. Sort all messages by timestamp
        const messages = game.messages.contents.sort((a, b) => a.timestamp - b.timestamp);

        if (messages.length === 0) {
            ui.notifications.warn("No messages to archive.");
            return;
        }

        // 2. Group messages by Day (YYYY-MM-DD)
        const messagesByDay = {};
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

        for (const message of messages) {
            const date = new Date(message.timestamp);
            const dateStr = date.toISOString().split('T')[0];

            // Skip messages from today
            if (dateStr === todayStr) continue;

            if (!messagesByDay[dateStr]) {
                messagesByDay[dateStr] = [];
            }
            messagesByDay[dateStr].push(message);
        }

        const daysToArchive = Object.keys(messagesByDay).sort();

        if (daysToArchive.length === 0) {
            ui.notifications.info("No messages to archive (skipping today's messages).");
            return;
        }

        // 3. Find or Create "Game Logs" Compendium
        const compendiumLabel = "Game Logs";
        let pack = game.packs.find(p => p.metadata.label === compendiumLabel);

        if (!pack) {
            try {
                pack = await CompendiumCollection.createCompendium({
                    label: compendiumLabel,
                    type: "JournalEntry"
                });
            } catch (err) {
                ui.notifications.error(`Could not create Compendium "${compendiumLabel}": ${err.message}`);
                return;
            }
        }

        if (pack.locked) {
            ui.notifications.warn(`Compendium "${compendiumLabel}" is locked. Cannot archive chat.`);
            return;
        }

        let archivedCount = 0;

        // Helper to format month folder name: "04: April"
        const getMonthFolderName = (date) => {
            const monthNum = String(date.getMonth() + 1).padStart(2, '0');
            const monthName = date.toLocaleString('default', { month: 'long' });
            return `${monthNum}: ${monthName}`;
        };

        // Cache folders to avoid repeated lookups
        const folderCache = {};

        // Helper to find or create folder in compendium
        const getOrCreateFolder = async (name, parentId = null) => {
            const cacheKey = `${parentId || 'root'}_${name}`;
            if (folderCache[cacheKey]) return folderCache[cacheKey];

            // Note: In V11+, compendium folders are accessed via pack.folders
            const existing = pack.folders.find(f => f.name === name && f.folder?.id === (parentId || undefined) && f.folder === (parentId ? null : undefined)); // Logic for parent check is tricky with null/undefined.
            // Simplified check:
            const existingFolder = pack.folders.find(f => f.name === name && (parentId ? f.folder?.id === parentId : !f.folder));

            if (existingFolder) {
                folderCache[cacheKey] = existingFolder;
                return existingFolder;
            }

            const folderData = {
                name: name,
                type: "JournalEntry",
                pack: pack.collection,
                folder: parentId
            };

            const newFolder = await Folder.create(folderData, { pack: pack.collection });
            folderCache[cacheKey] = newFolder;
            return newFolder;
        };

        for (const dayStr of daysToArchive) {
            const dayMessages = messagesByDay[dayStr];
            const dateObj = new Date(dayStr);
            const year = dateObj.getFullYear().toString();
            const monthFolder = getMonthFolderName(dateObj);

            // 4. Check if Journal exists for this day
            // We search in the pack index
            const journalName = dayStr; // Name of the day
            const index = await pack.getIndex();
            const existingEntry = index.find(i => i.name === journalName);

            if (existingEntry) {
                console.log(`slowglass | Journal for ${dayStr} already exists. Skipping.`);
                continue;
            }

            // 5. Ensure Folder Structure
            const yearFolder = await getOrCreateFolder(year);
            const targetFolder = await getOrCreateFolder(monthFolder, yearFolder.id);

            // 6. Generate Content for 3 Pages
            let contentAll = '<ol class="chat-log slowglass-chat-archive">';
            let contentGM = '<ol class="chat-log slowglass-chat-archive">';
            let contentLogs = '<ol class="chat-log slowglass-chat-archive">';

            for (const message of dayMessages) {
                try {
                    const html = await message.renderHTML();
                    if (!html) continue;

                    // --- Processing Logic (Clean up buttons, headers, etc) ---
                    // Copied and adapted from previous version

                    // 1. Remove Buttons
                    const buttonsToRemove = html.querySelectorAll('.card-button, button, .card-buttons');
                    buttonsToRemove.forEach(btn => btn.remove());

                    // 2. Simplify Dice Rolls
                    const diceElementsToRemove = html.querySelectorAll('.dice-formula, .dice-tooltip, .dice-toolkit-collapser');
                    diceElementsToRemove.forEach(el => el.remove());

                    // 3. Force Styles
                    const forceColor = (el) => {
                        el.style.setProperty("color", "#191813", "important");
                        el.style.setProperty("text-shadow", "none", "important");
                    };
                    forceColor(html); // Main element
                    html.querySelectorAll('*').forEach(el => forceColor(el)); // All children

                    // 4. Replace Headers with Divs
                    const headers = html.querySelectorAll('h1, h2, h3, h4, h5, h6');
                    for (const header of headers) {
                        const div = document.createElement('div');
                        while (header.firstChild) div.appendChild(header.firstChild);
                        div.className = header.className;
                        div.style.cssText = header.style.cssText;
                        div.classList.add('archived-header');
                        div.style.fontWeight = 'bold';
                        div.style.display = 'block';

                        // Restore icon alignment if needed
                        if (div.querySelector('img')) {
                            div.style.display = 'flex';
                            div.style.alignItems = 'center';
                            div.style.gap = '5px';
                        }
                        header.parentNode.replaceChild(div, header);
                    }

                    const htmlString = html.outerHTML;

                    // Append to "All"
                    contentAll += htmlString;

                    // Append to "GM"
                    contentGM += htmlString;

                    // Append to "Logs" (Public only)
                    // Check visibility logic: simple check for whisper/blind
                    const isWhisper = message.whisper.length > 0;
                    const isBlind = message.blind;

                    if (!isWhisper && !isBlind) {
                        contentLogs += htmlString;
                    }

                } catch (err) {
                    console.error("slowglass | Failed to render message", message.id, err);
                }
            }

            contentAll += '</ol>';
            contentGM += '</ol>';
            contentLogs += '</ol>';

            // 7. Create Journal Entry
            const newJournal = await JournalEntry.create({
                name: journalName,
                folder: targetFolder.id
            }, { pack: pack.collection });

            // 8. Create Pages
            await newJournal.createEmbeddedDocuments("JournalEntryPage", [
                {
                    name: "All",
                    text: { content: contentAll },
                    type: "text",
                    format: 1
                },
                {
                    name: "GM",
                    text: { content: contentGM },
                    type: "text",
                    format: 1
                },
                {
                    name: "Logs",
                    text: { content: contentLogs },
                    type: "text",
                    format: 1
                }
            ]);

            archivedCount++;
        }

        if (archivedCount > 0) {
            ui.notifications.info(`Archived chat for ${archivedCount} days.`);
        } else {
            ui.notifications.info("No new days to archive.");
        }
    }
}
