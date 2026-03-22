// Macro Name: Light Picker (Grid Style)
// Description: Quick UI to toggle common light sources for selected tokens.
// Icon: Core icons/sundries/lights/torch-brown-lit.webp

(async () => {
    const torchAnimation = { "type": "torch", "speed": 1, "intensity": 1, "reverse": false };
    const noAnimation = { "type": "none", "speed": 5, "intensity": 5, "reverse": false };

    const lightSources = [
        { id: "none", label: "None", data: { "light.dim": 0, "light.bright": 0, "light.angle": 360, "light.luminosity": 0.5, "light.animation": noAnimation } },
        { id: "torch", label: "Torch", data: { "light.dim": 40, "light.bright": 20, "light.angle": 360, "light.luminosity": 0.5, "light.animation": torchAnimation } },
        { id: "light", label: "Light Cantrip", data: { "light.dim": 40, "light.bright": 20, "light.angle": 360, "light.luminosity": 0.5, "light.animation": noAnimation } },
        { id: "lamp", label: "Lamp", data: { "light.dim": 45, "light.bright": 15, "light.angle": 360, "light.luminosity": 0.5, "light.animation": torchAnimation } },
        { id: "bullseye", label: "Bullseye Lantern", data: { "light.dim": 120, "light.bright": 60, "light.angle": 45, "light.luminosity": 0.5, "light.animation": torchAnimation } },
        { id: "hoodedOpen", label: "Hooded (Open)", data: { "light.dim": 60, "light.bright": 30, "light.angle": 360, "light.luminosity": 0.5, "light.animation": torchAnimation } },
        { id: "hoodedClosed", label: "Hooded (Closed)", data: { "light.dim": 5, "light.bright": 0, "light.angle": 360, "light.luminosity": 0.5, "light.animation": torchAnimation } },
        { id: "ffire", label: "Faerie Fire", data: { "light.dim": 8, "light.bright": 0, "light.angle": 360, "light.luminosity": 0.5, "light.animation": torchAnimation } },
        { id: "darkness", label: "Darkness Spell", data: { "light.dim": 0, "light.bright": 15, "light.angle": 360, "light.luminosity": -0.15, "light.animation": noAnimation } },
        { id: "candle", label: "Candle", data: { "light.dim": 10, "light.bright": 5, "light.angle": 360, "light.luminosity": 0.5, "light.animation": torchAnimation } }
    ];

    const sourceBtns = lightSources.map(s => {
        return `<button type="button" class="light-btn" data-id="${s.id}" title="${s.label}">
            <span class="light-label">${s.label.toUpperCase()}</span>
        </button>`;
    }).join("");

    const content = `
    <style>
        .light-picker-dialog { overflow: visible; font-family: "Signika", sans-serif; }
        
        .light-picker-dialog .msg {
            text-align: center;
            margin-bottom: 10px;
            font-size: 1.1em;
            color: #444;
        }

        .light-picker-dialog .btn-grid { 
            display: grid; 
            grid-template-columns: repeat(2, 1fr); 
            gap: 8px; 
            padding: 0 10px;
        }

        .light-picker-dialog button {
            cursor: pointer; border: 1px solid #7a7971; background: rgba(0,0,0,0.05);
            height: 48px; display: flex; align-items: center; justify-content: center;
            transition: all 0.1s ease; border-radius: 3px;
        }

        .light-picker-dialog .light-label { 
            font-size: 0.85em; 
            font-weight: 800; 
            color: #333;
            text-align: center;
            line-height: 1.1;
        }

        .light-picker-dialog button:hover { 
            background: rgba(255, 100, 0, 0.1); 
            border: 1px solid #ff6400; 
        }
        
        .light-picker-dialog button:hover .light-label {
            color: #ff6400;
        }
    </style>
    
    <div class="light-picker-dialog">
        <div class="msg">Select a light source for controlled tokens:</div>
        <div class="btn-grid">${sourceBtns}</div>
    </div>
    `;

    new Dialog({
        title: "Token Light Picker",
        content: content,
        buttons: {
            close: {
                icon: '<i class="fas fa-times"></i>',
                label: "Close"
            }
        },
        default: "close",
        render: (html) => {
            html.find('.light-btn').click(async ev => {
                const id = $(ev.currentTarget).data('id');
                const source = lightSources.find(s => s.id === id);
                if (!source) return;

                const targets = canvas.tokens.controlled;
                if (targets.length === 0) return ui.notifications.warn("No tokens selected!");

                const updates = targets.map(t => ({
                    _id: t.id,
                    ...source.data
                }));

                await canvas.scene.updateEmbeddedDocuments("Token", updates);
                ui.notifications.info(`Applied ${source.label} to ${targets.length} tokens.`);
            });
        }
    }, { width: 320 }).render(true);
})();