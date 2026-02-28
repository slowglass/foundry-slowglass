import { MODULE_NAME } from "./constants.js";

/**
 * WorldTreeRageHandler - Handles "Path of the World Tree" Barbarian Rage features
 * - Vitality Surge: Temp HP on Rage activation
 * - Life-Giving Force: Grant Temp HP to allies on turn start
 */
export class WorldTreeRageHandler {
    static SUBCLASS_NAME = "Path of the World Tree";
    static RANGE_FEET = 10;

    /**
     * Helper to check if an actor has the required subclass
     * @param {Actor} actor 
     * @returns {boolean}
     */
    _hasWorldTreeSubclass(actor) {
        return actor.items.some(i => i.type === "subclass" && i.name === WorldTreeRageHandler.SUBCLASS_NAME);
    }

    /**
     * Handles the activity use event (dnd5e v4+).
     * @param {object} activity - The activity being used
     * @param {object} config - usage configuration
     * @param {object} result - usage result
     */
    async onUseActivity(activity, config, result) {
        if (!activity.item) return;
        return this.onUseItem(activity.item, config, { ...result, isActivity: true });
    }

    /**
     * Handles the item use event to auto-apply Rage effect.
     * @param {Item} item - The item being used
     * @param {object} config - usage configuration
     * @param {object} options - usage options
     */
    async onUseItem(item, config, options) {
        console.log(`${MODULE_NAME} | onUseItem called for item: ${item.name}, actor: ${item.actor?.name}`);
        if (!item.actor || !this._hasWorldTreeSubclass(item.actor)) {
            console.log(`${MODULE_NAME} | Actor is not a World Tree Barbarian (Expected subclass: ${WorldTreeRageHandler.SUBCLASS_NAME}, Actual actor: ${item.actor?.name})`);
            return;
        }

        // Check if the item is "Rage"
        const itemName = item.name.toLowerCase();
        if (itemName === "rage" || itemName === "raging") {
            const isActivity = options?.isActivity === true;
            console.log(`${MODULE_NAME} | World Tree Barbarian used Rage! (Activity: ${isActivity})`);

            const alreadyRaging = this._isRaging(item.actor);

            // If it's a legacy usage (not Activity) and already raging, stop to prevent issues.
            // If it IS an Activity, we proceed because the system might have just applied the rage,
            // or the user is expending a usage to re-up/trigger features.
            if (alreadyRaging && !isActivity) {
                ui.notifications.info(`${item.actor.name} is already raging!`);
                return;
            }

            // Apply Rage effect MANUALY only if not already raging.
            // If isActivity is true, the system likely applied it (or will).
            // If isActivity is true but !alreadyRaging, we apply it just to be safe (or legacy system behavior).
            if (!alreadyRaging) {
                const effectData = {
                    name: "Rage",
                    label: "Rage",
                    icon: "icons/svg/explosion.svg", // Generic rage icon
                    origin: item.uuid,
                    disabled: false
                };

                try {
                    await item.actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
                    ui.notifications.info(`Rage effect automatically applied to ${item.actor.name}!`);
                } catch (err) {
                    console.warn(`${MODULE_NAME} | Failed to auto-apply Rage effect (might be handled by system):`, err);
                }
            } else {
                console.log(`${MODULE_NAME} | Skipping manual Rage effect application (already raging).`);
            }

            // Vitality Surge: Gain Temp HP equal to Barbarian level
            const barbarianClass = item.actor.classes?.barbarian;
            const barbarianLevel = barbarianClass?.system?.levels || 0;
            console.log(`${MODULE_NAME} | Vitality Surge Check - Actor: ${item.actor.name}, Class found: ${!!barbarianClass}, Level: ${barbarianLevel}`);

            if (barbarianLevel > 0) {
                const currentTempHP = item.actor.system.attributes.hp.temp || 0;
                console.log(`${MODULE_NAME} | Vitality Surge Check - Current Temp HP: ${currentTempHP}`);

                if (barbarianLevel > currentTempHP) {
                    try {
                        console.log(`${MODULE_NAME} | Vitality Surge: Attempting to update Temp HP to ${barbarianLevel}`);
                        const updateResult = await item.actor.update({ "system.attributes.hp.temp": barbarianLevel });
                        console.log(`${MODULE_NAME} | Vitality Surge: Update Result:`, updateResult);

                        await ChatMessage.create({
                            content: `<strong>Vitality Surge</strong>: ${item.actor.name} gains ${barbarianLevel} Temporary HP from their connection to the World Tree.`,
                            speaker: ChatMessage.getSpeaker({ actor: item.actor })
                        });
                        console.log(`${MODULE_NAME} | Vitality Surge: Applied ${barbarianLevel} Temp HP to ${item.actor.name}.`);
                    } catch (error) {
                        console.error(`${MODULE_NAME} | Vitality Surge Error: Failed to update actor or create chat message.`, error);
                    }
                } else {
                    console.log(`${MODULE_NAME} | Vitality Surge: ${item.actor.name} already has ${currentTempHP} Temp HP (Level: ${barbarianLevel}). No update needed.`);
                    ui.notifications.info(`${item.actor.name} already has ${currentTempHP} Temp HP (Vitality Surge value: ${barbarianLevel}).`);
                }
            } else {
                console.warn(`${MODULE_NAME} | Vitality Surge: Barbarian level reported as 0 or class not found.`);
            }
        } else {
            console.log(`${MODULE_NAME} | Item is not Rage (Name: ${itemName})`);
        }
    }

