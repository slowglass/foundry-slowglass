// Macro Name: Mythic Encounter Setup
// Description: Adds "Villian Action" and "Mythic Action" tokens to the combat tracker and scene.
// Icon: Module other/encounter-action.png

/**
 * BBEG Fight Setup (V12)
 * - Adds "Villian Action" at 480, 0.
 * - Adds "Lair Action" at 560, 0.
 */

(async () => {
    // Special Actions Config with Coordinates
    const specialActions = [
        { name: "Villian Action", initiative: 20.9999, x: 0, y: 0 },
        { name: "Mythic Action", initiative: 10, x: 300, y: 0 }
    ];

    if (!game.combat) {
        ui.notifications.warn("No active combat! 'Special Actions' were NOT added.");
        return;
    }

    // --- DIALOG FOR VISIBILITY ---
    let content = `<p>Choose which actions should be <b>Invisible</b> on the map and hidden in the combat tracker:</p>`;
    for (let action of specialActions) {
        let safeId = action.name.replace(/\s+/g, '-').toLowerCase();
        content += `
        <div class="form-group" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
            <label for="hide-${safeId}">${action.name}</label>
            <input type="checkbox" id="hide-${safeId}" name="${action.name}" style="margin-left: 10px;">
        </div>`;
    }

    new Dialog({
        title: "Setup Special Actions",
        content: `<form>${content}</form>`,
        buttons: {
            setup: {
                icon: '<i class="fas fa-check"></i>',
                label: "Add Actions",
                callback: async (html) => {
                    const scene = canvas.scene;
                    for (let action of specialActions) {
                        let safeId = action.name.replace(/\s+/g, '-').toLowerCase();
                        const isHidden = html.find(`#hide-${safeId}`).is(':checked');

                        const actionActor = game.actors.getName(action.name);
                        if (!actionActor) {
                            ui.notifications.error(`Actor '${action.name}' not found in the sidebar!`);
                            continue;
                        }

                        // Create the Token (Setting visibility based on check)
                        const tokenDoc = await actionActor.getTokenDocument({
                            x: action.x,
                            y: action.y,
                            hidden: isHidden
                        });

                        const [deployedToken] = await scene.createEmbeddedDocuments("Token", [tokenDoc.toObject()]);

                        // Add to Combat Tracker (Setting visibility based on check)
                        const [combatant] = await game.combat.createEmbeddedDocuments("Combatant", [{
                            tokenId: deployedToken.id,
                            actorId: actionActor.id,
                            hidden: isHidden
                        }]);

                        // Set Initiative
                        await game.combat.updateEmbeddedDocuments("Combatant", [{
                            _id: combatant.id,
                            initiative: action.initiative
                        }]);
                    }
                    ui.notifications.info("Special Actions added to the scene and tracker.");
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel"
            }
        },
        default: "setup",
        render: (html) => {
            // Optional: style the dialog to look a bit nicer
            html.closest('.app').css('width', '300px');
        }
    }).render(true);

})();
