// Macro Name: Setup Auto-Encounter
// Description: Automatically adds non-player tokens as hidden combatants and rolls their initiative in private, then adds player tokens to the tracker.
// Icon: Core icons/svg/combat.svg

(async () => {
    // 1. Get or create encounter
    let combat = game.combat;
    if (!combat) {
        combat = await Combat.create({ scene: canvas.scene.id, active: true });
        ui.notifications.info("Created new Combat Encounter.");
    }

    // 2. Identify tokens
    const tokens = canvas.tokens.placeables.filter(t => t.actor);
    const playerTokens = [];
    const npcTokens = [];

    // Separate tokens based on player ownership
    for (const t of tokens) {
        // Skip tokens already in this combat encounter
        if (t.inCombat) continue;

        if (t.actor.hasPlayerOwner) {
            playerTokens.push(t);
        } else {
            npcTokens.push(t);
        }
    }

    // 3. Add NPCs as hidden
    if (npcTokens.length > 0) {
        const npcData = npcTokens.map(t => ({
            tokenId: t.id,
            sceneId: canvas.scene.id,
            actorId: t.actor.id,
            hidden: true
        }));

        const createdCombatants = await combat.createEmbeddedDocuments("Combatant", npcData);
        const npcCombatantIds = createdCombatants.map(c => c.id);

        // 4. Roll NPC initiative in private
        // Using "gmroll" makes the roll only visible to the GM
        await combat.rollInitiative(npcCombatantIds, {
            messageOptions: { rollMode: "gmroll" }
        });
        ui.notifications.info(`Added and rolled initiative for ${npcTokens.length} hidden NPCs.`);
    } else {
        ui.notifications.info("No un-tracked NPCs found to add.");
    }

    // 5. Add Players to the tracker (not hidden)
    if (playerTokens.length > 0) {
        const playerData = playerTokens.map(t => ({
            tokenId: t.id,
            sceneId: canvas.scene.id,
            actorId: t.actor.id,
            hidden: false
        }));

        await combat.createEmbeddedDocuments("Combatant", playerData);
        ui.notifications.info(`Added ${playerTokens.length} Players to the tracker.`);
    }
})();
