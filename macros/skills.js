// Macro: Request Skill Checks (Modern DialogV2 - Hardcoded Layout)
// Presents a grid of skills for selection with modern UI styling.
// Icon: Module other/documents/reference-books.png

(async () => {
    const MODULE_NAME = "foundry-slowglass";
    const skills = CONFIG.DND5E.skills;

    // 1. Actor Logic
    const playerCharacters = game.actors.filter(a => a.type === "character" && a.hasPlayerOwner);
    const sceneOwnedNpcs = canvas.tokens.placeables
        .filter(t => t.actor && t.actor.type === "npc" && t.actor.hasPlayerOwner)
        .map(t => t.actor);

    const actors = Array.from(new Set([...playerCharacters, ...sceneOwnedNpcs]));
    const targetedUuids = Array.from(game.user.targets).map(t => t.actor?.uuid);

    // 2. HTML Components
    const skillBtns = Object.entries(skills)
        .sort((a, b) => a[1].label.localeCompare(b[1].label))
        .map(([id, data]) => `
            <button type="button" class="id-btn" data-id="${id}" title="${data.label}" 
                    style="cursor:pointer; border:1px solid #7a7971; background:rgba(0,0,0,0.05); width:115px; height:36px; display:inline-flex; align-items:center; justify-content:center; border-radius:3px; padding:2px; margin:2px;">
                <span style="font-size:0.75em; font-weight:bold; text-transform:uppercase; text-align:center; line-height:1; pointer-events:none;">${data.label}</span>
            </button>
        `).join("");

    const actorPortraits = actors.map(a => {
        const imgSrc = a.img || a.prototypeToken?.texture?.src;
        const isSelected = targetedUuids.includes(a.uuid);
        return `
        <div class="actor-portrait ${isSelected ? 'active' : ''}" data-uuid="${a.uuid}" 
             style="cursor:pointer; border:${isSelected ? '3px solid #ff6400' : '1px solid #7a7971'}; width:48px; height:48px; overflow:hidden; display:inline-block; margin:2px; background:#000;">
            <img src="${imgSrc}" width="48" height="48" style="width:48px; height:48px; object-fit:cover; display:block; pointer-events:none;" />
        </div>`;
    }).join("");

    const content = `
    <div class="skill-request-dialog" style="display:flex; flex-direction:column; gap:8px; padding:10px; font-family:'Signika', sans-serif;">
        <div class="mode-selection" style="display:flex; justify-content:center; gap:6px;">
            <button type="button" class="adv-btn" data-adv="advantage" style="width:90px; height:34px; cursor:pointer;">ADV</button>
            <button type="button" class="adv-btn active" data-adv="normal" style="width:90px; height:34px; border:2px solid #ff6400; cursor:pointer;">NORM</button>
            <button type="button" class="adv-btn" data-adv="disadvantage" style="width:90px; height:34px; cursor:pointer;">DIS</button>
        </div>
        <hr style="border:0; border-top:1px solid #ccc; margin:5px 0;">
        <div id="selection-grid" style="text-align:center;">
            ${skillBtns}
        </div>
        <div class="actor-grid" style="border-top:1px solid #ddd; padding-top:8px; text-align:center;">
            ${actorPortraits || "<em>No actors found.</em>"}
        </div>
        
        <input type="hidden" id="roll-adv" value="normal">
        <input type="hidden" id="roll-id" value="">
    </div>
    `;

    // 3. Render modern DialogV2
    const DialogV2 = foundry.applications.api.DialogV2 || dnd5e.applications.api.DialogV2;

    new DialogV2({
        window: { title: "Skill Request", icon: "fas fa-scroll" },
        content: content,
        buttons: [{
            action: "request",
            label: "Send Request",
            icon: "fas fa-bullhorn",
            class: "default",
            callback: (event, button, dialogInstance) => {
                const html = dialogInstance.element;
                const advantageMode = html.querySelector('#roll-adv').value;
                const id = html.querySelector('#roll-id').value;
                const selectedUuids = Array.from(html.querySelectorAll('.actor-portrait.active')).map(el => el.dataset.uuid);
                
                if (!id || selectedUuids.length === 0) {
                    ui.notifications.warn("Select a skill and target an actor.");
                    return false;
                }

                game.socket.emit("module." + MODULE_NAME, {
                    type: "requestRoll", actorUuids: selectedUuids,
                    rollType: "skill", id: id, advantageMode: advantageMode
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

            const groups = ['id-btn', 'adv-btn'];
            groups.forEach(group => {
                const btns = html.querySelectorAll('.' + group);
                btns.forEach(btn => btn.addEventListener('click', () => {
                    btns.forEach(b => b.style.border = '1px solid #7a7971');
                    btn.style.border = '2px solid #ff6400';
                    if (group === 'id-btn') html.querySelector('#roll-id').value = btn.dataset.id;
                    else if (group === 'adv-btn') html.querySelector('#roll-adv').value = btn.dataset.adv;
                }));
            });
        }
    }).render(true);
})();