    async onUpdateCombat(combat, changed, options, userId) {
        // Only react to turn/round changes
        if (changed.round === undefined && changed.turn === undefined) return;

        // Get the combatant whose turn just started
        const combatant = combat.combatant;
        if (!combatant?.token) return;

        const token = combatant.token;
        const actor = combatant.actor;

        console.log(`${MODULE_NAME} | Combat update: Turn/Round change. Current turn: ${actor?.name}`);

        // Check if this is a World Tree Barbarian
        if (!actor || !this._hasWorldTreeSubclass(actor)) {
            console.log(`${MODULE_NAME} | Current combatant (${actor?.name}) is not a World Tree Barbarian, skipping.`);
            return;
        }

        console.log(`${MODULE_NAME} | World Tree Barbarian's turn detected in combat: ${actor.name}`);

        // Determine who should see the dialog:
        // - If a player owner of the actor is logged in, show only to them
        // - If no player owner is logged in, show to GM as fallback
        const playerOwners = game.users.filter(u => !u.isGM && actor.testUserPermission(u, "OWNER"));
        const hasOnlinePlayerOwner = playerOwners.some(u => u.active);

        // If there is an online player owner, we only continue if WE are that player
        // If there is NO online player owner, we continue if WE are the GM
        if (hasOnlinePlayerOwner) {
            if (game.user.isGM || !actor.isOwner) return;
        } else {
            if (!game.user.isGM) return;
        }

        console.log(`${MODULE_NAME} | ${actor.name}'s turn started, checking conditions...`);

        // Check if actor is raging
        if (!this._isRaging(actor)) {
            console.log(`${MODULE_NAME} | ${actor.name} is not raging, skipping.`);
            return;
        }

        // Find player-owned tokens within 10ft
        const nearbyPlayers = this._findNearbyPlayerTokens(token);

        if (nearbyPlayers.length === 0) {
            console.log(`${MODULE_NAME} | No player tokens within range of ${actor.name}.`);
            return;
        }

        console.log(`${MODULE_NAME} | Found ${nearbyPlayers.length} player tokens within ${WorldTreeRageHandler.RANGE_FEET}ft of ${actor.name}.`);

        // Show the selection dialog
        await this._showTempHPDialog(nearbyPlayers, actor);
    }

    /**
     * Checks if the actor is currently raging.
     * Checks multiple sources: active effects, statuses, and rage feature effects.
     * @param {Actor} actor - The actor to check
     * @returns {boolean} True if the actor is raging
     */
    _isRaging(actor) {
        // 1. Check for active effects with "rage" in the name on the actor
        const hasRageEffect = actor.effects.some(effect => {
            if (effect.disabled) return false;
            const name = (effect.name || effect.label || "").toLowerCase();
            if (name.includes("rage") || name.includes("raging")) {
                return true;
            }
            return false;
        });
        if (hasRageEffect) return true;

        // 2. Check actor statuses
        const statuses = actor.statuses;
        if (statuses) {
            for (const status of statuses) {
                if (status.toLowerCase().includes("rage")) {
                    return true;
                }
            }
        }

        // 3. Find the Rage feature and check its effects directly
        const rageFeature = actor.items.find(i => {
            const name = i.name?.toLowerCase() || "";
            return name.includes("rage") && i.type === "feat";
        });

        if (rageFeature) {
            // Check if the rage feature has effects
            if (rageFeature.effects?.size > 0) {
                for (const effect of rageFeature.effects) {
                    // If the effect on the Rage item is NOT disabled, consider it active
                    if (!effect.disabled) {
                        return true;
                    }
                }
            }

            // Check if any actor effects originated from this rage feature
            const rageUuid = rageFeature.uuid;
            const hasActiveRageOrigin = actor.effects.some(e => {
                if (e.disabled) return false;
                const matches = e.origin === rageUuid || e.origin?.includes(rageFeature.id);
                return matches;
            });
            if (hasActiveRageOrigin) return true;
        }

        return false;
    }

