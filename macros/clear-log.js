// Icon: Module tools/eraser-vintage.png
/**
 * Macro: Clear Old Chat Logs
 * Description: Clears chat logs older than a specified number of months.
 */

(async () => {
    // Configuration
    const MONTHS_TO_KEEP = 3;

    // Calculate the cutoff timestamp
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - MONTHS_TO_KEEP);
    const cutoffTimestamp = cutoffDate.getTime();

    // Find messages to delete
    // game.messages is a Collection of ChatMessage documents
    const messagesToDelete = game.messages.filter(m => m.timestamp < cutoffTimestamp).map(m => m.id);

    if (messagesToDelete.length === 0) {
        ui.notifications.info(`No chat messages older than ${MONTHS_TO_KEEP} months found.`);
        return;
    }

    // Optional: Confirmation Dialog
    // Remove the Dialog part if you want this to run silently/automatically
    new Dialog({
        title: "Clear Old Logs",
        content: `<p>Found <strong>${messagesToDelete.length}</strong> messages older than ${MONTHS_TO_KEEP} months.</p><p>Are you sure you want to delete them? This cannot be undone.</p>`,
        buttons: {
            yes: {
                icon: '<i class="fas fa-trash"></i>',
                label: "Delete",
                callback: async () => {
                    await ChatMessage.deleteDocuments(messagesToDelete);
                    ui.notifications.info(`Deleted ${messagesToDelete.length} old chat messages.`);
                }
            },
            no: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel"
            }
        },
        default: "no"
    }).render(true);
})();
