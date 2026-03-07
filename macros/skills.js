/**
 * Macro: Request Skill Checks (Isolated CSS)
 * Renamed classes to .skill-request-dialog to prevent style bleeding.
 */

(async () => {
    const MODULE_NAME = "foundry-slowglass";
    const skills = CONFIG.DND5E.skills;

    const advBtnHtml = `
        <button type="button" class="adv-btn" data-adv="advantage" title="Advantage"><span class="adv-label">ADV</span></button>
        <button type="button" class="adv-btn active" data-adv="normal" title="Normal"><span class="adv-label">NORM</span></button>
        <button type="button" class="adv-btn" data-adv="disadvantage" title="Disadvantage"><span class="adv-label">DIS</span></button>
    `;

    const skillBtns = Object.entries(skills)
        .sort((a, b) => a[1].label.localeCompare(b[1].label))
        .map(([id, data]) => {
            return `<button type="button" class="id-btn" data-id="${id}" title="${data.label}">
                <span class="skill-label">${data.label}</span>
            </button>`;
        }).join("");

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

    const content = `
    <style>
        .skill-request-dialog { overflow: visible; font-family: "Signika", sans-serif; }
        .skill-request-dialog .mode-selection { display: flex; justify-content: center; gap: 6px; margin-bottom: 8px; }
        
        .skill-request-dialog hr {
            border: 0;
            border-top: 1px solid #7a7971;
            margin: 10px 0;
            opacity: 0.5;
        }

        .skill-request-dialog .btn-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px; margin-bottom: 10px; }
        
        .skill-request-dialog button {
            cursor: pointer; border: 1px solid #7a7971; background: rgba(0,0,0,0.05);
            width: 115px; height: 34px; display: flex; align-items: center; justify-content: center;
            transition: all 0.1s ease; border-radius: 3px; padding: 2px;
        }

        .skill-request-dialog .adv-label { font-size: 0.9em; font-weight: bold; }
        .skill-request-dialog .skill-label { font-size: 0.75em; font-weight: bold; text-transform: uppercase; text-align: center; line-height: 1; }

        .skill-request-dialog button.active { border: 2px solid #ff6400 !important; background: rgba(255, 100, 0, 0.1) !important; }
        .skill-request-dialog button.active span { color: #ff6400; }

        .skill-request-dialog .actor-grid { 
            display: flex; flex-wrap: wrap; justify-content: center; gap: 6px;
            max-height: 180px; overflow-y: auto; padding: 8px;
            border-top: 1px solid #7a7971; background: rgba(0,0,0,0.05);
        }

        .skill-request-dialog .actor-portrait {
            cursor: pointer; border: 1px solid #7a7971; width: 48px; height: 48px;
            border-radius: 3px; overflow: hidden; background: #222;
        }
        .skill-request-dialog .actor-portrait img { width: 100%; height: 100%; object-fit: cover; }
        .skill-request-dialog .actor-portrait.active { border: 3px solid #ff6400 !important; box-shadow: 0 0 5px #ff6400; }
    </style>
    
    <div class="skill-request-dialog">
        <div class="mode-selection">${advBtnHtml}</div>
        <hr>
        <div id="selection-grid" class="btn-grid">${skillBtns}</div>
        <input type="hidden" id="roll-adv" value="normal">
        <input type="hidden" id="roll-id" value="">
        <div class="actor-grid">${actorPortraits || "<em>No actors found.</em>"}</div>
    </div>
    `;

    new Dialog({
        title: "Skill Request",
        content: content,
        buttons: {
            request: {
                icon: '<i class="fas fa-bullhorn"></i>',
                label: "Send Request",
                callback: (html) => {
                    const advantageMode = html.find('#roll-adv').val();
                    const id = html.find('#roll-id').val();
                    const selectedUuids = html.find('.actor-portrait.active').map((i, el) => $(el).data('uuid')).get();
                    if (!id || selectedUuids.length === 0) return ui.notifications.warn("Select a skill and target an actor.");

                    game.socket.emit("module." + MODULE_NAME, {
                        type: "requestRoll", actorUuids: selectedUuids,
                        rollType: "skill", id: id, advantageMode: advantageMode
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
        }
    }, { width: 400 }).render(true);
})();