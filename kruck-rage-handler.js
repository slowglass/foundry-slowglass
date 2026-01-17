import { MODULE_NAME } from "./constants.js";

/**
 * KruckRageHandler - Handles Kruck's "Rage Aura" ability
 * When Kruck starts his turn in combat while raging, players within 10ft
 * can receive 2d6 temporary HP.
 */
export class KruckRageHandler {
  static KRUCK_NAME = "Kruck";
  static RANGE_FEET = 10;

  /**
   * Handles the combat turn change event.
   * @param {Combat} combat - The combat encounter
   * @param {CombatHistoryData} prior - Previous turn state
   * @param {CombatHistoryData} current - Current turn state
   */
  async handleCombatTurnChange(combat, prior, current) {
    // Get the combatant whose turn just started
    const combatant = combat.combatants.get(current.combatantId);
    if (!combatant?.token) return;

    const token = combatant.token;
    const actor = combatant.actor;

    // Check if this is Kruck
    if (actor?.name !== KruckRageHandler.KRUCK_NAME) return;

    // Determine who should see the dialog:
    // - If a player owner of Kruck is logged in, show only to them
    // - If no player owner is logged in, show to GM as fallback
    const playerOwners = game.users.filter(u => !u.isGM && actor.testUserPermission(u, "OWNER"));
    const hasOnlinePlayerOwner = playerOwners.some(u => u.active);

    if (hasOnlinePlayerOwner) {
      // A player owner is online - only show to them, not GM
      if (game.user.isGM || !actor.isOwner) return;
    } else {
      // No player owner online - only show to GM
      if (!game.user.isGM) return;
    }

    console.log(`${MODULE_NAME} | Kruck's turn started, checking conditions...`);

    // Check if Kruck is raging
    if (!this._isRaging(actor)) {
      console.log(`${MODULE_NAME} | Kruck is not raging, skipping.`);
      return;
    }

    // Find player-owned tokens within 10ft
    const nearbyPlayers = this._findNearbyPlayerTokens(token);

    if (nearbyPlayers.length === 0) {
      console.log(`${MODULE_NAME} | No player tokens within range.`);
      return;
    }

    console.log(`${MODULE_NAME} | Found ${nearbyPlayers.length} player tokens within ${KruckRageHandler.RANGE_FEET}ft.`);

    // Show the selection dialog
    await this._showTempHPDialog(nearbyPlayers);
  }

