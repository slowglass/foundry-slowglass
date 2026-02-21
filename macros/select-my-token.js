// Macro Name: Select My Token
// Description: Pops up a dialog with a grid of token icons for each token the player owns in the current scene. Clicking an icon selects that token.
// Icon: Core icons/svg/dice-target.svg


const myTokens = canvas.tokens.placeables.filter(t => t.document.isOwner);

if (myTokens.length === 0) {
    ui.notifications.warn("You do not own any tokens in the current scene.");
    return;
}

// Generate the HTML for the grid of tokens
let gridHtml = `
<div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 5px; max-height: 400px; overflow-y: auto; padding: 5px; margin-bottom: 15px;">
`;

myTokens.forEach(token => {
    gridHtml += `
    <div class="token-selector-btn" data-token-id="${token.id}" 
         style="cursor: pointer; border: 1px solid #444; border-radius: 5px; padding: 2px; text-align: center; background: rgba(0,0,0,0.1);" 
         title="${token.name}">
        <img src="${token.document.texture.src}" style="width: 100%; height: auto; aspect-ratio: 1/1; object-fit: contain; border: none; display: block;" />
    </div>
    `;
});

gridHtml += `</div>`;

// Create the dialog
let d = new Dialog({
    title: "Select My Token",
    content: gridHtml,
    buttons: {
        close: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel"
        }
    },
    render: (html) => {
        // Add hover effects and click listeners
        const btns = html.find('.token-selector-btn');
        btns.hover(
            function () { $(this).css({ "background": "rgba(255,255,255,0.2)", "border-color": "#ff6400" }); },
            function () { $(this).css({ "background": "rgba(0,0,0,0.1)", "border-color": "#444" }); }
        );
        btns.click(ev => {
            const tokenId = ev.currentTarget.dataset.tokenId;
            const token = canvas.tokens.get(tokenId);
            if (token) {
                // Select the token
                token.control({ releaseOthers: true });

                // Pan the camera to the selected token
                canvas.animatePan({
                    x: token.center.x,
                    y: token.center.y,
                    scale: 1.0,
                    duration: 500
                });

                ui.notifications.info(`${token.name} selected!`);

                // Close the dialog using its title since `d.close()` isn't easily accessible inside the callback in older Foundry scopes but just to be safe:
                Object.values(ui.windows).forEach(w => {
                    if (w.title === "Select My Token") w.close();
                });
            }
        });
    }
}, { width: 350, id: "select-my-token-dialog" });

d.render(true);
