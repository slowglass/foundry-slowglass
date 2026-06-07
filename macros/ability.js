// Macro: Request Ability Checks & Saves (Modern DialogV2 - Fully Working Listeners)
// Presents a streamlined text-based dialog for Stats with full-width buttons and clean spacing.
// Icon: Module other/anatomy/brain-mystical.png

(async () => {
    const MODULE_NAME = "foundry-slowglass";
    const abilities = CONFIG.DND5E.abilities;

    // 1. Actor Logic
    const playerCharacters = game.actors.filter(a => a.type === "character" && a.hasPlayerOwner);
    const sceneOwnedNpcs = canvas.tokens.placeables
        .filter(t => t.actor && t.actor.type === "npc" && t.actor.hasPlayerOwner)
        .map(t => t.actor);

    const actors = Array.from(new Set([...playerCharacters, ...sceneOwnedNpcs]));
    const targetedUuids = Array.from(game.user.targets).map(t => t.actor?.uuid);

    // 2. HTML Components
    const abilityBtns = Object.entries(abilities).map(([id, data]) => `
        <button type="button" class="id-btn" data-id="${id}" style="height:44px; margin:2px; display:flex; align-items:center; justify-content:center; cursor:pointer; background:rgba(0,0,0,0.05); border:1px solid #7a7971; border-radius:3px;">
            <span style="font-size:1.5em; font-weight:800; pointer-events:none; color:#333;">${id.toUpperCase()}</span>
        </button>
    `).join("");

    const actorPortraits = actors.map(a => {
        const imgSrc = a.img || a.prototypeToken?.texture?.src;
        const isSelected = targetedUuids.includes(a.uuid);
        return `
        <div class="actor-portrait ${isSelected ? 'active' : ''}" data-uuid="${a.uuid}" 
             style="cursor:pointer; border:${isSelected ? '3px solid #ff6400' : '1px solid #7a7971'}; width:52px; height:52px; overflow:hidden; display:inline-block; margin:2px; background:#000; border-radius:3px;">
            <img src="${imgSrc}" width="52" height="52" style="width:52px; height:52px; object-fit:cover; display:block; pointer-events:none;" />
        </div>`;
    }).join("");

    const content = `
    <div style="display:flex; flex-direction:column; gap:8px; padding:10px; font-family:'Signika', sans-serif;">
        <div style="display:flex; justify-content:center; gap:6px;">
            <button type="button" class="mode-btn active" data-mode="save" style="width:105px; height:36px; border:2px solid #ff6400; background:rgba(255,100,0,0.1); cursor:pointer; font-weight:bold; color:#ff6400;">SAVE</button>
            <button type="button" class="mode-btn" data-mode="check" style="width:105px; height:36px; border:1px solid #7a7971; background:rgba(0,0,0,0.05); cursor:pointer; font-weight:bold;">CHECK</button>
        </div>
        <hr style="border:0; border-top:1px solid #ccc; margin:5px 0;">
        <div style="display:flex; justify-content:center; gap:6px;">
            <button type="button" class="adv-btn" data-adv="advantage" style="width:80px; height:34px; border:1px solid #7a7971; background:rgba(0,0,0,0.05); cursor:pointer; font-weight:bold;">ADV</button>
            <button type="button" class="adv-btn active" data-adv="normal" style="width:80px; height:34px; border:2px solid #ff6400; background:rgba(255,100,0,0.1); cursor:pointer; font-weight:bold; color:#ff6400;">NORM</button>
            <button type="button" class="adv-btn" data-adv="disadvantage" style="width:80px; height:34px; border:1px solid #7a7971; background:rgba(0,0,0,0.05); cursor:pointer; font-weight:bold;">DIS</button>
        </div>
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:4px;">${abilityBtns}</div>
        <div style="border-top:1px solid #ddd; padding-top:8px; text-align:center;">
            ${actorPortraits || "<em>No actors found.</em>"}
        </div>
        
        <input type="hidden" id="roll-type" value="save">
        <input type="hidden" id="roll-adv" value="normal">
        <input type="hidden" id="roll-id" value="">
    </div>
    `;

    const BaseDialog = foundry.applications.api.DialogV2 || dnd5e.applications.api.DialogV2;
    
    // Subclassing is REQUIRED in DialogV2 to attach listeners natively without hacking.
    class SlowglassAbilityDialog extends BaseDialog {
        _onRender(context, options) {
            super._onRender(context, options);
            const html = this.element;

            // Actor Click Logic
            html.querySelectorAll('.actor-portrait').forEach(el => {
                el.addEventListener('click', () => {
                    el.classList.toggle('active');
                    const isActive = el.classList.contains('active');
                    el.style.border = isActive ? '3px solid #ff6400' : '1px solid #7a7971';
                });
            });

            // Button Group Click Logic
            const groups = ['id-btn', 'adv-btn', 'mode-btn'];
            groups.forEach(group => {
                const btns = html.querySelectorAll('.' + group);
                btns.forEach(btn => btn.addEventListener('click', () => {
                    btns.forEach(b => {
                        b.style.border = '1px solid #7a7971';
                        b.style.background = 'rgba(0,0,0,0.05)';
                        b.style.color = '#333';
                        const sp = b.querySelector('span');
                        if(sp) sp.style.color = '#333';
                    });
                    
                    btn.style.border = '2px solid #ff6400';
                    btn.style.background = 'rgba(255,100,0,0.1)';
                    btn.style.color = '#ff6400';
                    const sp = btn.querySelector('span');
                    if(sp) sp.style.color = '#ff6400';

                    if (group === 'id-btn') html.querySelector('#roll-id').value = btn.dataset.id;
                    else if (group === 'adv-btn') html.querySelector('#roll-adv').value = btn.dataset.adv;
                    else if (group === 'mode-btn') html.querySelector('#roll-type').value = btn.dataset.mode;
                }));
            });
        }
    }

    new SlowglassAbilityDialog({
        window: { title: "Stat Request", icon: "fas fa-brain-circuit" },
        content: content,
        buttons: [{
            action: "request", label: "Send Request", icon: "fas fa-bullhorn", class: "default",
            callback: (event, button, dialogInstance) => {
                const html = dialogInstance.element;
                const rollType = html.querySelector('#roll-type').value;
                const advantageMode = html.querySelector('#roll-adv').value;
                const id = html.querySelector('#roll-id').value;
                const selectedUuids = Array.from(html.querySelectorAll('.actor-portrait.active')).map(el => el.dataset.uuid);
                
                if (!id || selectedUuids.length === 0) {
                    ui.notifications.warn("Select a stat and an actor.");
                    return false;
                }

                const requestData = { type: "requestRoll", actorUuids: selectedUuids, rollType: rollType, id: id, advantageMode: advantageMode };
                game.socket.emit("module." + MODULE_NAME, requestData);

                const moduleApi = game.modules.get(MODULE_NAME)?.api;
                if (moduleApi?.processRollRequest) {
                    moduleApi.processRollRequest(requestData);
                }

                ui.notifications.info(`Requested ${id.toUpperCase()} for ${selectedUuids.length} actors.`);
            }
        }]
    }).render(true);
})();