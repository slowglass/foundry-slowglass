import { MODULE_NAME } from "./main.js";

export class EncounterTracker {
  constructor() {
    console.log(`${MODULE_NAME} | EncounterTracker constructor called.`);
    this.initialItemCounts = new Map(); // Map<combatId, Map<actorId, Map<itemId, count>>>
  }

  /**
   * Gets all player character (PC) actors from the combat.
   * @param {Combat} combat The combat instance.
   * @returns {Actor[]} An array of PC actors.
   */
  _getCombatantActors(combat) {
    console.log(`${MODULE_NAME} | _getCombatantActors called for combat: ${combat.id}`);
    const pcActors = combat.combatants
      .filter(c => {
        console.log(`${MODULE_NAME} | Combatant: ${c.name}, Actor: ${c.actor?.name}, Actor Type: ${c.actor?.type}`);
        return c.actor && c.actor.type === "character";
      })
      .map(c => c.actor);
    console.log(`${MODULE_NAME} | Identified PC Actors:`, pcActors);
    return pcActors;
  }

  /**
   * Counts throwable weapons and ammunition for a given actor.
   * @param {Actor} actor The actor to inspect.
   * @returns {Map<string, number>} A map of item IDs to their quantities.
   */
  _getItemCounts(actor) {
    const counts = new Map();
    console.log(`${MODULE_NAME} | Inspecting items for actor: ${actor.name}`);
    for (const item of actor.items) {
      console.log(`${MODULE_NAME} | Item: ${item.name}, Type: ${item.type}, System:`, item.system);
      console.log(`${MODULE_NAME} | Debug - item.type: ${item.type}, item.system.properties?.thr: ${item.system.properties?.thr}, item.system.type?.value: ${item.system.type?.value}`);
      // Assuming D&D 5e system for item types and properties
      if (item.type === "weapon" && item.system.properties?.thr) { // 'thr' for throwable property
        counts.set(item.id, item.system.quantity || 1);
        console.log(`${MODULE_NAME} | Found throwable weapon: ${item.name}, Quantity: ${item.system.quantity || 1}`);
      } else if (item.type === "consumable" && item.system.type?.value === "ammo") {
        counts.set(item.id, item.system.quantity || 0);
        console.log(`${MODULE_NAME} | Found ammunition: ${item.name}, Quantity: ${item.system.quantity || 0}`);
      }
    }
    return counts;
  }

  /**
   * Stores the initial counts of throwable weapons and ammunition for PCs in the combat.
   * @param {Combat} combat The combat instance.
   */
  _storeInitialCounts(combat) {
    console.log(`${MODULE_NAME} | _storeInitialCounts called for combat: ${combat.id}`);
    const combatantCounts = new Map();
    for (const actor of this._getCombatantActors(combat)) {
      combatantCounts.set(actor.id, this._getItemCounts(actor));
    }
    this.initialItemCounts.set(combat.id, combatantCounts);
    this._reportCounts(combat, "initial");
  }

  _addActorCounts(actor, actorItemsList) {
    if (actorItemsList.size === 0) return "";
    var text = `
      <div class="chat-card activation-card" data-display-challenge="">
        <section class="card-header description collapsible collapsed">
          <header class="summary" style="">
              <img class="gold-icon" src="${actor.img}" alt="Character Icon" style="">
              <div class="name-stacked border">
                  <span class="title" style="">${actor.name}</span>
                  <span class="subtitle">Ammo Status</span>
              </div>
              <i class="fa-solid fa-chevron-down fa-fw" style=""></i>
          </header>
          <section class="details collapsible-content card-content">
            <div class="wrapper">
              <ul>`;
    text += actorItemsList;
    text += `
              </ul>
            </div>
          </section>
        </section>
    </div>`;

    return text;
  }
  /**
   * Reports the item counts to the chat.
   * @param {Combat} combat The combat instance.
   * @param {string} type The type of report ('initial' or 'final').
   */
  _reportCounts(combat, type) {
    const combatantCounts = type === "initial" ? this.initialItemCounts.get(combat.id) : this._getItemCountsForCombat(combat);
    if (!combatantCounts) return;

    let chatMessage = "";

    for (const [actorId, itemCounts] of combatantCounts.entries()) {
      const actor = game.actors.get(actorId);
      if (!actor) continue;
      
      let actorItemsList = "";
      if (itemCounts.size >0) {
        for (const [itemId, count] of itemCounts.entries()) {
          const item = actor.items.get(itemId);
          if (item) {
            actorItemsList += `<li>${item.name}: ${count}</li>`;
          }
        }
      }
      chatMessage += this._addActorCounts(actor, actorItemsList);
    }
    this._sendChatMessage(chatMessage);
  }

  /**
   * Helper to get current item counts for all combatants in a combat.
   * @param {Combat} combat The combat instance.
   * @returns {Map<string, Map<string, number>>} Current item counts.
   */
  _getItemCountsForCombat(combat) {
    const currentCounts = new Map();
    for (const actor of this._getCombatantActors(combat)) {
      currentCounts.set(actor.id, this._getItemCounts(actor));
    }
    return currentCounts;
  }

  /**
   * Calculates and reports the usage of throwable weapons and ammunition at the end of combat.
   * @param {Combat} combat The combat instance.
   */
  _calculateAndReportUsage(combat) {
    console.log(`${MODULE_NAME} | _calculateAndReportUsage called for combat: ${combat.id}`);
    const initialCounts = this.initialItemCounts.get(combat.id);
    if (!initialCounts) return;

    const finalCounts = this._getItemCountsForCombat(combat);

    let chatMessage = "";



    for (const [actorId, initialItemCounts] of initialCounts.entries()) {
      const actor = game.actors.get(actorId);
      if (!actor) continue;

      const finalItemCounts = finalCounts.get(actorId) || new Map();

      let actorItemsList = ``;
      let hasUsage = false;
      for (const [itemId, initialCount] of initialItemCounts.entries()) {
        const item = actor.items.get(itemId);
        if (!item) continue;

        const finalCount = finalItemCounts.get(itemId) || 0;
        const used = initialCount - finalCount;

        if (used > 0) {
          actorItemsList += `<li>${item.name}: Used ${used} (Initial: ${initialCount}, Remaining: ${finalCount})</li>`;
          hasUsage = true;
        } else if (used < 0) {
          actorItemsList += `<li>${item.name}: Gained ${-used} (Initial: ${initialCount}, Final: ${finalCount})</li>`;
        }
      }
      if (hasUsage) {
        chatMessage += `<ul>`;
        chatMessage += this._addActorCounts(actor, actorItemsList);      
        chatMessage += `</ul>`;
      }
    }
    this._sendChatMessage(chatMessage);
    this.initialItemCounts.delete(combat.id); // Clean up after reporting
  }

  /**
   * Sends a chat message.
   * @param {string} content The content of the chat message.
   */
  _sendChatMessage(content) {
    ChatMessage.create({
      title: MODULE_NAME,
     // user: game.user.id,
     // speaker: ChatMessage.getSpeaker({ alias: MODULE_NAME }),
      content: content,
      whisper: ChatMessage.getWhisperRecipients("GM"), // Whisper to GM
    });
  }
}