    /**
     * Finds all player-owned tokens within range of the source token.
     * @param {TokenDocument} sourceToken - The token to measure from
     * @returns {Array<TokenDocument>} Array of nearby player-owned tokens
     */
    _findNearbyPlayerTokens(sourceToken) {
        const scene = game.scenes.current;
        if (!scene) return [];

        const sourceCanvasToken = canvas.tokens.get(sourceToken.id);
        if (!sourceCanvasToken) return [];

        const nearbyTokens = [];

        for (const token of scene.tokens) {
            // Ensure we include the source token (self-targeting allowed)
            // if (token.id === sourceToken.id) continue; // Removed to allow self-targeting

            const tokenActor = token.actor;
            if (!tokenActor?.hasPlayerOwner) continue;

            const canvasToken = canvas.tokens.get(token.id);
            if (!canvasToken) continue;

            const distance = canvas.grid.measurePath([sourceCanvasToken.center, canvasToken.center]).distance;

            if (distance <= WorldTreeRageHandler.RANGE_FEET) {
                nearbyTokens.push(token);
            }
        }

        return nearbyTokens;
    }

    /**
     * Shows a dialog to select a player token to receive temporary HP.
     * @param {Array<TokenDocument>} tokens - The available tokens to select from
     * @param {Actor} sourceActor - The barbarian granting the HP
     */
    async _showTempHPDialog(tokens, sourceActor) {
        const tokenPortraits = tokens.map(token => {
            const imgSrc = token.texture?.src || token.actor?.img || "icons/svg/mystery-man.svg";
            return `
        <div class="token-option" data-token-id="${token.id}" title="${token.name}">
          <img src="${imgSrc}" />
          <span class="token-name">${token.name}</span>
        </div>
      `;
        }).join("");

        const content = `
      <style>
        .world-tree-rage-dialog { overflow: visible; }
        .world-tree-rage-dialog .section-label { 
          font-weight: bold; 
          display: block; 
          margin-bottom: 8px; 
          text-align: center;
        }
        .world-tree-rage-dialog .token-grid { 
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px; 
          margin-bottom: 16px;
          width: 100%;
        }
        .world-tree-rage-dialog .token-option {
          position: relative;
          cursor: pointer;
          border: 2px solid #7a7971;
          width: 80px;
          height: 100px;
          overflow: hidden;
          background: rgba(0,0,0,0.1);
          transition: all 0.2s ease;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .world-tree-rage-dialog .token-option img {
          width: 80px;
          height: 80px;
          object-fit: cover;
        }
        .world-tree-rage-dialog .token-option .token-name {
          font-size: 10px;
          text-align: center;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          width: 100%;
          padding: 2px;
        }
        .world-tree-rage-dialog .token-option:hover {
          border-color: #ff6400;
          box-shadow: 0 0 8px rgba(255, 100, 0, 0.5);
        }
        .world-tree-rage-dialog .token-option.selected {
          border: 3px solid #ff6400 !important;
          box-shadow: 0 0 12px #ff6400 !important;
        }
      </style>
      
      <div class="world-tree-rage-dialog">
        <p class="section-label">${sourceActor.name}'s Rage empowers a nearby ally!</p>
        <p class="section-label">Select a target within 10ft:</p>
        <div class="token-grid">
          ${tokenPortraits}
        </div>
      </div>
    `;

        return new Promise((resolve) => {
            new Dialog({
                title: "Life-Giving Force - Temp HP",
                content: content,
                buttons: {
                    apply: {
                        icon: '<i class="fas fa-heart"></i>',
                        label: "Grant Temp HP",
                        callback: async (html) => {
                            const selectedId = html.find('.token-option.selected').data('token-id');
                            if (!selectedId) {
                                ui.notifications.warn("No target selected.");
                                resolve(false);
                                return;
                            }

                            const targetToken = game.scenes.current.tokens.get(selectedId);
                            if (!targetToken?.actor) {
                                ui.notifications.error("Could not find target actor.");
                                resolve(false);
                                return;
                            }

                            await this._applyTempHP(targetToken.actor, sourceActor);
                            resolve(true);
                        }
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "Cancel",
                        callback: () => resolve(false)
                    }
                },
                default: "apply",
                render: (html) => {
                    const tokenGrid = html.find('.token-grid');
                    tokenGrid.on('click', '.token-option', (event) => {
                        const option = event.currentTarget;
                        tokenGrid.find('.token-option').removeClass('selected');
                        option.classList.add('selected');
                    });

                    // Pre-select the first option
                    tokenGrid.find('.token-option').first().addClass('selected');
                }
            }).render(true);
        });
    }

