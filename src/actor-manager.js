import { MODULE_NAME } from "./constants.js";

export class ActorManager {
  /**
   * Handles updates to an actor document, specifically checking for HP changes
   * to apply or remove "unconscious" or "dead" status effects.
   * @param {Actor} actor The actor document that was updated.
   * @param {object} change The differential data that was changed.
   * @param {object} options Additional options which modified the update request.
   * @param {string} userId The ID of the User who triggered the update.
   */
  handleUpdate(actor, change, options, userId) {
    console.log(`${MODULE_NAME} | ActorManager.handleUpdate function called. Actor:`, actor, `Change:`, change, `Options:`, options, `User ID:`, userId);

    // Check if the user is the one who made the change
    if (userId !== game.user.id) {
      return;
    }

    // Check if HP value was changed
    if (foundry.utils.getProperty(change, "system.attributes.hp.value") === undefined) {
      return;
    }

    const currentHp = actor.system.attributes.hp.value;
    const isDowned = currentHp <= 0; // Use isDowned as a general term for HP <= 0

    let statusId = null;
    let hasStatusEffect = false;

    if (actor.type === "character") {
      statusId = "unconscious";
      hasStatusEffect = actor.effects.some(effect => effect.statuses.has("unconscious"));
    } else if (actor.type === "npc") {
      statusId = "dead";
      hasStatusEffect = actor.effects.some(effect => effect.statuses.has("dead"));
    } else {
      // Ignore other actor types
      return;
    }

    if (isDowned && !hasStatusEffect) {
      actor.toggleStatusEffect(statusId, { active: true, overlay: true });
      console.log(`${MODULE_NAME} | Actor ${actor.name} is now ${statusId}.`);
    } else if (!isDowned && hasStatusEffect) {
      actor.toggleStatusEffect(statusId, { active: false, overlay: true });
      console.log(`${MODULE_NAME} | Actor ${actor.name} is no longer ${statusId}.`);
    }
  }
}
