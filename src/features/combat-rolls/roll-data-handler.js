import { MODULE_NAME } from "../../lib/constants.js";

export class RollDataHandler {
    constructor() {
        console.log(`${MODULE_NAME} | RollDataHandler initialized.`);
    }

    /**
     * Registers the wrapper for Actor.prototype.getRollData.
     */
    registerWrapper() {
        const targetClass = CONFIG.Actor.documentClass || Actor;
        console.log(`${MODULE_NAME} | Targeting class for wrapping: ${targetClass.name}`);

        const originalGetRollData = targetClass.prototype.getRollData;

        targetClass.prototype.getRollData = function (...args) {
            // Call the original method to get the base data
            const data = originalGetRollData.apply(this, args);

            // Default to 'action' if not set
            const actionType = this._slowglass_actionType || 'action';

            // Inject our computed values
            data.is_action = actionType === 'action' ? 1 : 0;
            data.is_bonus_action = actionType === 'bonus' ? 1 : 0;
            data.is_reaction = actionType === 'reaction' ? 1 : 0;

            return data;
        };

        console.log(`${MODULE_NAME} | ${targetClass.name}.prototype.getRollData wrapped.`);
    }
}

export async function processRollRequest(data) {
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

export function readyRollHandling() {
    // 1. Wrap getRollData
    const rollDataHandler = new RollDataHandler();
    rollDataHandler.registerWrapper();

    // 2. Set module API
    const module = game.modules.get(MODULE_NAME);
    if (module) {
        module.api = {
            processRollRequest
        };
    }

    // 3. Register Socket Listener
    game.socket.on(`module.${MODULE_NAME}`, async (data) => {
        if (data.type === "requestRoll") {
            await processRollRequest(data);
        }
    });
}
