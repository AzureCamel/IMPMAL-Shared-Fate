# Imperium Maledictum Shared Fate

A Foundry VTT module that displays player Fate points from their Imperium Maledictum character sheets directly in the player list, and provides the GM with an independent Ruin pool.

## Features

### Player Fate Points
- **Synchronized Display**: Fate points from character sheets are automatically displayed next to player names
- **Bidirectional Sync**: Changes to Fate points on the character sheet update the display, and vice versa
- **Player Interaction**: Players can spend their own Fate points directly from the player list (configurable)
- **GM Controls**: GMs can add or remove Fate points for any character using +/- buttons

### GM Ruin Pool
- **Independent Resource**: GMs have their own Ruin pool that is not linked to any character
- **Persistent Storage**: Ruin is stored in module settings and persists across sessions
- **Red Visual Theme**: Ruin is displayed with a distinctive red color scheme with skull icon
- **Configurable Maximum**: Set the maximum Ruin in module settings

### Visual Features
- **Fate (Blue)**: Players' Fate points shown with angel icon and blue styling
- **Ruin (Red)**: GM's Ruin shown with skull icon and red styling
- **State Indicators**:
  - Full state (glowing effect)
  - Exhausted state (grayed out at 0)
  - Hover effects for interactive elements
- **Chat Integration**: Optional chat messages when Fate/Ruin is used

## Installation

1. Download the module
2. Extract to your Foundry VTT modules folder
3. Enable the module in your world's module settings

## Requirements

- Foundry VTT v12 or higher
- Imperium Maledictum game system

## Configuration

The following settings are available in the module settings:

| Setting | Description | Default |
|---------|-------------|---------|
| GM Ruin Maximum | Maximum Ruin points the GM can have | 5 |
| Show Maximum Values | Display as "current/max" format | Enabled |
| Allow Player Fate Use | Let players spend Fate from the UI | Enabled |
| Show Chat Messages | Post to chat when Fate/Ruin is used | Enabled |
| Log Level | Console logging verbosity | Warnings |

## Usage

### For Players
- Your character's Fate points will automatically appear next to your name in the player list
- Click on the Fate display to spend a Fate point (with confirmation)
- The display updates automatically when Fate changes on your character sheet

### For GMs
**Managing Player Fate:**
- View all player Fate points at a glance
- Hover over a player's Fate to reveal +/- buttons
- Click + to add Fate, - to remove Fate
- Ctrl+Click on the Fate display to add Fate
- Ctrl+Right-Click on the Fate display to remove Fate

**Managing Ruin:**
- Your Ruin pool appears next to your name with a red skull icon
- Click on Ruin to spend it (with confirmation)
- Use +/- buttons to adjust Ruin
- Ctrl+Click to add Ruin, Ctrl+Right-Click to remove Ruin
- Set maximum Ruin in module settings

## Character Assignment

The module determines a player's character in the following order:
1. The character explicitly assigned to the user in User Configuration
2. Any character actor the user has Owner permission on

**Note:** GMs are not linked to any character - they use the independent Ruin pool instead.

## API

The module exposes an API for macro and module developers:

```javascript
// Get the module API
const api = game.modules.get("impmal-shared-fate").api;

// Use Fate for a user's character
await api.useFate(user, amount, { chatMessage: true });

// Get Fate points for a user
const fateData = api.getFatePoints(user);
// Returns { current: number, max: number } or null

// Get a user's character
const character = api.getPlayerCharacter(user);

// Force refresh the display
api.refresh();
```

## Compatibility

This module is designed specifically for the Imperium Maledictum system and reads Fate point data from the standard character sheet location (`system.fate.value` and `system.fate.max`).

## License

MIT License - See LICENSE file for details

## Version History

### 1.0.1
- GM now has independent Ruin pool (not linked to any character)
- Ruin displayed with red styling and skull icon
- Fixed chat messages for removing Fate
- Added chat messages for Ruin operations
- Configurable maximum Ruin in settings

### 1.0.0
- Initial release
- Fate point display in player list
- Bidirectional synchronization with character sheets
- GM controls for adding/removing Fate
- Player Fate usage with confirmation
- Chat message integration
- Configurable settings
