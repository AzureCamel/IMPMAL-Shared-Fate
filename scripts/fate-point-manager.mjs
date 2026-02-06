import { MODULE_ID, SETTINGS_KEYS } from "./constants.mjs";
import { getSetting, setSetting } from "./settings.mjs";
import { log, notify, format } from "./utils.mjs";

/**
 * Manages fate point operations and syncing between character sheets and the UI
 * Also manages GM Ruin points which are independent from any character
 */
export class FatePointManager {
    
    /**
     * Initialize the fate point manager
     */
    static initialize() {
        log("info", "FatePointManager initialized");
    }

    /**
     * Check if a user is a GM
     * @param {User} user - The user to check
     * @returns {boolean} True if GM
     */
    static isGM(user) {
        return user.isGM;
    }

    /**
     * Get the character actor assigned to a user (non-GM only)
     * @param {User} user - The user to get the character for
     * @returns {Actor|null} The character actor or null
     */
    static getPlayerCharacter(user) {
        if (!user) return null;
        
        // GMs don't have linked characters for this module
        if (this.isGM(user)) return null;
        
        // First check if user has a directly assigned character
        if (user.character && user.character.type === "character") {
            return user.character;
        }

        // Fallback: find a character this user owns
        const ownedCharacter = game.actors.find(a => 
            a.type === "character" && 
            a.hasPlayerOwner && 
            a.testUserPermission(user, "OWNER")
        );

        return ownedCharacter || null;
    }

    /**
     * Get fate points for a user's character (players only)
     * @param {User} user - The user to get fate points for
     * @returns {{current: number, max: number}|null} Fate point data or null
     */
    static getFatePoints(user) {
        // GMs use Ruin, not Fate
        if (this.isGM(user)) return null;
        
        const character = this.getPlayerCharacter(user);
        if (!character) return null;

        const fate = character.system?.fate;
        if (!fate) return null;

        return {
            current: fate.value ?? 0,
            max: fate.max ?? 0
        };
    }

    /**
     * Get Ruin points for GM
     * @returns {{current: number, max: number}} Ruin point data
     */
    static getRuinPoints() {
        return {
            current: getSetting(SETTINGS_KEYS.GM_RUIN) ?? 0,
            max: getSetting(SETTINGS_KEYS.GM_RUIN_MAX) ?? 5
        };
    }

    /**
     * Use Ruin point (GM only)
     * @param {number} [amount=1] - Amount of Ruin to use
     * @param {object} [options] - Additional options
     * @param {boolean} [options.chatMessage=true] - Whether to show a chat message
     * @returns {Promise<boolean>} Whether the operation succeeded
     */
    static async useRuin(amount = 1, options = {}) {
        const { chatMessage = getSetting(SETTINGS_KEYS.SHOW_CHAT_MESSAGES) } = options;

        if (!game.user.isGM) {
            notify("GMOnly", "warn");
            return false;
        }

        const ruinData = this.getRuinPoints();
        if (ruinData.current < amount) {
            notify("InsufficientRuin", "warn");
            return false;
        }

        const newValue = Math.max(0, ruinData.current - amount);

        try {
            await setSetting(SETTINGS_KEYS.GM_RUIN, newValue);

            log("info", "Ruin point used", { amount, newValue });

            if (chatMessage) {
                await this._sendRuinChatMessage("used", amount, newValue, ruinData.max);
            }

            return true;
        } catch (error) {
            log("error", "Failed to use Ruin point", error);
            notify("UpdateFailed", "error");
            return false;
        }
    }

    /**
     * Add Ruin points (GM only)
     * @param {number} [amount=1] - Amount of Ruin to add
     * @param {object} [options] - Additional options
     * @param {boolean} [options.chatMessage=true] - Whether to show a chat message
     * @returns {Promise<boolean>} Whether the operation succeeded
     */
    static async addRuin(amount = 1, options = {}) {
        const { chatMessage = getSetting(SETTINGS_KEYS.SHOW_CHAT_MESSAGES) } = options;

        if (!game.user.isGM) {
            notify("GMOnly", "warn");
            return false;
        }

        const ruinData = this.getRuinPoints();
        const newValue = Math.min(ruinData.max, ruinData.current + amount);

        try {
            await setSetting(SETTINGS_KEYS.GM_RUIN, newValue);

            log("info", "Ruin point added", { amount, newValue });

            if (chatMessage) {
                await this._sendRuinChatMessage("added", amount, newValue, ruinData.max);
            }

            return true;
        } catch (error) {
            log("error", "Failed to add Ruin point", error);
            notify("UpdateFailed", "error");
            return false;
        }
    }

