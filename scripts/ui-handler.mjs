import { MODULE_ID, SETTINGS_KEYS } from "./constants.mjs";
import { getSetting } from "./settings.mjs";
import { FatePointManager } from "./fate-point-manager.mjs";
import { log, localize, format } from "./utils.mjs";

/**
 * Handles UI rendering and interactions for fate/ruin points in the player list
 */
export class UIHandler {
    
    /**
     * Refresh the player list to update fate/ruin point display
     */
    static refresh() {
        if (ui.players?.rendered) {
            ui.players.render();
        }
    }

    /**
     * Hook handler for renderPlayers
     * @param {Application} app - The Players application
     * @param {HTMLElement} html - The rendered HTML
     * @param {object} data - The render data
     */
    static onRenderPlayers(app, html, data) {
        log("debug", "Rendering fate/ruin points in player list");

        // Find all player list items
        const playerLis = html.querySelectorAll("li[data-user-id]");
        
        for (const li of playerLis) {
            const userId = li.dataset.userId;
            const user = game.users.get(userId);
            
            if (!user) continue;

            // Check if this is a GM user
            if (FatePointManager.isGM(user)) {
                // GMs get Ruin display
                this._addRuinDisplay(li, user);
            } else {
                // Players get Fate display
                const fateData = FatePointManager.getFatePoints(user);
                if (fateData) {
                    this._addFateDisplay(li, user, fateData);
                }
            }
        }
    }

    /**
     * Add Ruin display for GM
     * @param {HTMLElement} li - The list item element
     * @param {User} user - The GM user
     * @private
     */
    static _addRuinDisplay(li, user) {
        const ruinData = FatePointManager.getRuinPoints();
        const showMax = getSetting(SETTINGS_KEYS.SHOW_MAX_FATE);
        
        // Create Ruin display container
        const container = document.createElement("div");
        container.classList.add("impmal-fate-container", "ruin-container");
        container.dataset.userId = user.id;

        // Create Ruin icon (skull/chaos themed)
        const icon = document.createElement("i");
        icon.classList.add("fas", "fa-skull", "ruin-icon");

        // Create Ruin value display
        const valueDisplay = document.createElement("span");
        valueDisplay.classList.add("fate-value", "ruin-value");
        
        if (showMax) {
            valueDisplay.textContent = `${ruinData.current}/${ruinData.max}`;
        } else {
            valueDisplay.textContent = ruinData.current.toString();
        }

        // Only GM can interact with Ruin, and only their own
        const canInteract = game.user.isGM && user.isSelf;
        const canUse = canInteract && ruinData.current > 0;
        
        // Set up tooltip
        let tooltipText = format("Tooltip.RuinPoints", { 
            current: ruinData.current,
            max: ruinData.max
        });

        if (canUse) {
            tooltipText += "\n" + localize("Tooltip.ClickToUseRuin");
            container.classList.add("interactive");
        }

        if (canInteract) {
            tooltipText += "\n" + localize("Tooltip.CtrlClickToAddRuin");
            tooltipText += "\n" + localize("Tooltip.CtrlRightClickToRemoveRuin");
        }

        container.dataset.tooltip = tooltipText;
        container.dataset.tooltipDirection = "UP";

        // Add click handlers for GM
        if (canInteract) {
            container.style.cursor = "pointer";
            container.addEventListener("click", (event) => this._onRuinClick(event));
            container.addEventListener("contextmenu", (event) => this._onRuinRightClick(event));
        }

        // Style based on Ruin availability
        if (ruinData.current === 0) {
            container.classList.add("exhausted");
        } else if (ruinData.current === ruinData.max) {
            container.classList.add("full");
        }

        // Assemble the display
        container.appendChild(icon);
        container.appendChild(valueDisplay);

        // Add GM controls if this is the current user and they're GM
        if (game.user.isGM && user.isSelf) {
            const controls = this._createRuinControls();
            container.appendChild(controls);
        }

        // Find player name element and insert after it
        const playerName = li.querySelector(".player-name") || li.querySelector("span");
        if (playerName) {
            playerName.after(container);
        } else {
            li.appendChild(container);
        }
    }

