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

  // Encounter Tracker for throwable weapons and ammunition
  const encounterTracker = new EncounterTracker();
  Hooks.on("combatStart", encounterTracker._storeInitialCounts.bind(encounterTracker));
  Hooks.on("deleteCombat", encounterTracker._calculateAndReportUsage.bind(encounterTracker));

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