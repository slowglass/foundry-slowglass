/**
 * Macro: Request Ability Checks & Saves (Wide 2x3 Grid with Dividers)
 * Presents a streamlined text-based dialog for Stats with full-width buttons and clean spacing.
 */

(async () => {
    const MODULE_NAME = "foundry-slowglass";
    const abilities = CONFIG.DND5E.abilities;

    // 1. Top Buttons: Save vs Check
    const modeBtnHtml = `
        <button type="button" class="mode-btn active" data-mode="save" title="Saving Throw"><span class="mode-label">SAVE</span></button>
        <button type="button" class="mode-btn" data-mode="check" title="Ability Check"><span class="mode-label">CHECK</span></button>
    `;

    // 2. Advantage Mode Buttons
    const advBtnHtml = `
        <button type="button" class="adv-btn" data-adv="advantage" title="Advantage"><span class="adv-label">ADV</span></button>
        <button type="button" class="adv-btn active" data-adv="normal" title="Normal"><span class="adv-label">NORM</span></button>
        <button type="button" class="adv-btn" data-adv="disadvantage" title="Disadvantage"><span class="adv-label">DIS</span></button>
    `;

    // 3. Ability Buttons (Formatted for 2x3 Grid)
    const abilityBtns = Object.entries(abilities).map(([id, data]) => {
        return `<button type="button" class="id-btn stat-btn" data-id="${id}" title="${data.label}">
            <span class="ability-label">${id.toUpperCase()}</span>
        </button>`;
    }).join("");

    // 4. Actor Logic: PCs then Owned Scene NPCs
    const playerCharacters = game.actors.filter(a => a.type === "character" && a.hasPlayerOwner);
    const sceneOwnedNpcs = canvas.tokens.placeables
        .filter(t => t.actor && t.actor.type === "npc" && t.actor.hasPlayerOwner)
        .map(t => t.actor);

    const actors = Array.from(new Set([...playerCharacters, ...sceneOwnedNpcs]));
    const targetedUuids = Array.from(game.user.targets).map(t => t.actor?.uuid);

    const actorPortraits = actors.map(a => {
        const imgSrc = a.img || a.prototypeToken?.texture?.src;
        const isSelected = targetedUuids.includes(a.uuid);
        return `<div class="actor-portrait ${isSelected ? 'active' : ''}" data-uuid="${a.uuid}" title="${a.name}"><img src="${imgSrc}" /></div>`;
    }).join("");

    // 5. Content & Styling
    const content = `
    <style>
        .roll-request-dialog { overflow: visible; font-family: "Signika", sans-serif; }
        
        .roll-request-dialog .mode-selection { display: flex; justify-content: center; gap: 6px; margin-bottom: 8px; }
        
        .roll-request-dialog hr {
            border: 0;
            border-top: 1px solid #7a7971;
            margin: 10px 0;
            opacity: 0.5;
        }

        .roll-request-dialog .btn-grid { 
            display: grid; 
            grid-template-columns: repeat(3, 1fr); 
            gap: 8px; 
            margin-bottom: 10px; 
            padding: 0 15px;
        }

        .roll-request-dialog button {
            cursor: pointer; border: 1px solid #7a7971; background: rgba(0,0,0,0.05);
            height: 44px; display: flex; align-items: center; justify-content: center;
            transition: all 0.1s ease; border-radius: 3px;
        }

        .roll-request-dialog .mode-btn { width: 110px; }
        .roll-request-dialog .adv-btn { width: 90px; }

        .roll-request-dialog .mode-label, .roll-request-dialog .adv-label { font-size: 0.95em; font-weight: bold; }
        
        .roll-request-dialog .ability-label { 
            font-size: 1.6em; 
            font-weight: 800; 
            color: #333;
        }

        .roll-request-dialog button.active { border: 2px solid #ff6400 !important; background: rgba(255, 100, 0, 0.1) !important; }
        .roll-request-dialog button.active span { color: #ff6400; }

        .roll-request-dialog .actor-grid { 
            display: flex; flex-wrap: wrap; justify-content: center; gap: 6px;
            max-height: 180px; overflow-y: auto; padding: 8px;
            border-top: 1px solid #7a7971; background: rgba(0,0,0,0.05);
        }

        .roll-request-dialog .actor-portrait {
            cursor: pointer; border: 1px solid #7a7971; width: 52px; height: 52px;
            border-radius: 3px; overflow: hidden; background: #222;
        }
        .roll-request-dialog .actor-portrait img { width: 100%; height: 100%; object-fit: cover; }
        .roll-request-dialog .actor-portrait.active { border: 3px solid #ff6400 !important; box-shadow: 0 0 5px #ff6400; }
    </style>
    
    <div class="roll-request-dialog">
        <div class="mode-selection">${modeBtnHtml}</div>
        <hr>
        <div class="mode-selection">${advBtnHtml}</div>
        <hr>
        <div id="selection-grid" class="btn-grid">${abilityBtns}</div>
        <input type="hidden" id="roll-type" value="save">
        <input type="hidden" id="roll-adv" value="normal">
        <input type="hidden" id="roll-id" value="">
        <div class="actor-grid">${actorPortraits || "<em>No actors found.</em>"}</div>
    </div>
    `;

    // 6. Execution
    new Dialog({
        title: "Stat Request",
        content: content,
        buttons: {
            request: {
                icon: '<i class="fas fa-bullhorn"></i>',
                label: "Send Request",
                callback: (html) => {
                    const rollType = html.find('#roll-type').val();
                    const advantageMode = html.find('#roll-adv').val();
                    const id = html.find('#roll-id').val();
                    const selectedUuids = html.find('.actor-portrait.active').map((i, el) => $(el).data('uuid')).get();
                    if (!id || selectedUuids.length === 0) return ui.notifications.warn("Select a stat and an actor.");

                    game.socket.emit("module." + MODULE_NAME, {
                        type: "requestRoll", actorUuids: selectedUuids,
                        rollType: rollType, id: id, advantageMode: advantageMode
                    });
                }
            }
        },
        default: "request",
        render: (html) => {
            html.find('.actor-portrait').click(ev => $(ev.currentTarget).toggleClass('active'));

            html.find('.id-btn').click(ev => {
                html.find('.id-btn').removeClass('active');
                $(ev.currentTarget).addClass('active');
                html.find('#roll-id').val($(ev.currentTarget).data('id'));
            });

            html.find('.adv-btn').click(ev => {
                html.find('.adv-btn').removeClass('active');
                $(ev.currentTarget).addClass('active');
                html.find('#roll-adv').val($(ev.currentTarget).data('adv'));
            });

            html.find('.mode-btn').click(ev => {
                html.find('.mode-btn').removeClass('active');
                $(ev.currentTarget).addClass('active');
                html.find('#roll-type').val($(ev.currentTarget).data('mode'));
            });
        }
    }, { width: 400 }).render(true);
})();