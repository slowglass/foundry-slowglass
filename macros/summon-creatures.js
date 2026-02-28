// Macro Name: Summon Creatures
// Description: Summons a specified number of creatures from a compendium near the selected token.
// Icon: Core icons/magic/nature/wolf-paw-glow-large-green.webp

(async () => {
    // Configuration - Change this UUID to point to the Tiger (or any other creature) in your Compendium
    const SUMMON_UUID = "Compendium.dnd5e.monsters.Actor.b9yP41l21OqBheN0"; // Example: D&D5e SRD Tiger

    // Ensure we have a token selected to spawn near
    const summoner = canvas.tokens.controlled[0];
    if (!summoner) {
        ui.notifications.warn("Please select your token first to determine the summon location.");
        return;
    }

    // Get the actor you want to summon
    const summonActor = await fromUuid(SUMMON_UUID);
    if (!summonActor) {
        ui.notifications.error(`Could not find a creature with UUID: ${SUMMON_UUID}`);
        return;
    }

    // Ask how many creatures to summon
    new Dialog({
        title: `Summon ${summonActor.name}`,
        content: `
            <form>
                <div class="form-group">
                    <label>Number to summon:</label>
                    <input type="number" id="summon-count" value="1" min="1" max="20" autofocus>
                </div>
            </form>
        `,
        buttons: {
            summon: {
                icon: '<i class="fas fa-paw"></i>',
                label: "Summon",
                callback: async (html) => {
                    const count = parseInt(html.find('#summon-count').val()) || 1;

                    // Prepare the base token data from the actor
                    const tokenDoc = await summonActor.getTokenDocument();
                    const tokenData = tokenDoc.toObject();

                    const spawns = [];

                    // Simple placement logic: distribute them around the summoner in a grid
                    for (let i = 0; i < count; i++) {
                        // Spread them out underneath the summoner based on the grid size
                        const offsetX = (i % 3 === 0 ? 0 : (i % 3 === 1 ? 1 : -1)) * canvas.grid.size;
                        const offsetY = (Math.floor(i / 3) + 1) * canvas.grid.size;

                        spawns.push(foundry.utils.mergeObject(tokenData, {
                            x: summoner.x + offsetX,
                            y: summoner.y + offsetY,
                            hidden: false,
                            elevation: summoner.document.elevation
                        }));
                    }

                    // Attempt to create the tokens on the scene
                    try {
                        const created = await canvas.scene.createEmbeddedDocuments("Token", spawns);
                        ui.notifications.info(`Summoned ${created.length} ${summonActor.name}(s)!`);

                        // Briefly ping the map where they spawned so the player sees them
                        if (created.length > 0) {
                            canvas.ping({ x: created[0].x, y: created[0].y });
                        }
                    } catch (error) {
                        console.error(error);
                        ui.notifications.error("Failed to summon tokens. You may need 'Create Token' permissions from the GM.");
                    }
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel"
            }
        },
        default: "summon"
    }).render(true);
})();