    /**
     * Add fate point display to a player list item
     * @param {HTMLElement} li - The list item element
     * @param {User} user - The user
     * @param {{current: number, max: number}} fateData - The fate point data
     * @private
     */
    static _addFateDisplay(li, user, fateData) {
        const showMax = getSetting(SETTINGS_KEYS.SHOW_MAX_FATE);
        const allowPlayerUse = getSetting(SETTINGS_KEYS.ALLOW_PLAYER_USE);
        
        // Create fate display container
        const container = document.createElement("div");
        container.classList.add("impmal-fate-container", "fate-container");
        container.dataset.userId = user.id;

        // Create fate icon
        const icon = document.createElement("img");
        icon.src = "icons/magic/holy/angel-winged-humanoid-blue.webp";
        icon.alt = localize("FatePoints");
        icon.classList.add("fate-icon");

        // Create fate value display
        const valueDisplay = document.createElement("span");
        valueDisplay.classList.add("fate-value");
        
        if (showMax) {
            valueDisplay.textContent = `${fateData.current}/${fateData.max}`;
        } else {
            valueDisplay.textContent = fateData.current.toString();
        }

        // Determine if this user can interact with fate
        const canInteract = this._canInteractWithFate(user);
        const canUse = canInteract && fateData.current > 0;
        
        // Set up tooltip
        let tooltipText = format("Tooltip.FatePoints", { 
            characterName: FatePointManager.getPlayerCharacter(user)?.name ?? "Unknown",
            current: fateData.current,
            max: fateData.max
        });

        if (canUse) {
            tooltipText += "\n" + localize("Tooltip.ClickToUse");
            container.classList.add("interactive");
        }

        if (game.user.isGM) {
            tooltipText += "\n" + localize("Tooltip.CtrlClickToAdd");
            tooltipText += "\n" + localize("Tooltip.CtrlRightClickToRemove");
        }

        container.dataset.tooltip = tooltipText;
        container.dataset.tooltipDirection = "UP";

        // Add click handlers
        if (canUse || game.user.isGM) {
            container.style.cursor = "pointer";
            container.addEventListener("click", (event) => this._onFateClick(event, user));
            container.addEventListener("contextmenu", (event) => this._onFateRightClick(event, user));
        }

        // Style based on fate availability
        if (fateData.current === 0) {
            container.classList.add("exhausted");
        } else if (fateData.current === fateData.max) {
            container.classList.add("full");
        }

        // Assemble the display
        container.appendChild(icon);
        container.appendChild(valueDisplay);

        // Add GM controls if user is GM
        if (game.user.isGM) {
            const controls = this._createFateControls(user);
            container.appendChild(controls);
        }

        // Find player name element and insert after it
        const playerName = li.querySelector(".player-name") || li.querySelector("span");
        if (playerName) {
            playerName.after(container);
        } else {
            li.appendChild(container);
        }
    }

    /**
     * Create GM control buttons for Ruin
     * @returns {HTMLElement} The controls container
     * @private
     */
    static _createRuinControls() {
        const controls = document.createElement("div");
        controls.classList.add("fate-gm-controls", "ruin-controls");

        // Add button
        const addBtn = document.createElement("a");
        addBtn.classList.add("fate-control", "ruin-add");
        addBtn.innerHTML = '<i class="fas fa-plus"></i>';
        addBtn.title = localize("Controls.AddRuin");
        addBtn.addEventListener("click", async (event) => {
            event.stopPropagation();
            await FatePointManager.addRuin();
        });

        // Remove button
        const removeBtn = document.createElement("a");
        removeBtn.classList.add("fate-control", "ruin-remove");
        removeBtn.innerHTML = '<i class="fas fa-minus"></i>';
        removeBtn.title = localize("Controls.RemoveRuin");
        removeBtn.addEventListener("click", async (event) => {
            event.stopPropagation();
            await FatePointManager.removeRuin();
        });

        controls.appendChild(addBtn);
        controls.appendChild(removeBtn);

        return controls;
    }

    /**
     * Create GM control buttons for Fate
     * @param {User} user - The user
     * @returns {HTMLElement} The controls container
     * @private
     */
    static _createFateControls(user) {
        const controls = document.createElement("div");
        controls.classList.add("fate-gm-controls");

        // Add button
        const addBtn = document.createElement("a");
        addBtn.classList.add("fate-control", "fate-add");
        addBtn.innerHTML = '<i class="fas fa-plus"></i>';
        addBtn.title = localize("Controls.AddFate");
        addBtn.addEventListener("click", async (event) => {
            event.stopPropagation();
            await FatePointManager.addFate(user);
        });

        // Remove button
        const removeBtn = document.createElement("a");
        removeBtn.classList.add("fate-control", "fate-remove");
        removeBtn.innerHTML = '<i class="fas fa-minus"></i>';
        removeBtn.title = localize("Controls.RemoveFate");
        removeBtn.addEventListener("click", async (event) => {
            event.stopPropagation();
            await FatePointManager.removeFate(user);
        });

        controls.appendChild(addBtn);
        controls.appendChild(removeBtn);

        return controls;
    }

