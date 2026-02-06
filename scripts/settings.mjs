import { MODULE_ID, SETTINGS_KEYS, LOCALIZE_KEY } from "./constants.mjs";
import { UIHandler } from "./ui-handler.mjs";

export function registerSettings() {
    // GM Ruin current value (independent from any character)
    game.settings.register(MODULE_ID, SETTINGS_KEYS.GM_RUIN, {
        name: `${LOCALIZE_KEY}.Settings.GMRuin.Name`,
        hint: `${LOCALIZE_KEY}.Settings.GMRuin.Hint`,
        scope: "world",
        config: false,
        type: Number,
        default: 0,
        onChange: () => UIHandler.refresh()
    });

    // GM Ruin max value
    game.settings.register(MODULE_ID, SETTINGS_KEYS.GM_RUIN_MAX, {
        name: `${LOCALIZE_KEY}.Settings.GMRuinMax.Name`,
        hint: `${LOCALIZE_KEY}.Settings.GMRuinMax.Hint`,
        scope: "world",
        config: true,
        type: Number,
        default: 5,
        onChange: () => UIHandler.refresh()
    });

    // Show max fate alongside current
    game.settings.register(MODULE_ID, SETTINGS_KEYS.SHOW_MAX_FATE, {
        name: `${LOCALIZE_KEY}.Settings.ShowMaxFate.Name`,
        hint: `${LOCALIZE_KEY}.Settings.ShowMaxFate.Hint`,
        scope: "client",
        config: true,
        type: Boolean,
        default: true,
        onChange: () => UIHandler.refresh()
    });

    // Allow players to use fate from the UI
    game.settings.register(MODULE_ID, SETTINGS_KEYS.ALLOW_PLAYER_USE, {
        name: `${LOCALIZE_KEY}.Settings.AllowPlayerUse.Name`,
        hint: `${LOCALIZE_KEY}.Settings.AllowPlayerUse.Hint`,
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        onChange: () => UIHandler.refresh()
    });

    // Show chat messages when fate is used
    game.settings.register(MODULE_ID, SETTINGS_KEYS.SHOW_CHAT_MESSAGES, {
        name: `${LOCALIZE_KEY}.Settings.ShowChatMessages.Name`,
        hint: `${LOCALIZE_KEY}.Settings.ShowChatMessages.Hint`,
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });

    // Log level for debugging
    game.settings.register(MODULE_ID, SETTINGS_KEYS.LOG_LEVEL, {
        name: `${LOCALIZE_KEY}.Settings.LogLevel.Name`,
        hint: `${LOCALIZE_KEY}.Settings.LogLevel.Hint`,
        scope: "client",
        config: true,
        type: String,
        choices: {
            "none": `${LOCALIZE_KEY}.Settings.LogLevel.None`,
            "error": `${LOCALIZE_KEY}.Settings.LogLevel.Error`,
            "warn": `${LOCALIZE_KEY}.Settings.LogLevel.Warn`,
            "info": `${LOCALIZE_KEY}.Settings.LogLevel.Info`,
            "debug": `${LOCALIZE_KEY}.Settings.LogLevel.Debug`
        },
        default: "warn"
    });
}

/**
 * Get a setting value
 * @param {string} key - The setting key
 * @returns {*} The setting value
 */
export function getSetting(key) {
    return game.settings.get(MODULE_ID, key);
}

/**
 * Set a setting value
 * @param {string} key - The setting key
 * @param {*} value - The value to set
 * @returns {Promise<*>} The set value
 */
export async function setSetting(key, value) {
    return game.settings.set(MODULE_ID, key, value);
}
