import { MODULE_NAME } from "./constants.js";

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
