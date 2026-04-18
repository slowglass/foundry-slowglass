// Macro: Request Ability Checks & Saves (Modern DialogV2 - Hardcoded Attributes)
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

    // 2. Prep HTML Components
    const abilityBtns = Object.entries(abilities).map(([id, data]) => `
        <button type="button" class="id-btn stat-btn" data-id="${id}" title="${data.label}" style="height:44px; margin:2px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
            <span style="font-size:1.5em; font-weight:800; pointer-events:none;">${id.toUpperCase()}</span>
        </button>
    `).join("");

    const actorPortraits = actors.map(a => {
        const imgSrc = a.img || a.prototypeToken?.texture?.src;
        const isSelected = targetedUuids.includes(a.uuid);
        return `
        <div class="actor-portrait ${isSelected ? 'active' : ''}" data-uuid="${a.uuid}" 
             style="cursor:pointer; border:${isSelected ? '3px solid #ff6400' : '1px solid #7a7971'}; width:52px; height:52px; overflow:hidden; display:inline-block; margin:2px; background:#000;">
            <img src="${imgSrc}" width="52" height="52" style="width:52px; height:52px; object-fit:cover; display:block; pointer-events:none;" />
        </div>`;
    }).join("");

    const content = `
    <div class="roll-request-dialog" style="display:flex; flex-direction:column; gap:8px; padding:10px; font-family:'Signika', sans-serif;">
        <div class="mode-selection" style="display:flex; justify-content:center; gap:6px;">
            <button type="button" class="mode-btn active" data-mode="save" style="width:105px; height:36px; border:2px solid #ff6400; cursor:pointer;">SAVE</button>
            <button type="button" class="mode-btn" data-mode="check" style="width:105px; height:36px; cursor:pointer;">CHECK</button>
        </div>
        <hr style="border:0; border-top:1px solid #ccc; margin:5px 0;">
        <div class="mode-selection" style="display:flex; justify-content:center; gap:6px;">
            <button type="button" class="adv-btn" data-adv="advantage" style="width:80px; height:34px; cursor:pointer;">ADV</button>
            <button type="button" class="adv-btn active" data-adv="normal" style="width:80px; height:34px; border:2px solid #ff6400; cursor:pointer;">NORM</button>
            <button type="button" class="adv-btn" data-adv="disadvantage" style="width:80px; height:34px; cursor:pointer;">DIS</button>
        </div>
        <div id="selection-grid" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:4px;">${abilityBtns}</div>
        <div class="actor-grid" style="border-top:1px solid #ddd; padding-top:8px; text-align:center;">
            ${actorPortraits || "<em>No actors found.</em>"}
        </div>
        
        <input type="hidden" id="roll-type" value="save">
        <input type="hidden" id="roll-adv" value="normal">
        <input type="hidden" id="roll-id" value="">
    </div>
    `;

    // 3. Render modern DialogV2
    const DialogV2 = foundry.applications.api.DialogV2 || dnd5e.applications.api.DialogV2;
    
    new DialogV2({
        window: { title: "Stat Request", icon: "fas fa-brain-circuit" },
        content: content,
        buttons: [{
            action: "request",
            label: "Send Request",
            icon: "fas fa-bullhorn",
            class: "default",
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

                game.socket.emit("module." + MODULE_NAME, {
                    type: "requestRoll", actorUuids: selectedUuids,
                    rollType: rollType, id: id, advantageMode: advantageMode
                });
            }
        }],
        render: (html) => {
            html.querySelectorAll('.actor-portrait').forEach(el => {
                el.addEventListener('click', () => {
                    el.classList.toggle('active');
                    el.style.border = el.classList.contains('active') ? '3px solid #ff6400' : '1px solid #7a7971';
                });
            });

            const groups = ['id-btn', 'adv-btn', 'mode-btn'];
            groups.forEach(group => {
                const btns = html.querySelectorAll('.' + group);
                btns.forEach(btn => btn.addEventListener('click', () => {
                    btns.forEach(b => b.style.border = '1px solid #7a7971');
                    btn.style.border = '2px solid #ff6400';
                    if (group === 'id-btn') html.querySelector('#roll-id').value = btn.dataset.id;
                    else if (group === 'adv-btn') html.querySelector('#roll-adv').value = btn.dataset.adv;
                    else if (group === 'mode-btn') html.querySelector('#roll-type').value = btn.dataset.mode;
                }));
            });
        }
    }).render(true);
})();