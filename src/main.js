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
    Hooks.on("renderApplication", attackRollHandler.handleRenderDialog.bind(attackRollHandler));
    Hooks.on("renderRollConfigurationDialog", attackRollHandler.handleRenderDialog.bind(attackRollHandler));
    Hooks.on("renderD20RollConfigurationDialog", attackRollHandler.handleRenderDialog.bind(attackRollHandler));
    const hooks = ["dnd5e.preRollAttackV2", "dnd5e.preRollDamageV2", "dnd5e.rollAttackV2", "dnd5e.rollDamageV2", "dnd5e.renderChatMessage"];
    hooks.forEach(h => {
        const rawName = h.split('.').pop();
        const capitalized = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        let methodName = "handle" + capitalized;
        
        // Check if handler exists, if not try without V2 suffix
        if (typeof attackRollHandler[methodName] !== "function" && methodName.endsWith("V2")) {
            methodName = methodName.slice(0, -2);
        }

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

    async function processRollRequest(data) {
        const { actorUuids, rollType, id, advantageMode } = data;
        console.log(`${MODULE_NAME} | Roll request processing:`, data);

        for (const uuid of actorUuids) {
            const actor = await fromUuid(uuid);
            if (!actor) continue;

            // Determine if the current user should control/roll this actor
            const playerOwners = game.users.filter(u => !u.isGM && actor.testUserPermission(u, "OWNER"));
            const hasOnlinePlayerOwner = playerOwners.some(u => u.active);
            const isController = hasOnlinePlayerOwner ? (!game.user.isGM && actor.isOwner) : game.user.isGM;

            if (!isController) {
                console.log(`${MODULE_NAME} | Skipping roll for ${actor.name} - current user is not a controller.`);
                continue;
            }

            try {
                const dialogConfig = (advantageMode === "advantage" || advantageMode === "disadvantage") 
                    ? { options: { defaultButton: advantageMode } } 
                    : {};

                if (rollType === "save") {
                    if (typeof actor.rollSavingThrow === "function") await actor.rollSavingThrow({ ability: id }, dialogConfig);
                    else await actor.rollAbilitySave(id, { event: dialogConfig }); // Safe fallback for V3
                } else if (rollType === "check") {
                    if (typeof actor.rollAbilityTest === "function") await actor.rollAbilityTest({ ability: id }, dialogConfig);
                    else await actor.rollAbilityCheck(id, { event: dialogConfig });
                } else if (rollType === "skill") {
                    try {
                        await actor.rollSkill({ skill: id }, dialogConfig);
                    } catch (err) {
                        await actor.rollSkill(id, { event: dialogConfig });
                    }
                }
            } catch (err) {
                console.error(`${MODULE_NAME} | Roll request failed for ${actor.name}`, err);
            }
        }
    }

    const module = game.modules.get(MODULE_NAME);
    if (module) {
        module.api = {
            processRollRequest
        };
    }

    // Light restrictions configuration injection
    function injectLightTagField(app, html) {
        const element = html.jquery ? html[0] : html;
        if (!element) return;

        // Check if we already injected it to avoid duplicates
        if (element.querySelector('input[name="flags.foundry-slowglass.lightTag"]')) return;

        const doc = app.document || app.object;
        if (!doc) return;

        const lightTag = doc.getFlag(MODULE_NAME, "lightTag") || "";

        const dimInput = element.querySelector('input[name="config.dim"]') 
          || element.querySelector('input[name="dim"]')
          || element.querySelector('input[name="light.dim"]');

        const formGroup = dimInput?.closest('.form-group');
        if (!formGroup) return;

        const htmlString = `
            <div class="form-group">
                <label>Slowglass Light Tag</label>
                <div class="form-fields">
                    <input type="text" name="flags.foundry-slowglass.lightTag" value="${lightTag}" placeholder="e.g. ForEllen">
                </div>
                <p class="notes">Add a tag to this light. Restrict visibility of tagged lights using the Restrict Light Macro.</p>
            </div>
        `;
        formGroup.insertAdjacentHTML('afterend', htmlString);
    }

    Hooks.on("renderTokenConfig", (app, html) => {
        injectLightTagField(app, html);
    });

    Hooks.on("renderAmbientLightConfig", (app, html) => {
        injectLightTagField(app, html);
    });

    // Patch LightSource.prototype.disabled to filter based on controlled tokens
    try {
        const PointSourceClass = foundry?.canvas?.sources?.PointSource || globalThis.PointSource;
        const LightSourceClass = foundry?.canvas?.sources?.PointLightSource 
          || foundry?.canvas?.sources?.LightSource 
          || globalThis.LightSource;
        const BaseLightSourceClass = foundry?.canvas?.sources?.BaseLightSource || globalThis.BaseLightSource;

        if (LightSourceClass && LightSourceClass.prototype.initialize) {
            console.log("Slowglass Helper | Patching LightSource initialize...");
            const originalInitialize = LightSourceClass.prototype.initialize;

            LightSourceClass.prototype.initialize = function(data) {
                const res = originalInitialize.call(this, data);

                // Dynamically traverse prototype chain to find descriptors
                let activeDescriptor = null;
                let disabledDescriptor = null;
                
                let proto = Object.getPrototypeOf(this);
                while (proto && proto !== Object.prototype) {
                    if (!activeDescriptor) activeDescriptor = Object.getOwnPropertyDescriptor(proto, "active");
                    if (!disabledDescriptor) disabledDescriptor = Object.getOwnPropertyDescriptor(proto, "disabled");
                    proto = Object.getPrototypeOf(proto);
                }

                const originalActiveGetter = activeDescriptor?.get;
                const originalDisabledGetter = disabledDescriptor?.get;
                const originalDisabledSetter = disabledDescriptor?.set;

                const oldDisabledVal = this.disabled;
                this._disabled = oldDisabledVal;

                // Redefine disabled on the instance itself to prevent shadowing
                Object.defineProperty(this, "disabled", {
                    get() {
                        const isDisabled = originalDisabledGetter ? originalDisabledGetter.call(this) : this._disabled;
                        if (isDisabled) return true;

                        try {
                            const doc = this.object?.document;
                            if (!doc) return false;

                            const lightTag = doc.getFlag(MODULE_NAME, "lightTag");
                            if (!lightTag) return false;

                            const scene = doc.parent instanceof Scene ? doc.parent : canvas.scene;
                            if (!scene) return false;

                            const restrictions = scene.getFlag(MODULE_NAME, "lightRestrictions") || {};
                            const allowed = restrictions[lightTag];

                            if (!allowed || allowed.length === 0) return false;

                            const controlled = canvas.tokens.controlled;
                            let viewerTokens = [];

                            if (controlled.length > 0) {
                                viewerTokens = controlled;
                            } else {
                                if (game.user.isGM) return false;
                                const characterTokens = game.user.character?.getActiveTokens() || [];
                                if (characterTokens.length > 0) {
                                    viewerTokens = characterTokens;
                                } else {
                                    return true;
                                }
                            }

                            const isAllowed = viewerTokens.some(t => {
                                const name = t.name;
                                const actorName = t.actor?.name;
                                return allowed.includes(name) || allowed.includes(actorName);
                            });

                            return !isAllowed;
                        } catch (err) {
                            console.error("Slowglass Helper | Error in lightSource.disabled override:", err);
                        }

                        return false;
                    },
                    set(value) {
                        if (originalDisabledSetter) {
                            originalDisabledSetter.call(this, value);
                        } else {
                            this._disabled = value;
                        }
                    },
                    configurable: true,
                    enumerable: true
                });

                // Redefine active on the instance itself to prevent rendering
                Object.defineProperty(this, "active", {
                    get() {
                        const isOriginalActive = originalActiveGetter ? originalActiveGetter.call(this) : !this.disabled;
                        if (!isOriginalActive) return false;

                        try {
                            const doc = this.object?.document;
                            if (!doc) return true;

                            const lightTag = doc.getFlag(MODULE_NAME, "lightTag");
                            if (!lightTag) return true;

                            const scene = doc.parent instanceof Scene ? doc.parent : canvas.scene;
                            if (!scene) return true;

                            const restrictions = scene.getFlag(MODULE_NAME, "lightRestrictions") || {};
                            const allowed = restrictions[lightTag];

                            if (!allowed || allowed.length === 0) return true;

                            const controlled = canvas.tokens.controlled;
                            let viewerTokens = [];

                            if (controlled.length > 0) {
                                viewerTokens = controlled;
                            } else {
                                if (game.user.isGM) return true;
                                const characterTokens = game.user.character?.getActiveTokens() || [];
                                if (characterTokens.length > 0) {
                                    viewerTokens = characterTokens;
                                } else {
                                    return false;
                                }
                            }

                            const isAllowed = viewerTokens.some(t => {
                                const name = t.name;
                                const actorName = t.actor?.name;
                                return allowed.includes(name) || allowed.includes(actorName);
                            });

                            const finalResult = isAllowed;
                            console.log(`Slowglass Helper | LightSource ${this.object?.name} (${lightTag}) active check for viewer ${viewerTokens.map(t => t.name).join(", ")} -> active: ${finalResult}`);
                            return finalResult;
                        } catch (err) {
                            console.error("Slowglass Helper | Error in lightSource.active override:", err);
                        }

                        return true;
                    },
                    configurable: true,
                    enumerable: true
                });

                return res;
            };
        } else {
            console.warn("Slowglass Helper | LightSource class or initialize method not found, skipping patch.");
        }
    } catch (err) {
        console.error("Slowglass Helper | Failed to patch LightSource.prototype.disabled:", err);
    }

    // Force lighting updates on control changes
    Hooks.on("controlToken", () => {
        canvas.perception.update({ initializeLighting: true, initializeVision: true });
    });
    Hooks.on("releaseToken", () => {
        canvas.perception.update({ initializeLighting: true, initializeVision: true });
    });

    // Socket listeners
    game.socket.on(`module.${MODULE_NAME}`, async (data) => {
        if (data.type === "requestRoll") {
            await processRollRequest(data);
        }

        // World Tree Rage notifications
        WorldTreeRageHandler.handleSocketMessage(data);
    });
});