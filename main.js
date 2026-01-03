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
      const advantageMode = data.advantageMode || "ask";

      for (const uuid of uuids) {
        let doc = fromUuidSync(uuid);
        if (!doc) continue;
        const actor = doc.actor || (doc instanceof Actor ? doc : null);
        if (!actor || !actor.isOwner) continue;

        const traitId = data.id || data.abilityId;
        const traitLabel = rollType === "skill" ? CONFIG.DND5E.skills[traitId]?.label : CONFIG.DND5E.abilities[traitId]?.label;
        const typeLabel = rollType === "save" ? "Saving Throw" : rollType === "check" ? "Ability Check" : "Skill Check";

        console.log(`${MODULE_NAME} | Received ${rollType} request for ${actor.name} (${traitId}) [${advantageMode}]`);

        const triggerRoll = (mode) => {
          try {
            const options = {
              advantage: mode === "advantage",
              disadvantage: mode === "disadvantage",
              slowglassMode: mode,
              dialogOptions: { slowglassMode: mode }
            };

            if (rollType === "save") {
              if (typeof actor.rollSavingThrow === "function") actor.rollSavingThrow({ ability: traitId, ...options });
              else if (typeof actor.rollAbilitySave === "function") actor.rollAbilitySave(traitId, options);
            } else if (rollType === "check") {
              if (typeof actor.rollAbilityCheck === "function") actor.rollAbilityCheck({ ability: traitId, ...options });
              else if (typeof actor.rollAbility === "function") actor.rollAbility(traitId, { type: "check", ...options });
            } else if (rollType === "skill") {
              if (typeof actor.rollSkill === "function") actor.rollSkill({ skill: traitId, ...options });
              else if (typeof actor.rollAbility === "function") actor.rollAbility(traitId, { type: "skill", ...options });
            }
          } catch (err) {
            console.error(`${MODULE_NAME} | Roll request failed for ${actor.name}`, err);
          }
        };

        // Always trigger the standard dnd5e dialog
        triggerRoll(advantageMode);
      }
    }
  });

  // Filter dnd5e Roll Configuration Dialog buttons based on GM request
  const filterRollDialog = (app, html, data) => {
    // Check both standard and nested options for our custom flag
    const mode = app.options?.slowglassMode || app.options?.dialogOptions?.slowglassMode;
    if (!mode || mode === "ask") return;

    html = html instanceof HTMLElement ? $(html) : html;

    // Select all buttons in the dialog that look like roll options
    const allButtons = html.find('button');
    let foundMatch = false;

    allButtons.each((i, btn) => {
      const $btn = $(btn);
      const text = $btn.text().toUpperCase().trim();
      const name = ($btn.attr('name') || "").toUpperCase();

      const isAdv = $btn.hasClass('advantage') || name === 'ADVANTAGE' || text.includes('ADVANTAGE');
      const isDis = $btn.hasClass('disadvantage') || name === 'DISADVANTAGE' || text.includes('DISADVANTAGE');
      const isNor = $btn.hasClass('normal') || name === 'NORMAL' || text.includes('NORMAL');

      if (isAdv || isDis || isNor) {
        foundMatch = true;
        let shouldShow = false;
        if (mode === "advantage" && isAdv) shouldShow = true;
        if (mode === "disadvantage" && isDis) shouldShow = true;
        if (mode === "normal" && isNor) shouldShow = true;

        if (!shouldShow) {
          $btn.hide();
          $btn.css({ "display": "none", "visibility": "hidden" });
          $btn.addClass("hidden");
        } else {
          // Promote the remaining button to "ROLL"
          $btn.css({ "display": "flex", "visibility": "visible" });
          $btn.html('<i class="fas fa-dice-d20"></i> ROLL');
          $btn.css({
            "flex": "1",
            "font-weight": "bold",
            "border": "1px solid #ff6400",
            "box-shadow": "inset 0 0 10px rgba(255, 100, 0, 0.3)",
            "color": "white"
          });
        }
      }
    });
  };

  Hooks.on("renderDialog", filterRollDialog);
  Hooks.on("renderRollConfigurationDialog", filterRollDialog);

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