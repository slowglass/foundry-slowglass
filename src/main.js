import { MODULE_NAME, MODULE_VERSION } from "./lib/constants.js";
import { readyActorManager } from "./lib/actor-manager.js";
import { initVillainActions, readyVillainActions } from "./features/npc-actions/villain-actions.js";
import { readyAttackRollHandler } from "./features/combat-rolls/attack-roll-handler.js";
import { readyRollHandling } from "./features/combat-rolls/roll-data-handler.js";
import { initChatHandler } from "./features/chat/chat-handler.js";
import { readyCombatTracking } from "./features/combat-tracker/tracker.js";
import { readyJournalSync } from "./features/version-management/release-journals.js";
import { readyWorldTreeRage } from "./features/classes/barbarian/world-tree/rage-handler.js";
import { readyLightRestrictions } from "./features/lighting/light-restrictions.js";

Hooks.once('init', () => {
    console.log(`${MODULE_NAME} | Initializing v${MODULE_VERSION}`);
    
    // Init hooks for features
    initVillainActions();
    initChatHandler();
});

Hooks.once('ready', async () => {
    console.log(`${MODULE_NAME} | Ready`);
    
    // Ready hooks / bootstrapper for features and libs
    readyActorManager();
    readyVillainActions();
    readyJournalSync();
    readyAttackRollHandler();
    readyRollHandling();
    readyCombatTracking();
    readyWorldTreeRage();
    readyLightRestrictions();
});