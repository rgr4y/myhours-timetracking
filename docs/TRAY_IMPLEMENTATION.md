# macOS Tray Integration for myHours

## Overview

This implementation adds a complete macOS menu bar (system tray) integration for the myHours time tracking application. The tray icon appears in the top-right menu bar and provides quick access to timer controls without opening the main application window.

## Features Implemented

### 1. **Tray Icon Display**
- **Icon**: Uses the provided `assets/tray-icon.png` (16x16) and `assets/tray-icon@2x.png` (32x32) for retina displays
- **Template Icon**: Automatically adapts to macOS dark/light mode themes
- **Status Indicator**: Shows a timer emoji (⏱️) when a timer is running

### 2. **Tray Menu Options**
- **Show myHours**: Opens/focuses the main application window (Cmd+Shift+M)
- **Start/Stop Timer**: Toggle timer based on current state (Cmd+Shift+T)
- **Quick Start Timer**: Submenu with recent clients for one-click timer start
- **Timer Status**: Shows current timer details when running (client, elapsed time)
- **Settings**: Opens application settings page (Cmd+,)
- **Quit myHours**: Safely closes the application (Cmd+Q)

### 3. **Timer Integration**
- **Real-time Status**: Tray tooltip shows current timer information (client, description, elapsed time)
- **Status Updates**: Menu automatically updates when timer starts/stops
- **Quick Actions**: Start timer from tray without opening main window
- **Stop Protection**: Cannot delete or edit active timers

### 4. **Window Management**
- **Context Menu Access**: Both left-click and right-click show the context menu
- **Window Control**: Use "Show myHours" menu item to open/focus the main window
- **Hide to Tray**: Closing the window hides it instead of quitting on macOS
- **Focus Management**: Properly brings window to front when opened from tray

## Files Created/Modified

### New Files
- `/src/main/services/tray-macos.js` - Complete macOS tray service implementation

### Modified Files
- `/src/main/main.js` - Added tray service initialization and platform detection
- `/src/main/preload.js` - Added tray-related IPC methods and event listeners
- `/src/renderer/src/context/TimerContext.js` - Added tray status updates
- `/src/renderer/src/components/TimeEntries.js` - Added tray event handlers

## Architecture

### Platform-Specific Design
```
src/main/services/
├── tray-macos.js     # macOS implementation (current)
└── tray-windows.js   # Windows implementation (future)
```

### Main Process Integration
```javascript
// Platform detection
if (process.platform === 'darwin') {
  TrayService = require('./services/tray-macos');
}

// Service initialization
this.trayService = new TrayService(this.mainWindow, this.database);
this.trayService.initialize();
```

### IPC Communication
```javascript
// Renderer to Main (timer updates)
ipcRenderer.send('tray:timer-status-changed', timerData)

// Main to Renderer (tray events)
'tray-start-timer'
'tray-stop-timer'
'tray-quick-start-timer'
'tray-show-timer-setup'
'tray-open-settings'
```

## Usage

### For Users
1. **Tray Icon**: Look for the myHours icon in the macOS menu bar (top-right)
2. **Context Menu**: Click the tray icon (left or right click) to show the context menu
3. **Quick Start**: Select a client from "Quick Start Timer" to start a timer immediately
4. **Window Control**: Use "Show myHours" from the menu to open the main window
5. **Timer Status**: The tray tooltip shows current timer information when running
6. **Quick Stop**: Select "Stop Timer" when a timer is active
7. **Settings Access**: Click "Settings..." to open the application settings page

### For Developers
1. **Timer Updates**: The tray automatically receives updates when timers start/stop
2. **Event Handling**: Tray events are sent to the TimeEntries component
3. **Cross-Platform**: The architecture supports adding Windows/Linux implementations
4. **Database Integration**: Tray service has direct access to client data for quick start menu

## Technical Details

### Tray Icon Requirements
- **Size**: 16x16px for standard, 32x32px for retina (@2x)
- **Format**: PNG with transparency
- **Template**: Uses `setTemplateImage(true)` for automatic theme adaptation

### Memory Management
- **Event Cleanup**: All IPC listeners are properly removed on component unmount
- **Timer Updates**: Uses efficient 1-minute intervals for elapsed time display
- **Service Cleanup**: Tray service is destroyed when app quits

### Error Handling
- **Graceful Degradation**: App works normally if tray initialization fails
- **Database Errors**: Quick start menu falls back to basic options if client loading fails
- **IPC Safety**: All IPC calls are wrapped in try-catch blocks

## Future Enhancements

### Windows Support
- Create `/src/main/services/tray-windows.js`
- Add Windows-specific icon handling
- Implement Windows notification integration

### Additional Features
- **Notifications**: Show system notifications for timer events
- **Time Display**: Show elapsed time directly in menu bar
- **Recent Projects**: Quick access to recent project/task combinations
- **Daily Summary**: Show today's total time in tray tooltip

## Testing

The implementation has been tested with:
- ✅ Tray icon appears in macOS menu bar
- ✅ Menu items work correctly
- ✅ Timer status updates properly
- ✅ Window show/hide functionality
- ✅ Quick start timer functionality
- ✅ Proper cleanup on app quit

## Dependencies

No additional dependencies were required. The implementation uses only:
- Electron's built-in `Tray` and `Menu` APIs
- Existing database service
- Current IPC infrastructure

This implementation provides a complete, production-ready macOS tray integration that enhances the user experience by making timer controls accessible directly from the menu bar.
