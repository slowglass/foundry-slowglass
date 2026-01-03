import { MODULE_NAME } from "./constants.js";

export class AttackRollHandler {
    constructor() {
        console.log(`${MODULE_NAME} | AttackRollHandler initialized.`);
    }

    /**
     * Handles the renderDialog hook to inject the Action Type dropdown.
     */
    handleRenderDialog(app, html, data) {
        let isTarget = false;
        if (app.title && app.title.includes("Attack Roll")) isTarget = true;
        if (app.constructor.name === "RollConfigurationDialog") isTarget = true;
        if (!isTarget) return;

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

        const getElement = (jqOrEl) => (jqOrEl instanceof jQuery) ? jqOrEl[0] : jqOrEl;
        const rootElement = getElement(html);
        if (!rootElement || rootElement.querySelector('select[name="actionType"]')) return;

        let actor = app.actor;
        if (!actor && app.item?.actor) actor = app.item.actor;
        if (!actor && app.document?.actor) actor = app.document.actor;
        if (!actor && app.rolls?.[0]?.item?.actor) actor = app.rolls[0].item.actor;
        if (!actor && app.config?.item?.actor) actor = app.config.item.actor;

        if (actor && actor._slowglass_actionType === undefined) {
            actor._slowglass_actionType = "action";
        }

        const template = document.createElement('template');
        template.innerHTML = formGroupHtml.trim();
        const nodeToInject = template.content.firstElementChild;

        const select = nodeToInject.querySelector('select[name="actionType"]');
        if (select && actor) {
            select.addEventListener('change', (event) => {
                actor._slowglass_actionType = event.target.value;
            });
        }

        const formGroups = rootElement.querySelectorAll('.form-group');
        if (formGroups.length > 0) {
            const lastGroup = formGroups[formGroups.length - 1];
            lastGroup.parentNode.insertBefore(nodeToInject, lastGroup.nextSibling);
        } else {
            const content = rootElement.querySelector('.dialog-content') || rootElement;
            content.appendChild(nodeToInject);
        }

        app.setPosition({ height: "auto" });
    }

    /* -------------------------------------------- */
    /*  Attack & Damage Roll Consolidation Logic    */
    /* -------------------------------------------- */

    /**
     * Capture the originating message ID from a roll configuration.
     */
    _captureOriginatingId(config, dialog, message) {
        const messageId = message.data?.["flags.dnd5e.originatingMessage"]
            || foundry.utils.getProperty(message, "data.flags.dnd5e.originatingMessage")
            || config.event?.target?.closest("[data-message-id]")?.dataset.messageId;

        if (messageId && config.rolls?.[0]) {
            config.rolls[0].options.originatingMessageId = messageId;
        }
        return messageId;
    }

    /**
     * Disable/Enable buttons in a specific chat message.
     */
    async _setButtonsDisabled(messageId, { attack = null, damage = null }) {
        if (!messageId) return;
        const message = game.messages.get(messageId);
        if (!message) return;

        const div = document.createElement("div");
        div.innerHTML = message.content;

        let changed = false;
        if (attack !== null) {
            const btn = div.querySelector('button[data-action="rollAttack"]');
            if (btn) {
                if (attack) btn.setAttribute("disabled", "");
                else btn.removeAttribute("disabled");
                changed = true;
            }
        }
        if (damage !== null) {
            const btn = div.querySelector('button[data-action="rollDamage"]');
            if (btn) {
                if (damage) btn.setAttribute("disabled", "");
                else btn.removeAttribute("disabled");
                changed = true;
            }
        }

        if (changed) {
            await message.update({ content: div.innerHTML });
        }
    }

    /**
     * Hook: dnd5e.preRollAttackV2
     */
    handlePreRollAttack(config, dialog, message) {
        const messageId = this._captureOriginatingId(config, dialog, message);
        if (messageId) {
            message.create = false;
            this._setButtonsDisabled(messageId, { attack: true, damage: true });
        }
    }

    /**
     * Hook: dnd5e.preRollDamageV2
     */
    handlePreRollDamage(config, dialog, message) {
        const messageId = this._captureOriginatingId(config, dialog, message);
        if (messageId) {
            message.create = false;
            this._setButtonsDisabled(messageId, { damage: true });
        }
    }