  /**
   * Checks if the actor is currently raging.
   * Checks multiple sources: active effects, statuses, and rage feature effects.
   * @param {Actor} actor - The actor to check
   * @returns {boolean} True if the actor is raging
   */
  _isRaging(actor) {
    console.log(`${MODULE_NAME} | Checking rage status for ${actor.name}`);

    // 1. Check for active effects with "rage" in the name on the actor
    console.log(`${MODULE_NAME} | Active effects:`, actor.effects.map(e => ({
      name: e.name,
      disabled: e.disabled,
      origin: e.origin
    })));

    const hasRageEffect = actor.effects.some(effect => {
      if (effect.disabled) return false;
      const name = (effect.name || effect.label || "").toLowerCase();
      if (name.includes("rage") || name.includes("raging")) {
        console.log(`${MODULE_NAME} | Found rage effect: ${effect.name}`);
        return true;
      }
      return false;
    });
    if (hasRageEffect) return true;

    // 2. Check actor statuses
    const statuses = actor.statuses;
    console.log(`${MODULE_NAME} | Actor statuses:`, statuses ? Array.from(statuses) : "none");
    if (statuses) {
      for (const status of statuses) {
        if (status.toLowerCase().includes("rage")) {
          console.log(`${MODULE_NAME} | Found rage status: ${status}`);
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
      console.log(`${MODULE_NAME} | Found Rage feature:`, {
        name: rageFeature.name,
        id: rageFeature.id,
        uuid: rageFeature.uuid,
        uses: rageFeature.system?.uses,
        effectsCount: rageFeature.effects?.size || 0
      });

      // Check if the rage feature has effects - log them all for debugging
      if (rageFeature.effects?.size > 0) {
        for (const effect of rageFeature.effects) {
          console.log(`${MODULE_NAME} | Rage feature effect:`, {
            name: effect.name,
            disabled: effect.disabled,
            transfer: effect.transfer,
            duration: effect.duration
          });

          // If the effect on the Rage item is NOT disabled, consider it active
          // This works for setups where the Rage item effect is toggled
          if (!effect.disabled) {
            console.log(`${MODULE_NAME} | Rage feature has an ENABLED effect - assuming raging!`);
            return true;
          }
        }
      }

      // Check if any actor effects originated from this rage feature
      const rageUuid = rageFeature.uuid;
      const hasActiveRageOrigin = actor.effects.some(e => {
        if (e.disabled) return false;
        const matches = e.origin === rageUuid || e.origin?.includes(rageFeature.id);
        if (matches) {
          console.log(`${MODULE_NAME} | Found active effect from Rage origin: ${e.origin}`);
        }
        return matches;
      });
      if (hasActiveRageOrigin) return true;
    }

    console.log(`${MODULE_NAME} | No rage detected.`);
    console.log(`${MODULE_NAME} | TIP: To track rage, you can:`);
    console.log(`${MODULE_NAME} |   - Toggle the effect on the Rage feature item to enabled/disabled`);
    console.log(`${MODULE_NAME} |   - Use a module like DAE to auto-apply rage effects`);
    console.log(`${MODULE_NAME} |   - Manually add a "Rage" or "Raging" status effect to Kruck's token`);
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
      if (token.id === sourceToken.id) continue;

      const tokenActor = token.actor;
      if (!tokenActor?.hasPlayerOwner) continue;
      if (tokenActor.name === KruckRageHandler.KRUCK_NAME) continue;

      const canvasToken = canvas.tokens.get(token.id);
      if (!canvasToken) continue;

      const distance = canvas.grid.measurePath([sourceCanvasToken.center, canvasToken.center]).distance;

      if (distance <= KruckRageHandler.RANGE_FEET) {
        nearbyTokens.push(token);
      }
    }

    return nearbyTokens;
  }

  /**
   * Shows a dialog to select a player token to receive temporary HP.
   * @param {Array<TokenDocument>} tokens - The available tokens to select from
   */
  async _showTempHPDialog(tokens) {
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
        .kruck-rage-dialog { overflow: visible; }
        .kruck-rage-dialog .section-label { 
          font-weight: bold; 
          display: block; 
          margin-bottom: 8px; 
          text-align: center;
        }
        .kruck-rage-dialog .token-grid { 
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px; 
          margin-bottom: 16px;
          width: 100%;
        }
        .kruck-rage-dialog .token-option {
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
        .kruck-rage-dialog .token-option img {
          width: 80px;
          height: 80px;
          object-fit: cover;
        }
        .kruck-rage-dialog .token-option .token-name {
          font-size: 10px;
          text-align: center;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          width: 100%;
          padding: 2px;
        }
        .kruck-rage-dialog .token-option:hover {
          border-color: #ff6400;
          box-shadow: 0 0 8px rgba(255, 100, 0, 0.5);
        }
        .kruck-rage-dialog .token-option.selected {
          border: 3px solid #ff6400 !important;
          box-shadow: 0 0 12px #ff6400 !important;
        }
      </style>
      
      <div class="kruck-rage-dialog">
        <p class="section-label">Kruck's Rage empowers a nearby ally with 2d6 temporary HP!</p>
        <p class="section-label">Select a target within 10ft:</p>
        <div class="token-grid">
          ${tokenPortraits}
        </div>
      </div>
    `;

    return new Promise((resolve) => {
      new Dialog({
        title: "Kruck's Rage - Temp HP",
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

              await this._applyTempHP(targetToken.actor);
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
   * Applies 2d6 temporary HP to the target actor.
   * @param {Actor} actor - The actor to receive temp HP
   */
  async _applyTempHP(actor) {
    const roll = new Roll("2d6");
    await roll.evaluate();

    const tempHP = roll.total;
    const currentTempHP = actor.system.attributes.hp.temp || 0;

    if (tempHP > currentTempHP) {
      await actor.update({ "system.attributes.hp.temp": tempHP });

      await ChatMessage.create({
        content: `
          <div style="text-align: center;">
            <strong>Kruck's Rage</strong><br/>
            ${actor.name} gains <strong>${tempHP}</strong> temporary HP!<br/>
            <em>(Rolled ${roll.formula}: ${roll.result})</em>
          </div>
        `,
        speaker: ChatMessage.getSpeaker({ alias: "Kruck" })
      });

      // Send notification to relevant players via socket
      const message = `${actor.name} received ${tempHP} temporary HP from Kruck's rage!`;
      this._notifyRelevantPlayers(actor, message);
    } else {
      const message = `${actor.name} already has ${currentTempHP} temp HP (higher than rolled ${tempHP}).`;
      this._notifyRelevantPlayers(actor, message);
    }

    console.log(`${MODULE_NAME} | Applied ${tempHP} temp HP to ${actor.name} (roll: ${roll.result})`);
  }

  /**
   * Sends a notification to both Kruck's owner and the target actor's owner.
   * @param {Actor} targetActor - The actor who received temp HP
   * @param {string} message - The notification message
   */
  _notifyRelevantPlayers(targetActor, message) {
    // Find Kruck's actor to get owner info
    const kruckActor = game.actors.find(a => a.name === KruckRageHandler.KRUCK_NAME);

    // Get user IDs who should see the notification
    const userIdsToNotify = new Set();

    // Add Kruck's player owners
    if (kruckActor) {
      for (const user of game.users) {
        if (!user.isGM && kruckActor.testUserPermission(user, "OWNER")) {
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
      type: "kruckRageNotification",
      message: message,
      targetUserIds: Array.from(userIdsToNotify)
    });
  }

  /**
   * Handles incoming socket messages for Kruck rage notifications.
   * Call this from main.js socket listener setup.
   * @param {Object} data - The socket message data
   */
  static handleSocketMessage(data) {
    if (data.type === "kruckRageNotification") {
      if (data.targetUserIds.includes(game.user.id)) {
        ui.notifications.info(data.message);
      }
    }
  }
}