    /**
     * Remove Ruin points (GM only)
     * @param {number} [amount=1] - Amount of Ruin to remove
     * @param {object} [options] - Additional options
     * @param {boolean} [options.chatMessage=true] - Whether to show a chat message
     * @returns {Promise<boolean>} Whether the operation succeeded
     */
    static async removeRuin(amount = 1, options = {}) {
        const { chatMessage = getSetting(SETTINGS_KEYS.SHOW_CHAT_MESSAGES) } = options;

        if (!game.user.isGM) {
            notify("GMOnly", "warn");
            return false;
        }

        const ruinData = this.getRuinPoints();
        const newValue = Math.max(0, ruinData.current - amount);

        try {
            await setSetting(SETTINGS_KEYS.GM_RUIN, newValue);

            log("info", "Ruin point removed", { amount, newValue });

            if (chatMessage) {
                await this._sendRuinChatMessage("removed", amount, newValue, ruinData.max);
            }

            return true;
        } catch (error) {
            log("error", "Failed to remove Ruin point", error);
            notify("UpdateFailed", "error");
            return false;
        }
    }

    /**
     * Use fate points for a user's character
     * @param {User} user - The user whose character should use fate
     * @param {number} [amount=1] - Amount of fate to use
     * @param {object} [options] - Additional options
     * @returns {Promise<boolean>} Whether the operation succeeded
     */
    static async useFate(user, amount = 1, options = {}) {
        // Validate user can use fate
        if (!this._canUseFate(user)) {
            notify("CannotUseFate", "warn");
            return false;
        }

        const character = this.getPlayerCharacter(user);
        if (!character) {
            notify("NoCharacter", "warn");
            return false;
        }

        const fatePoints = this.getFatePoints(user);
        if (!fatePoints || fatePoints.current < amount) {
            notify("InsufficientFate", "warn");
            return false;
        }

        // Calculate new value
        const newValue = Math.max(0, fatePoints.current - amount);

        try {
            // Update the character sheet - the updateActor hook will handle the chat message
            await character.update({
                "system.fate.value": newValue
            });

            log("info", "Fate point used", { 
                user: user.name, 
                character: character.name, 
                amount, 
                newValue 
            });

            return true;
        } catch (error) {
            log("error", "Failed to use fate point", error);
            notify("UpdateFailed", "error");
            return false;
        }
    }

    /**
     * Add fate points to a user's character (GM only)
     * @param {User} user - The user whose character should receive fate
     * @param {number} [amount=1] - Amount of fate to add
     * @param {object} [options] - Additional options
     * @returns {Promise<boolean>} Whether the operation succeeded
     */
    static async addFate(user, amount = 1, options = {}) {
        // Only GMs can add fate
        if (!game.user.isGM) {
            notify("GMOnly", "warn");
            return false;
        }

        const character = this.getPlayerCharacter(user);
        if (!character) {
            notify("NoCharacter", "warn");
            return false;
        }

        const fatePoints = this.getFatePoints(user);
        if (!fatePoints) {
            notify("NoFateData", "warn");
            return false;
        }

        // Calculate new value, capped at max
        const newValue = Math.min(fatePoints.max, fatePoints.current + amount);

        try {
            // Update the character sheet - the updateActor hook will handle the chat message
            await character.update({
                "system.fate.value": newValue
            });

            log("info", "Fate point added", { 
                user: user.name, 
                character: character.name, 
                amount, 
                newValue 
            });

            return true;
        } catch (error) {
            log("error", "Failed to add fate point", error);
            notify("UpdateFailed", "error");
            return false;
        }
    }

    /**
     * Remove fate points from a user's character (GM only)
     * @param {User} user - The user whose character should lose fate
     * @param {number} [amount=1] - Amount of fate to remove
     * @param {object} [options] - Additional options
     * @returns {Promise<boolean>} Whether the operation succeeded
     */
    static async removeFate(user, amount = 1, options = {}) {
        // Only GMs can remove fate
        if (!game.user.isGM) {
            notify("GMOnly", "warn");
            return false;
        }

        const character = this.getPlayerCharacter(user);
        if (!character) {
            notify("NoCharacter", "warn");
            return false;
        }

        const fatePoints = this.getFatePoints(user);
        if (!fatePoints) {
            notify("NoFateData", "warn");
            return false;
        }

        // Calculate new value, minimum 0
        const newValue = Math.max(0, fatePoints.current - amount);

        try {
            // Update the character sheet - the updateActor hook will handle the chat message
            await character.update({
                "system.fate.value": newValue
            });

            log("info", "Fate point removed", { 
                user: user.name, 
                character: character.name, 
                amount, 
                newValue 
            });

            return true;
        } catch (error) {
            log("error", "Failed to remove fate point", error);
            notify("UpdateFailed", "error");
            return false;
        }
    }