    /**
     * Hook: dnd5e.renderChatMessage
     */
    handleRenderChatMessage(message, html) {
        const root = html instanceof HTMLElement ? html : html[0];
        if (!root) return;

        // Use standard getFlag API for module code
        let damageData = message.getFlag(MODULE_NAME, "damageData");

        // Fallback for cards rolled during macro testing phase
        if (!damageData) damageData = message.flags?.slowglass?.damageData;
        if (!damageData || root.querySelector("damage-application")) return;

        console.log(`${MODULE_NAME} | Injecting interactive damage tray for message ${message.id}`);

        const tray = document.createElement("damage-application");
        tray.setAttribute("open", "");
        tray.setAttribute("visible", "");

        tray.damages = damageData.map(d => ({
            ...d,
            properties: new Set(d.properties || [])
        }));

        const buttons = root.querySelector(".card-buttons");
        const card = root.querySelector(".chat-card");

        if (buttons) {
            buttons.insertAdjacentElement("afterend", tray);
        } else if (card) {
            card.insertAdjacentElement("afterend", tray);
        } else {
            const content = root.querySelector(".message-content");
            if (content) content.appendChild(tray);
        }
    }

    /**
     * Hook: dnd5e.rollAttackV2
     */
    async handleRollAttack(rolls, { subject }) {
        const originatingId = rolls[0]?.options.originatingMessageId;
        if (!originatingId) return;

        await new Promise(r => setTimeout(r, 200));
        const usageMessage = game.messages.get(originatingId);
        if (!usageMessage) return;

        const roll = rolls[0];
        const rollHTML = await roll.render();

        const div = document.createElement("div");
        div.innerHTML = usageMessage.content;
        const attackButton = div.querySelector('button[data-action="rollAttack"]');

        if (attackButton) {
            const rollWrapper = document.createElement("div");
            rollWrapper.innerHTML = rollHTML.trim();
            const diceRoll = rollWrapper.querySelector(".dice-roll");
            diceRoll.classList.add("expanded", "xxx");

            const totalElement = diceRoll.querySelector(".dice-total");
            if (totalElement) {
                if (roll.isCritical) {
                    totalElement.style.color = "#18520b";
                    totalElement.style.fontWeight = "bold";
                } else if (roll.isFumble) {
                    totalElement.style.color = "#8a1000";
                    totalElement.style.fontWeight = "bold";
                }
            }

            attackButton.replaceWith(diceRoll);

            // Re-enable damage button
            const damageButton = div.querySelector('button[data-action="rollDamage"]');
            if (damageButton) damageButton.removeAttribute("disabled");

            await usageMessage.update({ content: div.innerHTML });
        }
    }

    /**
     * Hook: dnd5e.rollDamageV2
     */
    async handleRollDamage(rolls, { subject }) {
        const originatingId = rolls[0]?.options.originatingMessageId;
        if (!originatingId) return;

        await new Promise(r => setTimeout(r, 200));
        const usageMessage = game.messages.get(originatingId);
        if (!usageMessage) return;

        const div = document.createElement("div");
        div.innerHTML = usageMessage.content;
        const damageButton = div.querySelector('button[data-action="rollDamage"]');

        if (damageButton) {
            const roll = rolls[0];
            const rollHTML = await roll.render();
            const rollWrapper = document.createElement("div");
            rollWrapper.innerHTML = rollHTML.trim();
            const diceRoll = rollWrapper.querySelector(".dice-roll");
            diceRoll.classList.add("expanded", "xxx");

            const aggregateFn = game.dnd5e?.dice?.aggregateDamageRolls || dnd5e?.dice?.aggregateDamageRolls;
            let damageData = [];
            if (aggregateFn) {
                damageData = aggregateFn(rolls, { respectProperties: true }).map(r => ({
                    value: Math.max(0, r.total),
                    type: r.options.type,
                    properties: Array.from(r.options.properties ?? [])
                }));
            }

            // Swap button for roll result
            damageButton.replaceWith(diceRoll);

            // Save content and store damage data in flags
            await usageMessage.update({ content: div.innerHTML });
            await usageMessage.setFlag(MODULE_NAME, "damageData", damageData);

            if (ui.chat) ui.chat.scrollBottom();
        }
    }
}
