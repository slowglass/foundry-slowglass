// Macro Name: Restrict Light
// Description: Restricts light visibility to specific tokens/characters.
// Icon: Module other/light-restrictor.png

(async () => {
    const MODULE_NAME = "foundry-slowglass";

    if (!canvas.scene) {
        ui.notifications.warn("No active scene found.");
        return;
    }

    // 1. Scan scene for existing light tags
    const sceneTags = new Set();
    canvas.scene.lights.forEach(l => {
        const tag = l.getFlag(MODULE_NAME, "lightTag");
        if (tag) sceneTags.add(tag);
    });
    canvas.scene.tokens.forEach(t => {
        const tag = t.getFlag(MODULE_NAME, "lightTag");
        if (tag) sceneTags.add(tag);
    });

    // 2. Load existing restrictions
    const restrictions = canvas.scene.getFlag(MODULE_NAME, "lightRestrictions") || {};
    const allTags = new Set([...sceneTags, ...Object.keys(restrictions)]);

    // 3. Helper to build row HTML
    function createRowHtml(tag = "", allowed = "", isNew = false) {
        return `
        <div class="restriction-row ${isNew ? 'new-row' : ''}" style="display:flex; align-items:center; gap:8px; background:rgba(0,0,0,0.02); padding:6px; border:1px solid ${isNew ? '#ff6400' : '#ddd'}; border-radius:3px;">
            ${isNew ? `
                <input type="text" class="tag-input" placeholder="Tag Name (e.g. ForEllen)" value="${tag}" 
                       style="flex:1.2; height:28px; padding:0 6px; border:1px solid #ff6400; border-radius:3px; font-weight:bold;">
            ` : `
                <div class="tag-label" data-tag="${tag}" style="flex:1.2; font-weight:bold; font-size:0.95em; min-width:100px; overflow:hidden; text-overflow:ellipsis; color:#333;">
                    ${tag}
                </div>
            `}
            <input type="text" class="allowed-input" value="${allowed}" placeholder="Allowed Tokens/Actors (comma separated)" 
                   style="flex:2.5; height:28px; padding:0 6px; border:1px solid #7a7971; border-radius:3px;">
            <button type="button" class="delete-row-btn" title="Delete Restriction" 
                    style="width:28px; height:28px; padding:0; display:flex; align-items:center; justify-content:center; border:1px solid #c83c3c; background:rgba(200,60,60,0.05); color:#c83c3c; border-radius:3px; cursor:pointer;">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        `;
    }

    // Generate initial rows
    const rowsHtml = Array.from(allTags).map(tag => {
        const allowed = restrictions[tag] ? restrictions[tag].join(", ") : "";
        return createRowHtml(tag, allowed, false);
    }).join("");

    const content = `
    <div class="light-restrictor-container" style="font-family:'Signika', sans-serif; padding:10px; display:flex; flex-direction:column; gap:10px;">
        <p style="margin:0 0 8px 0; color:#555; font-size:0.95em; line-height:1.4;">
            Define which Characters/Tokens are allowed to see lights with specific tags. If a light tag has no restrictions, it will be visible to all.
        </p>
        
        <div class="restrictions-list" style="display:flex; flex-direction:column; gap:8px; max-height:300px; overflow-y:auto; padding-right:5px;">
            ${rowsHtml || `<p class="no-tags-msg" style="text-align:center; color:#777; font-style:italic;">No light tags defined yet.</p>`}
        </div>
        
        <button type="button" class="add-row-btn" style="height:32px; font-weight:bold; cursor:pointer; background:rgba(0,0,0,0.03); border:1px dashed #7a7971; border-radius:3px; display:flex; align-items:center; justify-content:center; gap:6px;">
            <i class="fas fa-plus"></i> Add Tag Restriction
        </button>
        <hr style="border:0; border-top:1px solid #ccc; margin:5px 0;">
    </div>
    `;

    const BaseDialog = foundry.applications.api.DialogV2 || dnd5e.applications.api.DialogV2;

    class SlowglassLightRestrictDialog extends BaseDialog {
        _onRender(context, options) {
            super._onRender(context, options);
            const html = this.element;

            // Helper to bind delete buttons
            const bindDeleteButtons = () => {
                html.querySelectorAll('.delete-row-btn').forEach(btn => {
                    const newBtn = btn.cloneNode(true);
                    btn.replaceWith(newBtn);
                    newBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        newBtn.closest('.restriction-row').remove();
                        // If empty, show message
                        const list = html.querySelector('.restrictions-list');
                        if (list && list.querySelectorAll('.restriction-row').length === 0) {
                            list.innerHTML = `<p class="no-tags-msg" style="text-align:center; color:#777; font-style:italic;">No light tags defined yet.</p>`;
                        }
                    });
                });
            };

            bindDeleteButtons();

            // Add Row Click
            const addBtn = html.querySelector('.add-row-btn');
            if (addBtn) {
                addBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const list = html.querySelector('.restrictions-list');
                    if (list) {
                        const msg = list.querySelector('.no-tags-msg');
                        if (msg) msg.remove();

                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = createRowHtml("", "", true);
                        const newRow = tempDiv.firstElementChild;
                        list.appendChild(newRow);
                        bindDeleteButtons();
                    }
                });
            }
        }
    }

    new SlowglassLightRestrictDialog({
        window: { title: "Restrict Light Visibility", icon: "fas fa-eye-slash" },
        content: content,
        buttons: [{
            action: "save", label: "Save Restrictions", icon: "fas fa-save", class: "default",
            callback: async (event, button, dialogInstance) => {
                const html = dialogInstance.element;
                const rows = html.querySelectorAll('.restriction-row');
                const newRestrictions = {};

                for (const row of rows) {
                    let tag = "";
                    const labelEl = row.querySelector('.tag-label');
                    if (labelEl) {
                        tag = labelEl.dataset.tag;
                    } else {
                        const inputEl = row.querySelector('.tag-input');
                        tag = inputEl?.value?.trim();
                    }

                    const allowedVal = row.querySelector('.allowed-input')?.value || "";
                    const allowedArr = allowedVal.split(",")
                        .map(name => name.trim())
                        .filter(Boolean);

                    if (tag) {
                        newRestrictions[tag] = allowedArr;
                    }
                }

                // Save to scene flags
                const scene = canvas.scene;
                if (scene) {
                    await scene.setFlag(MODULE_NAME, "lightRestrictions", newRestrictions);
                    ui.notifications.info("Slowglass Helper | Light restrictions updated successfully!");
                    // Refresh lighting/vision immediately
                    canvas.perception.update({ initializeLighting: true, initializeVision: true }, true);
                } else {
                    ui.notifications.error("No active scene found to save restrictions.");
                }
            }
        }]
    }).render(true);
})();
