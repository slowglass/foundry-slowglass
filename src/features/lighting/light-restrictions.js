import { MODULE_NAME } from "../../lib/constants.js";

// Helper to inject Slowglass Light Tag field into light config sheets
function injectLightTagField(app, html) {
    const element = html.jquery ? html[0] : html;
    if (!element) return;

    // Check if we already injected it to avoid duplicates
    if (element.querySelector('input[name="flags.foundry-slowglass.lightTag"]')) return;

    const doc = app.document || app.object;
    if (!doc) return;

    const lightTag = doc.getFlag(MODULE_NAME, "lightTag") || "";

    const dimInput = element.querySelector('input[name="config.dim"]') 
      || element.querySelector('input[name="dim"]')
      || element.querySelector('input[name="light.dim"]');

    const formGroup = dimInput?.closest('.form-group');
    if (!formGroup) return;

    const htmlString = `
        <div class="form-group">
            <label>Slowglass Light Tag</label>
            <div class="form-fields">
                <input type="text" name="flags.foundry-slowglass.lightTag" value="${lightTag}" placeholder="e.g. ForEllen">
            </div>
            <p class="notes">Add a tag to this light. Restrict visibility of tagged lights using the Restrict Light Macro.</p>
        </div>
    `;
    formGroup.insertAdjacentHTML('afterend', htmlString);
}

export function readyLightRestrictions() {
    Hooks.on("renderTokenConfig", (app, html) => {
        injectLightTagField(app, html);
    });

    Hooks.on("renderAmbientLightConfig", (app, html) => {
        injectLightTagField(app, html);
    });

    // Patch LightSource.prototype.disabled to filter based on controlled tokens
    try {
        const PointSourceClass = foundry?.canvas?.sources?.PointSource || globalThis.PointSource;
        const LightSourceClass = foundry?.canvas?.sources?.PointLightSource 
          || foundry?.canvas?.sources?.LightSource 
          || globalThis.LightSource;
        const BaseLightSourceClass = foundry?.canvas?.sources?.BaseLightSource || globalThis.BaseLightSource;

        if (LightSourceClass && LightSourceClass.prototype.initialize) {
            console.log("Slowglass Helper | Patching LightSource initialize...");
            const originalInitialize = LightSourceClass.prototype.initialize;

            LightSourceClass.prototype.initialize = function(data) {
                const res = originalInitialize.call(this, data);

                // Dynamically traverse prototype chain to find descriptors
                let activeDescriptor = null;
                let disabledDescriptor = null;
                
                let proto = Object.getPrototypeOf(this);
                while (proto && proto !== Object.prototype) {
                    if (!activeDescriptor) activeDescriptor = Object.getOwnPropertyDescriptor(proto, "active");
                    if (!disabledDescriptor) disabledDescriptor = Object.getOwnPropertyDescriptor(proto, "disabled");
                    proto = Object.getPrototypeOf(proto);
                }

                const originalActiveGetter = activeDescriptor?.get;
                const originalDisabledGetter = disabledDescriptor?.get;
                const originalDisabledSetter = disabledDescriptor?.set;

                const oldDisabledVal = this.disabled;
                this._disabled = oldDisabledVal;

                // Redefine disabled on the instance itself to prevent shadowing
                Object.defineProperty(this, "disabled", {
                    get() {
                        const isDisabled = originalDisabledGetter ? originalDisabledGetter.call(this) : this._disabled;
                        if (isDisabled) return true;

                        try {
                            const doc = this.object?.document;
                            if (!doc) return false;

                            const lightTag = doc.getFlag(MODULE_NAME, "lightTag");
                            if (!lightTag) return false;

                            const scene = doc.parent instanceof Scene ? doc.parent : canvas.scene;
                            if (!scene) return false;

                            const restrictions = scene.getFlag(MODULE_NAME, "lightRestrictions") || {};
                            const allowed = restrictions[lightTag];

                            if (!allowed || allowed.length === 0) return false;

                            const controlled = canvas.tokens.controlled;
                            let viewerTokens = [];

                            if (controlled.length > 0) {
                                viewerTokens = controlled;
                            } else {
                                if (game.user.isGM) return false;
                                const characterTokens = game.user.character?.getActiveTokens() || [];
                                if (characterTokens.length > 0) {
                                    viewerTokens = characterTokens;
                                } else {
                                    return true;
                                }
                            }

                            const isAllowed = viewerTokens.some(t => {
                                const name = t.name;
                                const actorName = t.actor?.name;
                                return allowed.includes(name) || allowed.includes(actorName);
                            });

                            return !isAllowed;
                        } catch (err) {
                            console.error("Slowglass Helper | Error in lightSource.disabled override:", err);
                        }

                        return false;
                    },
                    set(value) {
                        if (originalDisabledSetter) {
                            originalDisabledSetter.call(this, value);
                        } else {
                            this._disabled = value;
                        }
                    },
                    configurable: true,
                    enumerable: true
                });

                // Redefine active on the instance itself to prevent rendering
                Object.defineProperty(this, "active", {
                    get() {
                        const isOriginalActive = originalActiveGetter ? originalActiveGetter.call(this) : !this.disabled;
                        if (!isOriginalActive) return false;

                        try {
                            const doc = this.object?.document;
                            if (!doc) return true;

                            const lightTag = doc.getFlag(MODULE_NAME, "lightTag");
                            if (!lightTag) return true;

                            const scene = doc.parent instanceof Scene ? doc.parent : canvas.scene;
                            if (!scene) return true;

                            const restrictions = scene.getFlag(MODULE_NAME, "lightRestrictions") || {};
                            const allowed = restrictions[lightTag];

                            if (!allowed || allowed.length === 0) return true;

                            const controlled = canvas.tokens.controlled;
                            let viewerTokens = [];

                            if (controlled.length > 0) {
                                viewerTokens = controlled;
                            } else {
                                if (game.user.isGM) return true;
                                const characterTokens = game.user.character?.getActiveTokens() || [];
                                if (characterTokens.length > 0) {
                                    viewerTokens = characterTokens;
                                } else {
                                    return false;
                                }
                            }

                            const isAllowed = viewerTokens.some(t => {
                                const name = t.name;
                                const actorName = t.actor?.name;
                                return allowed.includes(name) || allowed.includes(actorName);
                            });

                            const finalResult = isAllowed;
                            console.log(`Slowglass Helper | LightSource ${this.object?.name} (${lightTag}) active check for viewer ${viewerTokens.map(t => t.name).join(", ")} -> active: ${finalResult}`);
                            return finalResult;
                        } catch (err) {
                            console.error("Slowglass Helper | Error in lightSource.active override:", err);
                        }

                        return true;
                    },
                    configurable: true,
                    enumerable: true
                });

                return res;
            };
        } else {
            console.warn("Slowglass Helper | LightSource class or initialize method not found, skipping patch.");
        }
    } catch (err) {
        console.error("Slowglass Helper | Failed to patch LightSource.prototype.disabled:", err);
    }

    // Force lighting updates on control changes
    Hooks.on("controlToken", () => {
        canvas.perception.update({ initializeLighting: true, initializeVision: true });
    });
    Hooks.on("releaseToken", () => {
        canvas.perception.update({ initializeLighting: true, initializeVision: true });
    });
}
