// Macro Name: Setup Auto-Encounter
// Description: Automatically adds non-player tokens as hidden combatants
//     and sets all initiative silently (true silent: no dice animations),
//     then adds player tokens to the tracker and adds them as well.
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
        
        // 4. Roll NPC initiative with Math.random to avoid ALL dice animations
        // By bypassing the Roll class entirely, we ensure no 3D dice modules are triggered.
        const npcUpdates = [];
        for (const c of createdCombatants) {
            const d20 = Math.floor(Math.random() * 20) + 1;
            const bonus = c.actor?.system?.attributes?.init?.total ?? 0;
            npcUpdates.push({ _id: c.id, initiative: d20 + bonus });
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

        // 6. Roll Player initiative with Math.random to avoid ALL dice animations
        const playerUpdates = [];
        for (const c of createdPlayerCombatants) {
            const d20 = Math.floor(Math.random() * 20) + 1;
            const bonus = c.actor?.system?.attributes?.init?.total ?? 0;
            playerUpdates.push({ _id: c.id, initiative: d20 + bonus });
        }
        await combat.updateEmbeddedDocuments("Combatant", playerUpdates);

        ui.notifications.info(`Added and silently set initiative for ${playerTokens.length} Players.`);
    }
})();