    /**
     * Check if the current user can interact with another user's fate
     * @param {User} targetUser - The target user
     * @returns {boolean} Whether interaction is allowed
     * @private
     */
    static _canInteractWithFate(targetUser) {
        // GMs can always interact with player fate
        if (game.user.isGM) return true;

        // Check if players are allowed to use fate from UI
        if (!getSetting(SETTINGS_KEYS.ALLOW_PLAYER_USE)) return false;

        // Players can only use their own fate
        return targetUser.id === game.user.id;
    }

    /**
     * Handle left click on Ruin display
     * @param {MouseEvent} event - The click event
     * @private
     */
    static async _onRuinClick(event) {
        event.preventDefault();
        event.stopPropagation();

        // Ctrl+click to add Ruin
        if (event.ctrlKey) {
            await FatePointManager.addRuin();
            return;
        }

        // Regular click to use Ruin
        const ruinData = FatePointManager.getRuinPoints();
        if (ruinData.current <= 0) {
            log("debug", "Cannot use Ruin - none available");
            return;
        }

        // Confirm Ruin use with dialog
        const confirmed = await this._confirmRuinUse();
        
        if (confirmed) {
            await FatePointManager.useRuin();
        }
    }

    /**
     * Handle right click on Ruin display
     * @param {MouseEvent} event - The click event
     * @private
     */
    static async _onRuinRightClick(event) {
        event.preventDefault();
        event.stopPropagation();

        // Only GMs can right-click to remove
        if (!game.user.isGM) return;

        // Ctrl+right-click to remove Ruin
        if (event.ctrlKey) {
            await FatePointManager.removeRuin();
        }
    }

    /**
     * Handle left click on fate display
     * @param {MouseEvent} event - The click event
     * @param {User} user - The user whose fate was clicked
     * @private
     */
    static async _onFateClick(event, user) {
        event.preventDefault();
        event.stopPropagation();

        // Ctrl+click for GM to add fate
        if (event.ctrlKey && game.user.isGM) {
            await FatePointManager.addFate(user);
            return;
        }

        // Regular click to use fate
        const fateData = FatePointManager.getFatePoints(user);
        if (!fateData || fateData.current <= 0) {
            log("debug", "Cannot use fate - none available");
            return;
        }

        // Check if user can use this fate
        if (!this._canInteractWithFate(user)) {
            log("debug", "Cannot use fate - not authorized");
            return;
        }

        // Confirm fate use with dialog
        const character = FatePointManager.getPlayerCharacter(user);
        const confirmed = await this._confirmFateUse(character);
        
        if (confirmed) {
            await FatePointManager.useFate(user);
        }
    }

    /**
     * Handle right click on fate display
     * @param {MouseEvent} event - The click event
     * @param {User} user - The user whose fate was clicked
     * @private
     */
    static async _onFateRightClick(event, user) {
        event.preventDefault();
        event.stopPropagation();

        // Only GMs can right-click to remove
        if (!game.user.isGM) return;

        // Ctrl+right-click to remove fate
        if (event.ctrlKey) {
            await FatePointManager.removeFate(user);
        }
    }

    /**
     * Show confirmation dialog for using fate
     * @param {Actor} character - The character using fate
     * @returns {Promise<boolean>} Whether the user confirmed
     * @private
     */
    static async _confirmFateUse(character) {
        return foundry.applications.api.DialogV2.confirm({
            window: { 
                title: localize("Dialog.UseFateTitle") 
            },
            content: format("Dialog.UseFateContent", { 
                characterName: character?.name ?? "Unknown" 
            }),
            yes: {
                label: localize("Dialog.Confirm"),
                icon: "fas fa-check"
            },
            no: {
                label: localize("Dialog.Cancel"),
                icon: "fas fa-times"
            },
            defaultYes: false
        });
    }

    /**
     * Show confirmation dialog for using Ruin
     * @returns {Promise<boolean>} Whether the user confirmed
     * @private
     */
    static async _confirmRuinUse() {
        return foundry.applications.api.DialogV2.confirm({
            window: { 
                title: localize("Dialog.UseRuinTitle") 
            },
            content: localize("Dialog.UseRuinContent"),
            yes: {
                label: localize("Dialog.ConfirmRuin"),
                icon: "fas fa-skull"
            },
            no: {
                label: localize("Dialog.Cancel"),
                icon: "fas fa-times"
            },
            defaultYes: false
        });
    }
}
