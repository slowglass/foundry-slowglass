// Icon: Module anatomy/brain-mystical.png
/**
 * Macro: Request Ability Checks & Saves (foundry-slowglass)
 * Presents a fully icon-based dialog to request Saving Throws or Ability Checks.
 */

(async () => {
    const MODULE_NAME = "foundry-slowglass";
    const ASSET_PATH = "modules/foundry-slowglass/icons";
    const DEFAULT_ICON = "icons/dice/d20black.svg";

    // 1. Icon Configuration Arrays
    const MODE_ICONS = {
        save: `${ASSET_PATH}/attribute/saving-throw.svg`,
        check: `${ASSET_PATH}/attribute/test.svg`
    };

    const ABILITY_ICONS = {
        str: `${ASSET_PATH}/abilities/strength.svg`,
        dex: `${ASSET_PATH}/abilities/dexterity.svg`,
        con: `${ASSET_PATH}/abilities/constitution.svg`,
        int: `${ASSET_PATH}/abilities/intelligence.svg`,
        wis: `${ASSET_PATH}/abilities/wisdom.svg`,
        cha: `${ASSET_PATH}/abilities/charisma.svg`
    };

    const ADV_ICONS = {
        advantage: `${ASSET_PATH}/dice/advantage.svg`,
        normal: `${ASSET_PATH}/dice/d20.svg`,
        disadvantage: `${ASSET_PATH}/dice/disadvantage.svg`
    };

    // 2. Gather Data from CONFIG
    const abilities = CONFIG.DND5E.abilities;

    // 3. Build Category Data (Icon-based Buttons)
    const modeBtnHtml = Object.entries(MODE_ICONS).map(([mode, icon]) => {
        const label = mode === "save" ? "Saving Throw" : "Ability Check";
        return `<button type="button" class="mode-btn ${mode === 'save' ? 'active' : ''}" data-mode="${mode}" title="${label}">
            <img src="${icon}" />
        </button>`;
    }).join("");

    const advBtnHtml = Object.entries(ADV_ICONS).map(([mode, icon]) => {
        const label = mode.charAt(0).toUpperCase() + mode.slice(1);
        return `<button type="button" class="adv-btn ${mode === 'normal' ? 'active' : ''}" data-adv="${mode}" title="${label}">
            <img src="${icon}" />
        </button>`;
    }).join("");

    const abilityBtns = Object.entries(abilities).map(([id, data]) => {
        const icon = ABILITY_ICONS[id] || DEFAULT_ICON;
        return `<button type="button" class="id-btn" data-id="${id}" title="${data.label}">
            <img src="${icon}" />
        </button>`;
    }).join("");

    // 4. Gather Potential Actors (Player-owned)
    const actors = game.actors.filter(a => a.hasPlayerOwner);
    const targetedUuids = Array.from(game.user.targets).map(t => t.actor?.uuid);

    const actorPortraits = actors.map(a => {
        const imgSrc = a.prototypeToken?.texture?.src || a.img;
        const isSelected = targetedUuids.includes(a.uuid);
        return `
            <div class="actor-portrait ${isSelected ? 'active' : ''}" data-uuid="${a.uuid}" title="${a.name}">
                <img src="${imgSrc}" />
            </div>
        `;
    }).join("");

    // 5. Build Dialog Content
    const content = `
    <style>
        .roll-request-dialog { overflow: visible; }
        .roll-request-dialog .section-label { font-weight: bold; display: block; margin-bottom: 8px; border-bottom: 1px solid #7a7971; padding-bottom: 2px; }
        
        .roll-request-dialog .btn-grid { 
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 4px;
            margin-bottom: 12px; 
            width: 230px;
            margin-left: auto;
            margin-right: auto;
            padding: 0;
        }
        
        .roll-request-dialog .mode-selection {
            display: flex; /* Centered flex like Skill macro */
            justify-content: center;
            gap: 4px; /* Reduced from grid gap */
            width: 100%;
            margin-bottom: 12px; /* The requested vertical space */
        }

        .roll-request-dialog .mode-divider {
            width: 1px;
            height: 64px; /* Match button height */
            background: #7a7971;
            margin: 0 10px; /* Add horizontal spacing around divider */
        }

        .roll-request-dialog button {
            padding: 2px;
            cursor: pointer;
            border: 1px solid #7a7971;
            background: rgba(0,0,0,0.1);
            width: 64px;
            height: 64px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .roll-request-dialog button img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            opacity: 1.0 !important;
        }
        .roll-request-dialog button.active {
            border: 3px solid #ff6400 !important;
            box-shadow: 0 0 12px #ff6400 !important;
            background: none !important;
        }
        
        .roll-request-dialog .actor-grid { 
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 4px;
            max-height: 400px; 
            overflow-y: auto; 
            margin-top: 2px;
            width: 100%;
            padding: 0 10px;
            margin-left: 0;
            margin-right: 0;
        }

        .roll-request-dialog .actor-portrait {
            position: relative;
            cursor: pointer;
            border: 1px solid #7a7971;
            width: 96px;
            height: 96px;
            overflow: hidden;
            background: rgba(0,0,0,0.1);
            transition: all 0.2s ease;
            box-sizing: border-box;
        }
        .roll-request-dialog .actor-portrait img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            opacity: 1.0 !important;
        }
        .roll-request-dialog .actor-portrait.active {
            border: 3px solid #ff6400 !important;
            box-shadow: 0 0 12px #ff6400 !important;
            background: none !important;
        }
    </style>
    
    <div class="roll-request-dialog">
        <div class="mode-selection">
            ${modeBtnHtml}
            <div class="mode-divider"></div>
            ${advBtnHtml}
        </div>
        <input type="hidden" id="roll-type" value="save">
        <input type="hidden" id="roll-adv" value="normal">

        <div id="selection-grid" class="btn-grid">
            ${abilityBtns}
        </div>
        <input type="hidden" id="roll-id" value="">

        <div class="actor-grid">
            ${actorPortraits || "<em>No player characters found.</em>"}
        </div>
    </div>
    `;

    // 6. Render Dialog
    new Dialog({
        title: "Request Save/Check",
        content: content,
        buttons: {
            request: {
                icon: '<i class="fas fa-bullhorn"></i>',
                label: "Request",
                callback: (html) => {
                    const rollType = html.find('#roll-type').val();
                    const advantageMode = html.find('#roll-adv').val();
                    const id = html.find('#roll-id').val();
                    const selectedUuids = html.find('.actor-portrait.active').map((i, el) => $(el).data('uuid')).get();

                    if (!id) {
                        ui.notifications.warn("No Ability selected.");
                        return false;
                    }
                    if (selectedUuids.length === 0) {
                        ui.notifications.warn("No actors selected.");
                        return false;
                    }

                    game.socket.emit("module." + MODULE_NAME, {
                        type: "requestRoll", // Main.js handles this generic type
                        actorUuids: selectedUuids,
                        rollType: rollType,
                        id: id,
                        advantageMode: advantageMode
                    });

                    ui.notifications.info(`Requested ${id.toUpperCase()} ${rollType} (${advantageMode}) from ${selectedUuids.length} actor(s).`);
                }
            }
        },
        default: "request",
        render: (html) => {
            const modeBtns = html.find('.mode-btn');
            const advBtns = html.find('.adv-btn');
            const selectionGrid = html.find('#selection-grid');
            const rollTypeInput = html.find('#roll-type');
            const rollAdvInput = html.find('#roll-adv');
            const rollIdInput = html.find('#roll-id');
            const actorGrid = html.find('.actor-grid');

            // Handle Actor Portrait clicks
            actorGrid.on('click', '.actor-portrait', (event) => {
                const portrait = $(event.currentTarget);
                portrait.toggleClass('active');
            });

            // Handle ID button clicks
            selectionGrid.on('click', '.id-btn', (event) => {
                const btn = $(event.currentTarget);
                selectionGrid.find('.id-btn').removeClass('active');
                btn.addClass('active');
                rollIdInput.val(btn.data('id'));
            });

            // Handle Advantage Mode switching
            advBtns.on('click', (event) => {
                const btn = $(event.currentTarget);
                advBtns.removeClass('active');
                btn.addClass('active');
                rollAdvInput.val(btn.data('adv'));
            });

            // Handle Mode switching (Save vs Check)
            modeBtns.on('click', (event) => {
                const btn = $(event.currentTarget);
                const mode = btn.data('mode');

                modeBtns.removeClass('active');
                btn.addClass('active');
                rollTypeInput.val(mode);

                // Reset selection when switching modes? 
                // Usually convenient to keep "Wisdom" selected if switching from Save to Check.
                // Keeping selection for now.
            });
        }
    }).render(true);
})();