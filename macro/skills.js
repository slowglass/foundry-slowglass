/**
 * Macro: Request Skill Checks (foundry-slowglass)
 * Presents a fully icon-based dialog to request Skill Checks.
 */

(async () => {
    const MODULE_NAME = "foundry-slowglass";
    const ASSET_PATH = "modules/foundry-slowglass/assets/icons";
    const DEFAULT_ICON = "icons/dice/d20black.svg";

    // 1. Icon Configuration Arrays
    const SKILL_ICONS = {
        acr: `${ASSET_PATH}/skill/acrobatics.svg`,
        ani: `${ASSET_PATH}/skill/animal-handling.svg`,
        arc: `${ASSET_PATH}/skill/arcana.svg`,
        ath: `${ASSET_PATH}/skill/athletics.svg`,
        dec: `${ASSET_PATH}/skill/deception.svg`,
        his: `${ASSET_PATH}/skill/history.svg`,
        ins: `${ASSET_PATH}/skill/insight.svg`,
        itm: `${ASSET_PATH}/skill/intimidation.svg`,
        inv: `${ASSET_PATH}/skill/investigation.svg`,
        med: `${ASSET_PATH}/skill/medicine.svg`,
        nat: `${ASSET_PATH}/skill/nature.svg`,
        prc: `${ASSET_PATH}/skill/perception.svg`,
        prf: `${ASSET_PATH}/skill/performance.svg`,
        per: `${ASSET_PATH}/skill/persuasion.svg`,
        rel: `${ASSET_PATH}/skill/religion.svg`,
        slt: `${ASSET_PATH}/skill/sleight-of-hand.svg`,
        ste: `${ASSET_PATH}/skill/stealth.svg`,
        sur: `${ASSET_PATH}/skill/survival.svg`
    };

    const ADV_ICONS = {
        advantage: `${ASSET_PATH}/dice/advantage.svg`,
        normal: `${ASSET_PATH}/dice/d20.svg`,
        disadvantage: `${ASSET_PATH}/dice/disadvantage.svg`
    };

    // 2. Gather Data from CONFIG
    const skills = CONFIG.DND5E.skills;

    // 3. Build Category Data (Icon-based Buttons)
    const advBtnHtml = Object.entries(ADV_ICONS).map(([mode, icon]) => {
        const label = mode.charAt(0).toUpperCase() + mode.slice(1);
        return `<button type="button" class="adv-btn ${mode === 'normal' ? 'active' : ''}" data-adv="${mode}" title="${label}">
            <img src="${icon}" />
        </button>`;
    }).join("");

    const skillBtns = Object.entries(skills)
        .sort((a, b) => a[1].label.localeCompare(b[1].label))
        .map(([id, data]) => {
            const icon = SKILL_ICONS[id] || DEFAULT_ICON;
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
            gap: 0px; 
            margin-bottom: 20px; 
            width: 100%;
            padding: 0 10px;
            margin-left: 0;
            margin-right: 0;
        }
        
        .roll-request-dialog .mode-selection {
            display: flex;
            justify-content: center;
            gap: 0px;
            width: 100%;
            margin-bottom: 20px;
        }

        .roll-request-dialog .mode-divider {
            width: 1px;
            height: 100%;
            background: #7a7971;
            margin: 0 auto;
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
            gap: 0px;
            max-height: 400px; 
            overflow-y: auto; 
            margin-top: 10px;
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
            ${advBtnHtml}
        </div>
        <input type="hidden" id="roll-type" value="skill">
        <input type="hidden" id="roll-adv" value="normal">

        <div id="selection-grid" class="btn-grid">
            ${skillBtns}
        </div>
        <input type="hidden" id="roll-id" value="">

        <div class="actor-grid">
            ${actorPortraits || "<em>No player characters found.</em>"}
        </div>
    </div>
    `;

    // 6. Render Dialog
    new Dialog({
        title: "Request Skill Check",
        content: content,
        buttons: {
            request: {
                icon: '<i class="fas fa-bullhorn"></i>',
                label: "Request",
                callback: (html) => {
                    const rollType = "skill";
                    const advantageMode = html.find('#roll-adv').val();
                    const id = html.find('#roll-id').val();
                    const selectedUuids = html.find('.actor-portrait.active').map((i, el) => $(el).data('uuid')).get();

                    if (!id) {
                        ui.notifications.warn("No Skill selected.");
                        return false;
                    }
                    if (selectedUuids.length === 0) {
                        ui.notifications.warn("No actors selected.");
                        return false;
                    }

                    game.socket.emit("module." + MODULE_NAME, {
                        type: "requestRoll",
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
            const advBtns = html.find('.adv-btn');
            const selectionGrid = html.find('#selection-grid');
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
        }
    }).render(true);
})();