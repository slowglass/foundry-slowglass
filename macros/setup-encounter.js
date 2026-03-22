// Macro Name: Setup Auto-Encounter
// Description: Automatically adds non-player tokens as hidden combatants
//     and sets all initiative silently (no chat messages or dice animations),
//     then adds player tokens to the tracker and rolls for them as well.
// Icon: Module other/setup-encounter.png

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
        
        // 4. Roll NPC initiative manually to avoid all UI (chat and 3D dice)
        const npcUpdates = [];
        for (const c of createdCombatants) {
            const roll = await c.getInitiativeRoll();
            await roll.evaluate();
            npcUpdates.push({ _id: c.id, initiative: roll.total });
        }
        await combat.updateEmbeddedDocuments("Combatant", npcUpdates);
        
        ui.notifications.info(`Added and silently set initiative for ${npcTokens.length} NPCs.`);
    } else {
        ui.notifications.info("No un-tracked NPCs found to add.");
    }

    // 5. Add Players to the tracker
    if (playerTokens.length > 0) {
        const playerData = playerTokens.map(t => ({
            tokenId: t.id,
            sceneId: canvas.scene.id,
            actorId: t.actor.id,
            hidden: false
        }));

        const createdPlayerCombatants = await combat.createEmbeddedDocuments("Combatant", playerData);

        // 6. Roll Player initiative manually to avoid all UI (chat and 3D dice)
        const playerUpdates = [];
        for (const c of createdPlayerCombatants) {
            const roll = await c.getInitiativeRoll();
            await roll.evaluate();
            playerUpdates.push({ _id: c.id, initiative: roll.total });
        }
        await combat.updateEmbeddedDocuments("Combatant", playerUpdates);

        ui.notifications.info(`Added and silently set initiative for ${playerTokens.length} Players.`);
    }
})();



