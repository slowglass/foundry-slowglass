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
}
