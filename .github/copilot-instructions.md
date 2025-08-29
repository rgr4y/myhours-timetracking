# MyHours - AI Agent Instructions

## Architecture Overview

**MyHours** is an Electron-based time tracking application with a React frontend, SQLite/Prisma backend, and PDF invoice generation. The app follows a strict main/renderer process separation with IPC communication.

### Project Structure
```
src/
├── main/                   # Electron main process
│   ├── main.js            # App initialization & IPC handlers
│   ├── database-service.js # Prisma ORM wrapper
│   ├── preload.js         # Context bridge for renderer
│   ├── invoice-generator.js # PDF generation with Puppeteer
│   └── templates/         # Handlebars invoice templates
├── renderer/              # React app (Create React App)
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── context/       # TimerContext for global state
│   │   └── ui/           # Styled-components design system
└── prisma/               # Database schema & migrations
```

## Development Workflow

### Starting Development
1. **Check running tasks first**: The `Start Dev` task should already be running
2. **Start development**: `Start Dev` task runs two processes concurrently:
   - React dev server at `http://localhost:3000`
   - Electron app that loads the React app
3. **Debug outputs**: Check all terminal tabs - main process logs appear in terminal, renderer logs forward through preload.js

### Critical Development Rules
- **Never restart unless necessary**: Check if `Start Dev` task is running before starting
- **Stop for Prisma operations**: Must stop `Start Dev` to run migrations (`npx prisma studio`, migrations)
- **Kill processes**: Sometimes need to force-kill electron.exe processes
- **Preload changes**: Electron main process changes require app restart

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

### Data Loading Pattern
```javascript
// Standard component data loading
useEffect(() => {
  const loadData = async () => {
    if (window.electronAPI) {
      try {
        const data = await window.electronAPI.clients.getAll();
        setData(data);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    }
  };
  loadData();
}, []);
```

## Key Integration Points

### Timer System
- **Context**: TimerContext manages global timer state across components
- **Auto-save**: Description changes save immediately when timer is running
- **State sync**: Local component state syncs with context for active timers

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
4. Look for `electronAPI not available` errors in console

### Timer State Issues
1. Check TimerContext for global state management
2. Verify useEffect dependencies in Timer component
3. Check active timer persistence via `db:getActiveTimer`

### Database Issues
1. Use `npx prisma studio` to inspect SQLite database
2. Check console for `[DATABASE]` prefixed logs
3. Verify foreign key relationships (Client → Project → Task)

### Build Issues
1. Stop `Start Dev` task completely
2. Clear build: `cd src/renderer && npm run build`
3. Restart development environment

### House rules
1. Don't leave any ESLint warnings. Fix them.
2. DRY! Don't repeat yourself.
3. Keep components small and focused.

Remember: This is a single-user desktop app with local SQLite storage - no authentication, API calls, or cloud sync.
