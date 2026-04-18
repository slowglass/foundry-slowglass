import { MODULE_NAME, MODULE_VERSION } from "./constants.js";
import { ActorManager } from "./actor-manager.js";
import { EncounterTracker } from "./encounter-tracker.js";
import { AttackRollHandler } from "./attack-roll-handler.js";
import { RollDataHandler } from "./roll-data-handler.js";
import { ChatHandler } from "./chat-handler.js";
import { WorldTreeRageHandler } from "./path-of-the-world-tree-rage-handler.js";
import { JournalManager } from "./journal-manager.js";

const MODULE_ID = MODULE_NAME; 

Hooks.once('init', () => {
    console.log(`${MODULE_NAME} | Initializing v${MODULE_VERSION}`);
    
    // Register the activation type first, INCLUDING the critical 'header' property
    const villainActivation = { 
        label: "Villain Action",     // Used for subtitles and dropdowns
        header: "Villain Actions",   // Used for the category stripe/header!
        group: "monster"             // Where it appears in the menu
    };
    
    CONFIG.DND5E.abilityActivationTypes.villain = villainActivation;
    
    if (CONFIG.DND5E.activityActivationTypes) {
        CONFIG.DND5E.activityActivationTypes.villain = villainActivation;
    }

    // Modern D&D 5e v5.x NPC Section Configuration
    if (CONFIG.DND5E.npcFeatureSections) {
        CONFIG.DND5E.npcFeatureSections.villain = {
            label: "Villain Actions",
            features: ["villain"] // Matches activation type
        };
    }

    try { new ChatHandler(); } catch (err) {}
});

Hooks.once('ready', async () => {
    console.log(`${MODULE_NAME} | Ready`);
    
    // Tidy5e v2 API
    Hooks.on("tidy5e-sheet.ready", (api) => {
        try {
            const sectionConfig = {
                section: "villain-actions",
                label: "Villain Actions",
                filter: (item) => {
                    const act = item.system?.activation?.type || item.system?.activation?.condition;
                    return act === "villain";
                }
            };

            const apiMethods = ["registerActorItemSections", "registerNpcItemSections", "registerItemSections"];
            let registered = false;
            for (const method of apiMethods) {
                if (typeof api[method] === "function") {
                    api[method]([sectionConfig]);
                    console.log(`${MODULE_NAME} | Tidy5e v2 | Registered via ${method}`);
                    registered = true;
                    break;
                }
            }

            if (!registered && api.config?.actorItemSections?.register) {
                api.config.actorItemSections.register(sectionConfig);
                console.log(`${MODULE_NAME} | Tidy5e v2 | Registered via api.config`);
                registered = true;
            }
        } catch (err) {
            console.warn(`${MODULE_NAME} | Tidy API Error during registration:`, err);
        }
    });

    JournalManager.init();
    const actorManager = new ActorManager();
    Hooks.on("updateActor", actorManager.handleUpdate.bind(actorManager));

    const attackRollHandler = new AttackRollHandler();
    Hooks.on("renderDialog", attackRollHandler.handleRenderDialog.bind(attackRollHandler));
    const hooks = ["dnd5e.preRollAttackV2", "dnd5e.preRollDamageV2", "dnd5e.rollAttackV2", "dnd5e.rollDamageV2", "dnd5e.renderChatMessage"];
    hooks.forEach(h => {
        const methodName = "handle" + h.split('.').pop().charAt(0).toUpperCase() + h.split('.').pop().slice(1);
        if (typeof attackRollHandler[methodName] === "function") {
            Hooks.on(h, attackRollHandler[methodName].bind(attackRollHandler));
        } else {
            console.warn(`${MODULE_NAME} | Missing handler method ${methodName} for hook ${h}`);
        }
    });

    const encounterTracker = new EncounterTracker();
    Hooks.on("combatStart", encounterTracker._storeInitialCounts.bind(encounterTracker));
    Hooks.on("deleteCombat", encounterTracker._calculateAndReportUsage.bind(encounterTracker));

    const worldTreeRageHandler = new WorldTreeRageHandler();
    Hooks.on("updateCombat", worldTreeRageHandler.onUpdateCombat.bind(worldTreeRageHandler));
    Hooks.on("dnd5e.useItem", worldTreeRageHandler.onUseItem.bind(worldTreeRageHandler));
    Hooks.on("dnd5e.postUseActivity", worldTreeRageHandler.onUseActivity.bind(worldTreeRageHandler));

    // Socket listeners
    game.socket.on(`module.${MODULE_NAME}`, async (data) => {
        if (data.type === "requestRoll") {
            const { actorUuids, rollType, id, advantageMode } = data;
            console.log(`${MODULE_NAME} | Socket | Roll request received:`, data);

            for (const uuid of actorUuids) {
                const actor = await fromUuid(uuid);
                if (!actor) continue;

                try {
                    const options = {};
                    if (advantageMode === "advantage") options.advantage = true;
                    else if (advantageMode === "disadvantage") options.disadvantage = true;

                    if (rollType === "save") {
                        await actor.rollAbilitySave(id, options);
                    } else if (rollType === "check") {
                        await actor.rollAbilityCheck(id, options);
                    } else if (rollType === "skill") {
                        await actor.rollSkill(id, options);
                    }
                } catch (err) {
                    console.error(`${MODULE_NAME} | Roll request failed for ${actor.name}`, err);
                }
            }
        }

        // World Tree Rage notifications
        WorldTreeRageHandler.handleSocketMessage(data);
    });
});