/**
 * Imperium Maledictum Shared Fate
 * Syncs player Fate points from character sheets to a shared display in the player list
 */

import { MODULE_ID, SETTINGS_KEYS } from "./constants.mjs";
import { registerSettings, getSetting } from "./settings.mjs";
import { FatePointManager } from "./fate-point-manager.mjs";
import { UIHandler } from "./ui-handler.mjs";
import { log } from "./utils.mjs";

// Initialize module
Hooks.once("init", () => {
    log("info", "Initializing Imperium Maledictum Shared Fate");
    registerSettings();
});

Hooks.once("ready", () => {
    log("info", "Module Ready");
    
    // Initialize the fate point manager
    FatePointManager.initialize();
    
    // Register API
    game.modules.get(MODULE_ID).api = {
        useFate: FatePointManager.useFate.bind(FatePointManager),
        getFatePoints: FatePointManager.getFatePoints.bind(FatePointManager),
        getPlayerCharacter: FatePointManager.getPlayerCharacter.bind(FatePointManager),
        getRuinPoints: FatePointManager.getRuinPoints.bind(FatePointManager),
        useRuin: FatePointManager.useRuin.bind(FatePointManager),
        addRuin: FatePointManager.addRuin.bind(FatePointManager),
        removeRuin: FatePointManager.removeRuin.bind(FatePointManager),
        refresh: UIHandler.refresh.bind(UIHandler)
    };
});

// Track fate changes before update to compare
Hooks.on("preUpdateActor", (actor, changes, options, userId) => {
    // Only track character actors with fate changes
    if (actor.type !== "character") return;
    if (!foundry.utils.hasProperty(changes, "system.fate.value")) return;
    
    // Store the old fate value in options so we can compare after update
    const oldValue = actor.system?.fate?.value ?? 0;
    options._impmalSharedFate = {
        oldFateValue: oldValue,
        actorId: actor.id
    };
    
    log("debug", "Tracking fate change", { actorId: actor.id, oldValue });
});

// Detect fate changes and post chat messages
Hooks.on("updateActor", async (actor, changes, options, userId) => {
    // Check if we were tracking this actor's fate
    if (!options._impmalSharedFate) return;
    if (options._impmalSharedFate.actorId !== actor.id) return;
    
    // Get the new fate value
    const newValue = actor.system?.fate?.value ?? 0;
    const oldValue = options._impmalSharedFate.oldFateValue;
    const maxValue = actor.system?.fate?.max ?? 0;
    
    // Skip if no actual change
    if (newValue === oldValue) return;
    
    log("debug", "Fate changed on actor", { 
        actorId: actor.id, 
        actorName: actor.name,
        oldValue, 
        newValue,
        difference: newValue - oldValue
    });
    
    // Only the user who made the change should send the chat message to avoid duplicates
    if (userId !== game.user.id) {
        UIHandler.refresh();
        return;
    }
    
    // Check if chat messages are enabled
    if (!getSetting(SETTINGS_KEYS.SHOW_CHAT_MESSAGES)) {
        UIHandler.refresh();
        return;
    }
    
    // Determine the type of change and send appropriate message
    const difference = newValue - oldValue;
    await FatePointManager.sendFateChangeMessage(actor, oldValue, newValue, maxValue, difference);
    
    // Refresh the UI
    UIHandler.refresh();
});

// Re-render when user character assignment changes
Hooks.on("updateUser", (user, changes, options, userId) => {
    if (foundry.utils.hasProperty(changes, "character")) {
        log("debug", "User character assignment changed", { userId: user.id });
        UIHandler.refresh();
    }
});

// Render fate points in the player list
Hooks.on("renderPlayers", (app, html, data) => {
    UIHandler.onRenderPlayers(app, html, data);
});

// Handle actor deletion
Hooks.on("deleteActor", (actor, options, userId) => {
    UIHandler.refresh();
});
