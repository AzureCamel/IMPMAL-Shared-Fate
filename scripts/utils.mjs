import { MODULE_ID, SETTINGS_KEYS, LOG_LEVELS } from "./constants.mjs";

const LOG_LEVEL_MAP = {
    "none": LOG_LEVELS.NONE,
    "error": LOG_LEVELS.ERROR,
    "warn": LOG_LEVELS.WARN,
    "info": LOG_LEVELS.INFO,
    "debug": LOG_LEVELS.DEBUG
};

/**
 * Log a message with the module prefix
 * @param {"error"|"warn"|"info"|"debug"} level - The log level
 * @param {string} message - The message to log
 * @param {*} [data] - Optional data to log
 */
export function log(level, message, data) {
    // Get the configured log level
    let configLevel = LOG_LEVELS.WARN;
    try {
        const configLevelStr = game.settings.get(MODULE_ID, SETTINGS_KEYS.LOG_LEVEL);
        configLevel = LOG_LEVEL_MAP[configLevelStr] ?? LOG_LEVELS.WARN;
    } catch (e) {
        // Settings not yet registered, use default
    }

    const messageLevel = LOG_LEVEL_MAP[level] ?? LOG_LEVELS.INFO;
    
    if (messageLevel > configLevel) return;

    const prefix = `${MODULE_ID} |`;
    const args = data !== undefined ? [prefix, message, data] : [prefix, message];

    switch (level) {
        case "error":
            console.error(...args);
            break;
        case "warn":
            console.warn(...args);
            break;
        case "info":
            console.info(...args);
            break;
        case "debug":
            console.debug(...args);
            break;
        default:
            console.log(...args);
    }
}

/**
 * Display a notification to the user
 * @param {string} messageKey - The localization key for the message
 * @param {"info"|"warn"|"error"} type - The notification type
 * @param {object} [options] - Additional options
 * @param {object} [options.format] - Format data for localization
 * @param {boolean} [options.permanent] - Whether the notification should be permanent
 */
export function notify(messageKey, type = "info", options = {}) {
    const { format = {}, permanent = false } = options;
    const localizeKey = `IMPMAL_SHARED_FATE.Notifications.${messageKey}`;
    const message = game.i18n.format(localizeKey, format);
    
    ui.notifications[type](message, { permanent });
}

/**
 * Localize a string
 * @param {string} key - The localization key (without module prefix)
 * @returns {string} The localized string
 */
export function localize(key) {
    return game.i18n.localize(`IMPMAL_SHARED_FATE.${key}`);
}

/**
 * Format a localized string with data
 * @param {string} key - The localization key (without module prefix)
 * @param {object} data - The format data
 * @returns {string} The formatted localized string
 */
export function format(key, data) {
    return game.i18n.format(`IMPMAL_SHARED_FATE.${key}`, data);
}
