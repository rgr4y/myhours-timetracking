# MyHours - AI Agent Instructions

## Architecture Overview

**myHours** is an Electron-based time tracking application with a React frontend, SQLite/Prisma backend, and PDF invoice generation. The app follows a strict main/renderer process separation with IPC communication.

### Project Structure

```
src/
├── main/                   # Electron main process
│   ├── main.js            # App initialization & IPC handlers
│   ├── database-service.js # Prisma ORM wrapper
│   ├── preload.js         # Context bridge for renderer
│   ├── invoice-generator.js # PDF generation with Puppeteer
│   ├── services/          # Platform-specific services
│   │   └── tray-macos.js  # macOS tray integration
│   └── templates/         # Handlebars invoice templates
├── renderer/              # React app (Create React App)
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── context/       # TimerContext for global state
│   │   ├── hooks/         # Custom React hooks
│   │   ├── ui/           # Styled-components design system
│   │   └── utils/        # Utility functions
└── prisma/               # Database schema & migrations
assets/                   # App assets (icons, etc.)
├── icon.svg              # Primary app icon
├── tray-icon.svg         # Vector tray icon
├── tray-icon.png         # 16x16 tray icon
└── tray-icon@2x.png      # 32x32 retina tray icon
```

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

### Invoice Generation

- **Templates**: Handlebars templates in `src/main/templates/`
- **PDF**: Puppeteer generates PDFs from rendered HTML
- **Data flow**: Renderer → IPC → InvoiceGenerator → File system

### Console Logging

- **Renderer logs**: Forward to main process via preload.js for terminal visibility
- **Debug pattern**: `[MAIN]`, `[RENDERER-LOG]`, `[DATABASE]` prefixes for log identification
- **Custom logger**: Projects.js has enhanced logger that triggers DB calls for terminal output

## Common Debugging Approaches

### IPC Communication Issues

1. Check preload.js exposes the needed API methods
2. Verify main.js has corresponding IPC handlers
3. Check database-service.js for actual implementation
4. Look for `electronAPI not available` errors in console. Use useElectronAPI.js pattern.

### Database Issues

1. Use `npx prisma studio` to inspect SQLite database
2. Check console for `[DATABASE]` prefixed logs
3. Verify foreign key relationships (Client → Project → Task)

### Build Issues

1. Stop `Start Dev` task completely
2. Restart development environment

### House rules

1. Don't leave any ESLint warnings. Fix them.
2. DRY! Don't repeat yourself.
3. Keep components small and focused.
4. Always provide a commit message of ALL changes (4 line, 6 line, 8 line, 10 line - pick depending on how many changes) whenever you provide a major summary.

Remember: This is a single-user desktop app with local SQLite storage - no authentication, API calls, or cloud sync.
