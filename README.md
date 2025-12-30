# RNK Header

A powerful Foundry VTT module that provides customizable window header management with slot-based button assignment and granular per-player visibility controls.

## Features

- **Psychedelic UI**: High-contrast, glassmorphism-inspired interface with neon glows and animated gradients.
- **5 Main Slots with 5 Sub-Slots Each**: Hierarchical slot system for organizing window header buttons.
- **Auto-Detection**: Automatically detects and integrates buttons from active modules.
- **Dropdown Menus**: Main slots with assigned sub-slots display as dropdown menus.
- **Per-Player Visibility**: GMs can control which players see which buttons.
- **Right-Click Context Menu**: Easily reassign buttons to different slots.
- **GM Hub**: Intuitive configuration interface in scene controls.
- **Module API**: Developers can register custom buttons programmatically.
- **International Support**: Support for 35+ languages.

## Installation

1. Copy the `rnk-header` folder to your Foundry VTT `Data/modules` directory
2. Restart Foundry VTT
3. Enable the module in your world's module settings

## Usage

### GM Configuration

1. Click the **RNK Header** button in the scene controls (left sidebar)
2. Configure slot assignments in the **Slot Configuration** tab
3. Set player visibility in the **Permissions** tab
4. Click **Save Configuration** to apply changes

### Slot Assignment

- **Main Slots**: 5 primary slots in the window header
- **Sub-Slots**: Each main slot has 5 sub-slots
- Main slots with assigned sub-slots automatically display as dropdown menus
- Empty slots are hidden from view

### Right-Click Context Menu

- Right-click any button in a window header (GM only)
- Select **Move to Slot** to reassign the button
- Select **Unassign** to remove the button from all slots

### Permission Management

Three visibility modes for each button:

- **All Players**: Visible to everyone
- **Selected Players**: Visible only to selected players
- **GM Only**: Visible only to GMs

## API for Developers

Other modules can register buttons with RNK Header:

```javascript
// Register a custom button
game.modules.get('rnk-header').api.registerButton({
  id: 'my-module-button',
  label: 'My Button',
  icon: 'fas fa-star',
  callback: (app, button, event) => {
    console.log('Button clicked!', app);
  }
});

// Unregister a button
game.modules.get('rnk-header').api.unregisterButton('my-module-button');

// Assign a button to a specific slot
game.modules.get('rnk-header').api.assignButtonToSlot('my-module-button', 'main-0');

// Get all registered buttons
const buttons = game.modules.get('rnk-header').api.getAllButtons();

// Get current slot configuration
const config = game.modules.get('rnk-header').api.getSlotConfiguration();
```

## Standard Buttons

The following standard Foundry buttons are automatically available:

- Close
- Minimize
- Configure
- Import
- Token
- Sheet

## Module Detection

RNK Header automatically detects buttons from modules that:

1. Expose a `headerButtons` array in their module API
2. Register buttons via `window[moduleId].headerButtons`
3. Use the RNK Header API to register buttons

## Technical Details

### File Structure

```text
rnk-header/
├── module.json
├── README.md
├── lang/
│   └── en.json
├── scripts/
│   ├── rnk-header.js
│   └── modules/
│       ├── slot-manager.js
│       ├── module-detector.js
│       ├── header-injector.js
│       ├── permission-manager.js
│       ├── gm-hub.js
│       ├── context-menu.js
│       └── api.js
├── styles/
│   └── rnk-header.css
└── templates/
    └── gm-hub.html
```

### Settings

All configuration is stored in world-level settings:

- `rnk-header.slotConfiguration`: Slot assignments
- `rnk-header.permissions`: Button visibility permissions

## Compatibility

- **Foundry VTT Version**: 12+ (Verified: 13)
- **System**: System-agnostic
- **Conflicts**: May conflict with other modules that modify window headers

## Troubleshooting

### Buttons not appearing

1. Check that the module is enabled
2. Verify slot assignments in the GM Hub
3. Check player permissions for the button
4. Ensure the target module is active

### Dropdowns not working

1. Verify that sub-slots have assigned buttons
2. Check that the main slot also has an assigned button
3. Try re-saving the configuration

### Module buttons not detected

1. Check if the module exposes buttons via the API
2. Try manually registering the button via the API
3. Contact the module developer for RNK Header integration

## Support

For issues, questions, or feature requests, contact RNK.

## License

RNK. All rights reserved.

## Changelog

### Version 1.0.1

- Add V2 application support for the custom header injection and scene-control toolbar integration (ensures the header and GM Hub button work consistently in Foundry 13+).
- Prevent button auto-activation on scene-control re-renders (token drops, layer swaps) while keeping the hub easily accessible.
- Keep the GM Hub scene-control handler stable, add missing `onChange`, and package the module for the 1.0.1 release.

### Version 1.0.0

- Initial release
- 5 main slots with 5 sub-slots each
- Auto-detection of module buttons
- Per-player visibility controls
- GM Hub configuration interface
- Right-click context menu
- Module API for developers
