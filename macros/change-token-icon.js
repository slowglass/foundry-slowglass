// Macro Name: Change Token Icon
// Description: Opens a picker to change the selected token's icon from a predefined list.
// Icon: icons/svg/image.svg

/**
 * Macro to change the icon of the selected token.
 * 
 * Instructions:
 * - Select one or more tokens on the canvas.
 * - Run this macro.
 * - Click on an icon in the tray to apply it to all selected tokens.
 */

(async () => {
    const SELECTED_TOKENS = canvas.tokens.controlled;

    if (SELECTED_TOKENS.length === 0) {
        ui.notifications.warn("Please select at least one token first.");
        return;
    }

    // Configuration: List of icons to show in the picker
    // Prefix with "Core:" for core Foundry icons or "User:" for custom assets.
    // The macro resolves these to absolute paths.
    const ICONS = [
        "Core:icons/svg/dice-target.svg",
        "Core:icons/svg/blood.svg",
        "Core:icons/svg/hazard.svg",
        "Core:icons/svg/invisible.svg",
        "Core:icons/svg/paralysis.svg",
        "Core:icons/svg/poison.svg",
        "Core:icons/svg/skull.svg",
        "Core:icons/svg/sleep.svg",
        "Core:icons/svg/stun.svg",
        "Core:icons/svg/tank.svg",
        "Core:icons/svg/trap.svg",
        "Core:icons/svg/upgrade.svg",
        "Core:icons/svg/target.svg",
        "Core:icons/svg/fire.svg",
        "Core:icons/svg/acid.svg",
        "Core:icons/svg/combat.svg",
        "Core:icons/svg/clockwork.svg",
        "Core:icons/svg/light.svg",
        "Core:icons/svg/mystery-man.svg",
        "User:modules/foundry-slowglass/icons/other/select-token.png"
    ];

    // Helper to resolve the icon path from the Core: or User: prefix
    const resolvePath = (p) => p.replace(/^(Core:|User:)/i, "");

    // Get current icon of the primary selected token (first one)
    const currentIcon = SELECTED_TOKENS[0].document.texture.src;

    // Generate Grid HTML
    let gridHtml = `
    <style>
        #token-icon-picker {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 12px;
            max-height: 450px;
            overflow-y: auto;
            padding: 15px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .token-icon-option {
            cursor: pointer;
            position: relative;
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 8px;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            background: rgba(255, 255, 255, 0.03);
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .token-icon-option:hover {
            border-color: #ff6400;
            background: rgba(255, 100, 0, 0.15);
            transform: translateY(-2px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
            z-index: 1;
        }
        .token-icon-option.selected {
            border-color: #00ffcc;
            background: rgba(0, 255, 204, 0.1);
            box-shadow: 0 0 15px rgba(0, 255, 204, 0.2);
        }
        .token-icon-option.selected::after {
            content: '\u2713';
            position: absolute;
            top: -6px;
            right: -6px;
            background: #00ffcc;
            color: #000;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            font-size: 11px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .token-icon-option img {
            width: 100%;
            height: auto;
            aspect-ratio: 1/1;
            object-fit: contain;
            display: block;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
        }
        .token-icon-option .icon-tooltip {
            position: absolute;
            bottom: -25px;
            left: 50%;
            transform: translateX(-50%);
            background: #111;
            color: #eee;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 10px;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s;
            border: 1px solid #333;
            z-index: 10;
        }
        .token-icon-option:hover .icon-tooltip {
            opacity: 1;
        }
    </style>
    <div id="token-icon-picker">
    `;

    ICONS.forEach(iconStr => {
        const path = resolvePath(iconStr);
        const isSelected = path === currentIcon;
        const fileName = iconStr.split('/').pop();
        
        gridHtml += `
        <div class="token-icon-option ${isSelected ? 'selected' : ''}" data-path="${path}">
            <img src="${path}" />
            <div class="icon-tooltip">${iconStr}</div>
        </div>
        `;
    });

    gridHtml += `</div>`;

    const d = new Dialog({
        title: `Change Token Icon: ${SELECTED_TOKENS.length === 1 ? SELECTED_TOKENS[0].name : SELECTED_TOKENS.length + " Tokens"}`,
        content: gridHtml,
        buttons: {
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel"
            }
        },
        default: "cancel",
        render: (html) => {
            html.find('.token-icon-option').click(async (ev) => {
                const newPath = ev.currentTarget.dataset.path;
                
                // Perform the update
                const updates = SELECTED_TOKENS.map(t => ({
                    _id: t.id,
                    "texture.src": newPath
                }));
                
                try {
                    // Update all selected tokens in the scene
                    await canvas.scene.updateEmbeddedDocuments("Token", updates);
                    ui.notifications.info(`Updated icon for ${SELECTED_TOKENS.length} token(s).`);
                } catch (err) {
                    ui.notifications.error("Failed to update token icon.");
                    console.error("Change Token Icon Macro Error:", err);
                }
                
                // Close dialog
                d.close();
            });
        }
    }, { 
        width: 480, 
        height: "auto", 
        id: "token-icon-picker-dialog",
        classes: ["slowglass-dialog", "token-picker-dialog"] 
    });

    d.render(true);
})();
