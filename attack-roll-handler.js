import { MODULE_NAME } from "./constants.js";

export class AttackRollHandler {
    constructor() {
        console.log(`${MODULE_NAME} | AttackRollHandler initialized.`);
    }

    /**
     * Handles the renderDialog hook to inject the Action Type dropdown.
     * @param {Application} app The dialog application.
     * @param {jQuery} html The HTML content of the dialog.
     * @param {object} data Data passed to the dialog.
     */
    handleRenderDialog(app, html, data) {
        // Check if this is the specific dialog we want to target
        let isTarget = false;

        if (app.title && app.title.includes("Attack Roll")) isTarget = true;
        if (app.constructor.name === "RollConfigurationDialog") isTarget = true;

        if (!isTarget) return;

        console.log(`${MODULE_NAME} | Detected Attack Roll dialog. Injecting Action Type dropdown.`);


        // Define the HTML for the dropdown
        const formGroupHtml = `
      <div class="form-group">
        <label>Action Type</label>
        <div class="form-fields">
            <select name="actionType">
                <option value="action" selected>Action</option>
                <option value="bonus">Bonus Action</option>
                <option value="reaction">Reaction</option>
            </select>
        </div>
      </div>
    `;

        // Helper to get native element
        const getElement = (jqOrEl) => {
            return (jqOrEl instanceof jQuery) ? jqOrEl[0] : jqOrEl;
        };

        const rootElement = getElement(html);

        // Check if we found the root
        if (!rootElement) {
            console.warn(`${MODULE_NAME} | Root element not found for dialog injection.`);
            return;
        }

        // Check for duplicates
        if (rootElement.querySelector('select[name="actionType"]')) {
            return;
        }

        // Try to find the actor
        // Standard dnd5e: app.document is the Item, item.actor is the Actor
        // Or app.options.actor
        let actor = app.actor;
        if (!actor && app.item && app.item.actor) {
            actor = app.item.actor;
        }
        // Specific check for RollConfigurationDialog where document might be Item
        if (!actor && app.document && app.document.actor) {
            actor = app.document.actor;
        }

        // Check for app.rolls (common in dnd5e dialogs)
        if (!actor && app.rolls && app.rolls.length > 0) {
            const firstRoll = app.rolls[0];
            // Roll object might have .data.actor or .options.actor?
            // Usually D20Roll has 'data' property which is the roll data (often actor.getRollData())
            // But we need the Actor instance.
            // Check roll.options.actor (sometimes passed)
            // OR check if roll has item?
            if (firstRoll.item && firstRoll.item.actor) {
                actor = firstRoll.item.actor;
            } else if (firstRoll.options && firstRoll.options.actor) {
                // Might be UUID or Object
                actor = firstRoll.options.actor;
            }
        }

        // Check app.config (common in newer dnd5e versions)
        if (!actor && app.config) {
            if (app.config.item && app.config.item.actor) {
                actor = app.config.item.actor;
            }
            if (!actor && app.config.subject) {
                // Subject might be the Actor, Item, or Activity
                if (app.config.subject.actor) {
                    actor = app.config.subject.actor;
                } else if (app.config.subject instanceof Actor) {
                    actor = app.config.subject;
                } else if (app.config.subject.item && app.config.subject.item.actor) {
                    actor = app.config.subject.item.actor;
                }
            }
        }

        // One last desperate check: game.actors.find?
        // No, keep it safe.

        if (actor) {
            // Check if property exists, if not initialize
            if (actor._slowglass_actionType === undefined) {
                actor._slowglass_actionType = "action";
            }
        } else {
            // Silent return or minimal warning if needed, but reducing spam
            // console.warn(`${MODULE_NAME} | Could not find actor for this dialog.`);
        }

        // Convert string to node
        const template = document.createElement('template');
        template.innerHTML = formGroupHtml.trim();
        const nodeToInject = template.content.firstElementChild;

        // Add event listener to the select
        const select = nodeToInject.querySelector('select[name="actionType"]');
        if (select && actor) {
            select.addEventListener('change', (event) => {
                const value = event.target.value;
                console.log(`${MODULE_NAME} | Action Type changed to: ${value}`);
                actor._slowglass_actionType = value;
            });
        }

        // Attempt injection
        // Look for form .form-group elements
        const formGroups = rootElement.querySelectorAll('.form-group');
        if (formGroups.length > 0) {
            const lastGroup = formGroups[formGroups.length - 1];
            lastGroup.parentNode.insertBefore(nodeToInject, lastGroup.nextSibling);
            console.log(`${MODULE_NAME} | Injected Action Type dropdown (DOM) after last form group.`);
        } else {
            const content = rootElement.querySelector('.dialog-content');
            if (content) {
                content.appendChild(nodeToInject);
                console.log(`${MODULE_NAME} | Injected Action Type dropdown (DOM) into dialog content.`);
            } else {
                // Fallback: just append to root
                rootElement.appendChild(nodeToInject);
                console.log(`${MODULE_NAME} | Injected Action Type dropdown (DOM) into root.`);
            }
        }

        // Auto-height if possible
        app.setPosition({ height: "auto" });
    }
}

