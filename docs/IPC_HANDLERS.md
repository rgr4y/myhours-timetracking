# IPC Architecture

MyHours uses Electron's IPC (Inter-Process Communication) to bridge the renderer and main processes.

## Architecture Overview

### IpcService (`src/main/services/ipc-service.js`)

The `IpcService` centralizes all IPC communication handling, organizing handlers by domain:

- **App Handlers**: Version info, external URLs, window management
- **Database Handlers**: All CRUD operations for clients, projects, tasks, time entries
- **Invoice Handlers**: PDF generation, download, view operations
- **Export Handlers**: CSV and JSON export functionality
- **Tray Handlers**: System tray integration and timer updates
- **Console Handlers**: Renderer → main process log forwarding
- **Dev Handlers**: Development utilities (seeding, etc.)

### Usage in Main Process

```javascript
// Initialize IPC service with dependencies
this.ipcService = new IpcService(
  this.mainWindow,
  this.database,
  this.invoiceGenerator,
  this.versionService
);

// Set up all handlers
this.ipcService.setupHandlers();

// Connect tray service after initialization
this.ipcService.setTrayService(this.trayService);
```

### Handler Categories

#### Database Operations
- `db:getClients`, `db:createClient`, `db:updateClient`, `db:deleteClient`
- `db:getProjects`, `db:createProject`, `db:updateProject`, `db:deleteProject`
- `db:getTasks`, `db:createTask`, `db:updateTask`, `db:deleteTask`
- `db:getTimeEntries`, `db:createTimeEntry`, `db:updateTimeEntry`, `db:deleteTimeEntry`
- `db:startTimer`, `db:stopTimer`, `db:resumeTimer`, `db:getActiveTimer`
- `db:getSettings`, `db:setSetting`, `db:updateSettings`

#### App Operations
- `app:getVersion` - Get application version
- `app:openExternal` - Open URLs in default browser
- `app:getWindowSize` - Get current window dimensions

#### Invoice Operations
- `invoice:generate` - Generate new invoice from time entries
- `invoice:generateFromSelected` - Generate from selected entries
- `invoice:download` - Download existing invoice as PDF
- `invoice:view` - View invoice PDF
- `invoice:regenerate` - Regenerate existing invoice

#### Export Operations
- `export:csv` - Export time entries to CSV
- `export:json` - Export time entries to JSON

## WebSocket Proxy for Browser Debugging

MyHours includes a WebSocket server (dev mode only) that proxies IPC calls, allowing normal web browsers to debug the app:

```javascript
// WebSocket server on port 3001 forwards IPC calls
const request = { channel: 'db:getClients', args: [] };
ws.send(JSON.stringify(request));
```

This enables browser-based debugging tools and external automation.

## Benefits

1. **Separation of Concerns**: IPC logic separated from main application logic
2. **Maintainability**: All handlers organized in logical groups  
3. **Testability**: Service can be unit tested independently
4. **Reusability**: Service pattern allows easy extension and modification
5. **Clean Architecture**: Main process focuses on orchestration, not IPC details

## Security

All IPC handlers include proper error handling and validation. The service maintains the same security model as the original handlers, with no additional exposure of main process functionality to the renderer.