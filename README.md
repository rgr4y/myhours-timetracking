# MyHours - Time Tracking Application

A cross-platform time tracking application built with Electron, React, and modern web technologies. Inspired by Working Hours, MyHours provides a clean, dark-themed interface for tracking time, managing projects, and generating professional invoices.

## Features

### ⏱️ Time Tracking
- Start/stop timer with automatic rounding (5, 10, 15, 30, 60 minutes)
- Manual time entry and editing
- Break time tracking
- Recurring task support
- Real-time timer display

### 🏢 Project Management
- Multi-client support with individual hourly rates
- Project organization under clients
- Task management with descriptions
- Hierarchical structure: Clients → Projects → Tasks

### 📊 Reporting & Analytics
- Basic reports: Today's time, This week's time, Uninvoiced time
- Custom date range filtering
- Export to CSV and JSON formats
- Real-time statistics

### 🧾 Invoice Generation
- Professional PDF invoice generation
- Handlebars-based templating system
- Weekly time grouping
- Automatic invoice numbering
- Customizable company information
- Mark time entries as invoiced

### ⚙️ Settings & Configuration
- Company information setup
- Timer rounding preferences
- Invoice template selection
- Cross-platform data storage

## Technology Stack

- **Frontend**: React, Styled Components, Lucide React (icons)
- **Backend**: Electron (Node.js)
- **Database**: JSON-based local storage (node-json-db)
- **PDF Generation**: Puppeteer + Handlebars templates
- **Build System**: Electron Builder

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Setup
1. Clone or download the project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Install React dependencies:
   ```bash
   cd src/renderer
   npm install
   ```

4. Return to root directory:
   ```bash
   cd ../..
   ```

## Development

### Running in Development Mode
1. Start the React development server:
   ```bash
   cd src/renderer
   npm start
   ```

2. In a new terminal, start the Electron app:
   ```bash
   cd ../..
   npm run dev
   ```

### Building for Production
1. Build the React app:
   ```bash
   npm run build-renderer
   ```

2. Build the Electron app:
   ```bash
   npm run build
   ```

3. Create distribution packages:
   ```bash
   npm run dist
   ```

## Usage

### First Time Setup
1. Launch MyHours
2. Go to Settings to configure your company information
3. Create your first client in the Projects section
4. Add a project under that client
5. Create tasks under the project
6. Start tracking time!

### Time Tracking Workflow
1. **Select Task**: Choose Client → Project → Task from dropdowns
2. **Start Timer**: Click "Start Timer" button
3. **Work**: The timer runs in the background
4. **Stop Timer**: Click "Stop Timer" when done
5. **Review**: Check time entries in the Time Entries section

### Creating Invoices
1. Go to the Invoice section
2. Select a client and date range
3. Set hourly rate
4. Preview the invoice
5. Generate PDF
6. Time entries are automatically marked as invoiced

### Exporting Data
- Use the Reports section to export time data
- Available formats: CSV, JSON
- Filter by date range or invoice status

## Data Storage

MyHours stores all data locally in a JSON database file located at:
- **macOS**: `~/Library/Application Support/MyHours/myhours_db.json`
- **Windows**: `%APPDATA%/MyHours/myhours_db.json`
- **Linux**: `~/.config/MyHours/myhours_db.json`

## Customization

### Invoice Templates
Invoice templates are stored in `src/main/templates/` and use Handlebars syntax. You can customize:
- Company branding
- Layout and styling
- Data presentation
- Colors and fonts

### Styling
The app uses Styled Components with a dark theme. Modify component styles in the respective React component files.

## Keyboard Shortcuts

- **Ctrl/Cmd + ,**: Open Settings
- **Ctrl/Cmd + N**: Start new timer (when task selected)
- **Ctrl/Cmd + Enter**: Stop active timer
- **Ctrl/Cmd + E**: Export current view

## Troubleshooting

### Common Issues

1. **Timer not starting**: Ensure you have selected a Client, Project, and Task
2. **PDF generation fails**: Check that Puppeteer dependencies are installed
3. **Data not saving**: Verify write permissions to the data directory
4. **Build failures**: Ensure all dependencies are installed correctly

### Reset Application Data
To reset all data:
1. Close MyHours
2. Delete the database file (see Data Storage section for location)
3. Restart MyHours

## Contributing

This is a personal project, but suggestions and improvements are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Share feedback

## License

MIT License - feel free to use and modify for your own needs.

## Roadmap

Future features being considered:
- Cloud sync support
- Mobile companion app
- Advanced reporting
- Team collaboration features
- Integration with accounting software
- Multiple invoice templates
- Automated backup system

---

Built with ❤️ for productivity and time management.
