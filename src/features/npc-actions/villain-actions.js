import { MODULE_NAME } from "../../lib/constants.js";

export function initVillainActions() {
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
}

export function readyVillainActions() {
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
}
