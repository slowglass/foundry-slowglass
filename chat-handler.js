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

        // 2. Generate Page Name from Timestamp Range
        const formatDate = (ts) => {
            const d = new Date(ts);
            return d.toLocaleString(); // Use local format or customize as needed
        };

        const startTime = formatDate(messages[0].timestamp);
        const endTime = formatDate(messages[messages.length - 1].timestamp);
        const pageName = `${startTime} - ${endTime}`;

        // 3. Generate Content (Concatenate HTML)
        // We wrap it in a ol class="chat-log" to mimic the sidebar structure
        // hoping to inherit standard styles for .chat-message

        let content = '<ol class="chat-log slowglass-chat-archive">';
        for (const message of messages) {
            try {
                // V13: renderHTML returns Promise<HTMLElement>
                const html = await message.renderHTML();
                if (html) {
                    // 1. CLEANUP (Remove Buttons)
                    // User Request: "skip the following buttons: `Summon`, `Consume Resource`, `Refund Resource`, `Damage`, `Attack` (anything in div that has the `card-button` class"
                    const buttonsToRemove = html.querySelectorAll('.card-button, button, .card-buttons');
                    for (const btn of buttonsToRemove) {
                        btn.remove();
                    }

                    // 1b. SIMPLIFY DICE ROLLS
                    // User Request: "Please also remove divs with class='dice-formula`, `dice-toolkit-collapser` and remove the code to turn it into <summary><details>"
                    const diceElementsToRemove = html.querySelectorAll('.dice-formula, .dice-tooltip, .dice-toolkit-collapser');
                    for (const el of diceElementsToRemove) {
                        el.remove();
                    }

                    // 2. FORCE STYLING (The Nuclear Option)
                    // We iterate over element and force colors
                    const forceColor = (el) => {
                        el.style.setProperty("color", "#191813", "important");
                        el.style.setProperty("text-shadow", "none", "important");
                    };

                    // Force on main element
                    forceColor(html);

                    // 2. REPLACE HEADERS (h1-h6) with DIVs
                    // User Request: "Please remove any <h1> to <h6> tags and replace them by styled div sections instead"
                    const headers = html.querySelectorAll('h1, h2, h3, h4, h5, h6');
                    for (const header of headers) {
                        const div = document.createElement('div');
                        // Copy child nodes
                        while (header.firstChild) {
                            div.appendChild(header.firstChild);
                        }
                        // Copy classes
                        div.className = header.className;
                        // Copy styles
                        div.style.cssText = header.style.cssText;

                        // Add utility class to pretend to be a header
                        div.classList.add('archived-header');
                        div.style.fontWeight = 'bold';
                        div.style.display = 'block';

                        // FIX ICON LOCATION:
                        // System CSS often uses H3 for flex alignment of Icon + Text. 
                        // Since we changed H3 -> DIV, we lost that layout.
                        // We restore it if we detect an image inside.
                        if (div.querySelector('img')) {
                            div.style.display = 'flex';
                            div.style.alignItems = 'center';
                            div.style.gap = '5px'; // Standard gap
                        }

                        // Replace
                        header.parentNode.replaceChild(div, header);
                    }

                    // 3. RECURSIVE FORCE (The Actual Nuclear Option)
                    // The screenshot showed that dnd5e system CSS targets specific spans (.title) 
                    // which overrides inherited colors. We must visit every node.
                    const all = html.querySelectorAll('*');
                    for (const el of all) {
                        // We only want to override text color, we don't want to break layout
                        // But color and text-shadow are safe to force for a "printed" look
                        forceColor(el);
                    }

                    content += html.outerHTML;
                }
            } catch (err) {
                console.error("slowglass | Failed to render message", message.id, err);
                content += `<li class="chat-message error">Failed to render message ${message.id}</li>`;
            }
        }
        content += '</ol>';

        // 4. Find or Create "Game Chat" Journal
        const journalName = "Game Chat";
        let journal = game.journal.getName(journalName);

        if (!journal) {
            journal = await JournalEntry.create({
                name: journalName,
                folder: null // Root folder or specify one
            });
        }

        // 5. Create Journal Page
        await journal.createEmbeddedDocuments("JournalEntryPage", [{
            name: pageName,
            text: { content: content }, // V10+ data structure for text pages
            type: "text",
            format: 1 // html
        }]);

        ui.notifications.info(game.i18n.format("slowglass.archiveChatSuccess", {
            count: messages.length,
            journalName: journalName
        }));
    }
}
