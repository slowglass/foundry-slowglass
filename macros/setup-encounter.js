// Macro Name: Silent Setup Encounter
// Description: Automatically adds non-player tokens as hidden combatants
//     and sets all initiative silently via pre-calculation to avoid
//     all dice animations and chat messages.
// Icon: Module other/setup-encounter.png

(async () => {
    // 1. Get or create encounter
    let combat = game.combat;
    if (!combat) {
        combat = await Combat.create({ scene: canvas.scene.id, active: true });
        ui.notifications.info("Created new Combat Encounter.");
    }

    // 2. Identify tokens not already in combat
    const tokens = canvas.tokens.placeables.filter(t => t.actor && !t.inCombat);
    const playerTokens = [];
    const npcTokens = [];

    for (const t of tokens) {
        if (t.actor.hasPlayerOwner) {
            playerTokens.push(t);
        } else {
            npcTokens.push(t);
        }
    }

    /**
     * Helper to pre-calculate initiative without triggering any Roll hooks
     * This avoids Dice So Nice and any system auto-rollers.
     */
    const getSilentInitData = (token, isHidden) => {
        const d20 = Math.floor(Math.random() * 20) + 1;
        const bonus = token.actor?.system?.attributes?.init?.total ?? 0;
        return {
            tokenId: token.id,
            sceneId: canvas.scene.id,
            actorId: token.actor.id,
            hidden: isHidden,
            initiative: d20 + bonus
        };
    };

    // 3. Add NPCs (Hidden and with pre-set initiative)
    if (npcTokens.length > 0) {
        const npcData = npcTokens.map(t => getSilentInitData(t, true));
        await combat.createEmbeddedDocuments("Combatant", npcData);
        ui.notifications.info(`Added ${npcTokens.length} hidden NPCs with silent initiative.`);
    }

    // 4. Add Players (Public and with pre-set initiative)
    if (playerTokens.length > 0) {
        const playerData = playerTokens.map(t => getSilentInitData(t, false));
        await combat.createEmbeddedDocuments("Combatant", playerData);
        ui.notifications.info(`Added ${playerTokens.length} Players with silent initiative.`);
    }

    if (npcTokens.length === 0 && playerTokens.length === 0) {
        ui.notifications.info("No un-tracked tokens found to add.");
    }
})();





