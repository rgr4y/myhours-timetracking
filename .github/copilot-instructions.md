# MyHours - AI Agent Instructions

## Architecture Overview

**myHours** is an Electron-based time tracking application with a React frontend, SQLite/Prisma backend, and PDF invoice generation. The app follows a strict main/renderer process separation with IPC communication.

### Icon Assets

- **App Icons**: See `assets/ICON_GUIDE.md` for complete icon management
- **Tray Icons**: Platform-specific menu bar icons with template image support for theme adaptation
- **Build Process**: Automated icon generation via scripts for various platforms

## Development Workflow

### Starting Development

1. **Check running tasks first**: The `Start Dev` task should already be running
2. **Start development**: `Start Dev` task runs two processes with electronmon:
   - React dev server at `http://localhost:3010`
   - Electron app with electronmon (auto-restart on main process changes)
3. **Debug outputs**: Check all terminal tabs - main process logs appear in terminal, renderer logs forward through preload.js

### Critical Development Rules

- **Never restart unless necessary**: Check if `Start Dev` task is running before starting
- **electronmon handles restarts**: Main process changes automatically restart Electron
- **Stop only for Prisma operations**: Must stop `Start Dev` to run migrations (`npx prisma studio`, migrations)
- **Preload changes**: Still require manual restart for security bridge updates

## Data Architecture

### Database (SQLite + Prisma)

- **Schema**: Client → Project → Task hierarchy with TimeEntry tracking
- **Active Timer**: Only one TimeEntry with `isActive: true` at a time
- **Key pattern**: Foreign keys use `clientId`, `projectId`, `taskId` (camelCase)
- **Auto-seeding**: Empty database gets populated with sample data on first run

### Testing / Unit Tests

- Use builtin runTests MCP first
- See `tests/README.md` & `tests/AGENTS.md`

### IPC Communication Pattern

**Main → Renderer**: All database operations flow through structured IPC handlers:

```javascript
// Main process (main.js)
ipcMain.handle('db:getClients', async () => { ... })

// Preload (preload.js)
clients: { getAll: () => ipcRenderer.invoke('db:getClients') }

// Renderer (components)
const clients = await window.electronAPI.clients.getAll()
```

**Critical**: Preload.js exposes a safe 'electronAPI' pattern to renderer - changes require restart.
You MUST use the safe electronAPI pattern to avoid race conditions.

## Component Patterns

### UI System (src/renderer/src/components/ui/)

- **Styled Components**: Dark theme with consistent spacing/colors
- **Design tokens**: `#007AFF` (primary), `#404040` (secondary), `#1a1a1a` (background)
- **Responsive**: Mobile-first breakpoints at 768px and 1024px
- **Import pattern**: `import { Button, Card, FlexBox } from './ui'`

### State Management

- **TimerContext**: Global timer state (running, time, activeTimer, selectedClient)
- **Local State**: Components manage UI state locally, sync with context for timer operations
- **Auto-save**: Timer descriptions save every 1 second + on blur + on app close

## Key Integration Points

### Timer System

- **Context**: TimerContext manages global timer state across components
- **State sync**: Local component state syncs with context for active timers

### Timer State Issues

- Verify useEffect dependencies in Timer component
- Check active timer persistence via `db:getActiveTimer`

### Console Logging

- **Renderer logs**: Forward to main process via preload.js for terminal visibility
- **Debug pattern**: `[MAIN]`, `[RENDERER-LOG]`, `[DATABASE]` prefixes for log identification
- **Custom logger**: Use `logger.js` for consistent log formatting - logger.debug, logger.warn, etc. Use only on main process, do not use on renderer.

## Common Debugging Approaches

### Build Issues

1. Stop `Start Dev` task completely
2. Restart development environment

### Misc Issues

1. Use vscode-editor-mcp's MCP tools for doing special file operations, like Undo.
2. If you break a file and want to reset it completely, use the `vscode-editor-mcp` -> `reset_file` tool to empty the file. Do this instead of sending `rm` to the terminal.
3. If that doesn't work, go ahead with your normal flow.

### House rules

1. Don't leave any ESLint warnings. Fix them.
2. DRY! Don't repeat yourself.
3. Keep components small and focused.
4. Don't echo random notes to the terminal.
5. No new files in project root unless I explicitly OK it.
6. Docs go in @/docs only (.md files). Do not put implementation summaries. Only documentation.

Remember: This is a single-user desktop app with local SQLite storage.