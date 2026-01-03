import { MODULE_NAME, MODULE_VERSION } from "./constants.js";
import { ActorManager } from "./actor-manager.js";
import { EncounterTracker } from "./encounter-tracker.js";
import { AttackRollHandler } from "./attack-roll-handler.js";
import { RollDataHandler } from "./roll-data-handler.js";
import { ChatHandler } from "./chat-handler.js";

Hooks.once('init', () => {
  console.log(`${MODULE_NAME} | Initializing`);
  console.log(`${MODULE_NAME} | Version ${MODULE_VERSION} loaded.`);

  // Register Custom Ammunition Types
  CONFIG.DND5E.consumableTypes.ammo.subtypes.smallBolt = "DND5E.ConsumableSmallBolt";
  console.log(`${MODULE_NAME} | Added Small Bolt to ammunition subtypes`, CONFIG.DND5E.consumableTypes.ammo.subtypes);

  // Roll Data Handler for injecting @is_action variables
  // Register early to ensure we catch all getRollData calls
  const rollDataHandler = new RollDataHandler();
  rollDataHandler.registerWrapper();

  // Chat Handler
  new ChatHandler();
});


Hooks.once('ready', async () => {
  console.log(`✅ ${MODULE_NAME} | Ready`);

  // Actor Manager for status effects
  const actorManager = new ActorManager();
  Hooks.on("updateActor", actorManager.handleUpdate.bind(actorManager));

  // Attack Roll Handler for injecting Action Type dropdown
  const attackRollHandler = new AttackRollHandler();
  Hooks.on("renderDialog", attackRollHandler.handleRenderDialog.bind(attackRollHandler));
  Hooks.on("renderRollConfigurationDialog", attackRollHandler.handleRenderDialog.bind(attackRollHandler));

  // New hooks for Weapon Roll Hook replacement logic
  Hooks.on("dnd5e.preRollAttackV2", attackRollHandler.handlePreRollAttack.bind(attackRollHandler));
  Hooks.on("dnd5e.preRollDamageV2", attackRollHandler.handlePreRollDamage.bind(attackRollHandler));
  Hooks.on("dnd5e.rollAttackV2", attackRollHandler.handleRollAttack.bind(attackRollHandler));
  Hooks.on("dnd5e.rollDamageV2", attackRollHandler.handleRollDamage.bind(attackRollHandler));
  Hooks.on("dnd5e.renderChatMessage", attackRollHandler.handleRenderChatMessage.bind(attackRollHandler));

  // Encounter Tracker for throwable weapons and ammunition
  const encounterTracker = new EncounterTracker();
  Hooks.on("combatStart", encounterTracker._storeInitialCounts.bind(encounterTracker));
  Hooks.on("deleteCombat", encounterTracker._calculateAndReportUsage.bind(encounterTracker));

  // Socket listener for Roll Requests (Saves, Checks, Skills)
  game.socket.on(`module.${MODULE_NAME}`, (data) => {
    if (data.type === "requestRoll" || data.type === "requestSave") {
      const uuids = Array.isArray(data.actorUuids) ? data.actorUuids : [data.actorUuid];
      const rollType = data.rollType || (data.type === "requestSave" ? "save" : null);

      for (const uuid of uuids) {
        let doc = fromUuidSync(uuid);
        if (!doc) continue;
        const actor = doc.actor || (doc instanceof Actor ? doc : null);
        if (!actor || !actor.isOwner) continue;

        console.log(`${MODULE_NAME} | Received ${rollType} request for ${actor.name} (${data.id || data.abilityId})`);

        try {
          if (rollType === "save") {
            const abilityId = data.id || data.abilityId;
            if (typeof actor.rollSavingThrow === "function") actor.rollSavingThrow({ ability: abilityId });
            else if (typeof actor.rollAbilitySave === "function") actor.rollAbilitySave(abilityId);
          } else if (rollType === "check") {
            if (typeof actor.rollAbilityCheck === "function") actor.rollAbilityCheck({ ability: data.id });
            else if (typeof actor.rollAbility === "function") actor.rollAbility(data.id, { type: "check" });
          } else if (rollType === "skill") {
            if (typeof actor.rollSkill === "function") actor.rollSkill({ skill: data.id });
            else if (typeof actor.rollAbility === "function") actor.rollAbility(data.id, { type: "skill" });
          }
        } catch (err) {
          console.error(`${MODULE_NAME} | Roll request failed for ${actor.name}`, err);
        }
      }
    }
  });

  window.toggleCollapsible = (event) => {
    const header = event.currentTarget;
    const content = header.nextElementSibling; // Assuming content is the next sibling
    if (content.style.display === "block") {
      content.style.display = "none";
    } else {
      content.style.display = "block";
    }
  };
});