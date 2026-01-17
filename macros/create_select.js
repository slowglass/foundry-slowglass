// Icon: Module tools/drafting-compass.png
// Get the currently selected token
const selectedToken = canvas.tokens.controlled[0];

if (!selectedToken) {
    ui.notifications.error("Please select a token first.");
} else {
    const tokenName = selectedToken.name;
    const tokenImage = selectedToken.document.texture.src;

    // Check if a macro with this name already exists
    const existingMacro = game.macros.find(m => m.name === tokenName);
    if (existingMacro) {
        ui.notifications.warn(`A macro named "${tokenName}" already exists.`);
    } else {
        // Create the macro command that calls the Select macro with the token name
        const macroCommand = `game.macros.getName("Select").execute({ name: "${tokenName}" });`;

        // Create the macro
        Macro.create({
            name: tokenName,
            type: "script",
            img: tokenImage,
            command: macroCommand,
            flags: {}
        }).then(macro => {
            ui.notifications.info(`Macro "${tokenName}" created successfully!`);
        });
    }
}