    /**
     * Check if a user can use fate points
     * @param {User} user - The user to check
     * @returns {boolean} Whether the user can use fate
     * @private
     */
    static _canUseFate(user) {
        // GMs use Ruin, not Fate from characters
        if (this.isGM(user)) return false;
        
        // Check if players are allowed to use fate from UI
        if (!getSetting(SETTINGS_KEYS.ALLOW_PLAYER_USE)) {
            // Only GMs can use player fate if setting is disabled
            return game.user.isGM;
        }

        // Players can only use their own fate, GMs can use anyone's
        return user.id === game.user.id || game.user.isGM;
    }

    /**
     * Send a chat message for Fate operations
     * @param {"used"|"added"|"removed"} action - The action type
     * @param {User} user - The user
     * @param {Actor} character - The character
     * @param {number} amount - Amount changed
     * @param {number} newValue - New value
     * @param {number} maxValue - Maximum value
     * @private
     */
    static async _sendFateChatMessage(action, user, character, amount, newValue, maxValue) {
        let localeKey;
        switch (action) {
            case "used":
                localeKey = "Chat.UsedFate";
                break;
            case "added":
                localeKey = "Chat.AddedFate";
                break;
            case "removed":
                localeKey = "Chat.RemovedFate";
                break;
            default:
                return;
        }

        const content = format(localeKey, {
            characterName: character.name,
            amount: amount,
            remaining: newValue,
            current: newValue,
            max: maxValue
        });

        await ChatMessage.create({
            content: `<div class="impmal-shared-fate-message fate-message">${content}</div>`,
            speaker: { alias: character.name },
            type: CONST.CHAT_MESSAGE_STYLES.OTHER
        });
    }

    /**
     * Send a chat message when Fate changes on a character sheet (from any source)
     * @param {Actor} actor - The character actor
     * @param {number} oldValue - Previous fate value
     * @param {number} newValue - New fate value
     * @param {number} maxValue - Maximum fate value
     * @param {number} difference - The change amount (positive = gained, negative = lost)
     */
    static async sendFateChangeMessage(actor, oldValue, newValue, maxValue, difference) {
        const amount = Math.abs(difference);
        
        let localeKey;
        if (difference > 0) {
            localeKey = "Chat.FateIncreased";
        } else if (difference < 0) {
            localeKey = "Chat.FateDecreased";
        } else {
            return; // No change
        }

        const content = format(localeKey, {
            characterName: actor.name,
            amount: amount,
            oldValue: oldValue,
            newValue: newValue,
            current: newValue,
            remaining: newValue,
            max: maxValue
        });

        await ChatMessage.create({
            content: `<div class="impmal-shared-fate-message fate-message">${content}</div>`,
            speaker: { alias: actor.name },
            type: CONST.CHAT_MESSAGE_STYLES.OTHER
        });
    }

    /**
     * Send a chat message for Ruin operations
     * @param {"used"|"added"|"removed"} action - The action type
     * @param {number} amount - Amount changed
     * @param {number} newValue - New value
     * @param {number} maxValue - Maximum value
     * @private
     */
    static async _sendRuinChatMessage(action, amount, newValue, maxValue) {
        let localeKey;
        switch (action) {
            case "used":
                localeKey = "Chat.UsedRuin";
                break;
            case "added":
                localeKey = "Chat.AddedRuin";
                break;
            case "removed":
                localeKey = "Chat.RemovedRuin";
                break;
            default:
                return;
        }

        const content = format(localeKey, {
            amount: amount,
            remaining: newValue,
            current: newValue,
            max: maxValue
        });

        await ChatMessage.create({
            content: `<div class="impmal-shared-fate-message ruin-message">${content}</div>`,
            speaker: { alias: "GM" },
            type: CONST.CHAT_MESSAGE_STYLES.OTHER
        });
    }
}