    /**
     * Applies temporary HP to the target actor based on source actor's rage damage.
     * @param {Actor} targetActor - The actor to receive temp HP
     * @param {Actor} sourceActor - The barbarian granting the HP
     */
    async _applyTempHP(targetActor, sourceActor) {
        // Life-Giving Force: Roll d6s equal to Rage Damage bonus
        let diceCount = 2; // Default fallback

        const rageDamage = sourceActor.system.scale?.barbarian?.["rage-damage"];
        if (rageDamage) {
            diceCount = rageDamage;
        }

        console.log(`${MODULE_NAME} | Life-Giving Force: Rolling ${diceCount}d6 (Rage Damage Bonus from ${sourceActor.name})`);
        const roll = new Roll(`${diceCount}d6`);
        await roll.evaluate();

        const tempHP = roll.total;
        const currentTempHP = targetActor.system.attributes.hp.temp || 0;

        if (tempHP > currentTempHP) {
            await targetActor.update({ "system.attributes.hp.temp": tempHP });

            await ChatMessage.create({
                content: `
          <div style="text-align: center;">
            <strong>Life-Giving Force</strong><br/>
            ${targetActor.name} gains <strong>${tempHP}</strong> temporary HP!<br/>
            <em>(Rolled ${roll.formula}: ${roll.result} from ${sourceActor.name})</em>
          </div>
        `,
                speaker: ChatMessage.getSpeaker({ actor: sourceActor })
            });

            // Send notification to relevant players via socket
            const message = `${targetActor.name} received ${tempHP} temporary HP from ${sourceActor.name}'s rage!`;
            this._notifyRelevantPlayers(targetActor, sourceActor, message);
        } else {
            const message = `${targetActor.name} already has ${currentTempHP} temp HP (higher than rolled ${tempHP}).`;
            this._notifyRelevantPlayers(targetActor, sourceActor, message);
        }

        console.log(`${MODULE_NAME} | Applied ${tempHP} temp HP to ${targetActor.name} (roll: ${roll.result})`);
    }

    /**
     * Sends a notification to both Source's owner and the target actor's owner.
     * @param {Actor} targetActor - The actor who received temp HP
     * @param {Actor} sourceActor - The barbarian granting the HP
     * @param {string} message - The notification message
     */
    _notifyRelevantPlayers(targetActor, sourceActor, message) {
        // Get user IDs who should see the notification
        const userIdsToNotify = new Set();

        // Add Source's player owners
        if (sourceActor) {
            for (const user of game.users) {
                if (!user.isGM && sourceActor.testUserPermission(user, "OWNER")) {
                    userIdsToNotify.add(user.id);
                }
            }
        }

        // Add target actor's player owners
        for (const user of game.users) {
            if (!user.isGM && targetActor.testUserPermission(user, "OWNER")) {
                userIdsToNotify.add(user.id);
            }
        }

        // Show notification locally if current user should see it
        if (userIdsToNotify.has(game.user.id)) {
            ui.notifications.info(message);
        }

        // Emit socket message for other users
        game.socket.emit(`module.${MODULE_NAME}`, {
            type: "worldTreeRageNotification",
            message: message,
            targetUserIds: Array.from(userIdsToNotify)
        });
    }

    /**
     * Handles incoming socket messages for World Tree rage notifications.
     * Call this from main.js socket listener setup.
     * @param {Object} data - The socket message data
     */
    static handleSocketMessage(data) {
        if (data.type === "worldTreeRageNotification") {
            if (data.targetUserIds.includes(game.user.id)) {
                ui.notifications.info(data.message);
            }
        }
    }
}
