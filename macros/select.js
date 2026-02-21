// Macro Name: Select Token
// Description: Selects a token on the current scene by name.
// Icon: Module navigational/pointing-hand.png

const CHARACTER_NAME = scope.name;
const characterToken = canvas.tokens.placeables.find(t => t.name === CHARACTER_NAME);
if (characterToken) {
    canvas.tokens.releaseAll();
    characterToken.control({ releaseOthers: true });
    canvas.animatePan({
        x: characterToken.center.x,
        y: characterToken.center.y,
        scale: 1.0,
        duration: 500
    });
    ui.notifications.info(`${CHARACTER_NAME} selected!`);
} else {
    ui.notifications.error(`Token with name "${CHARACTER_NAME}" not found on the scene.`);
}
