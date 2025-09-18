#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * CSV Import Script for MyHours Time Tracking
 * 
 * Imports time entries from a CSV file with columns:
 * Date, Duration, DecimalHours
 * 
 * Usage:
 *   node scripts/import-csv.js [csv-file] [options]
 * 
 * Options:
 *   --db-path <path>    Path to SQLite database file
 *   --client <name>     Client name to assign entries to (default: creates "CSV Import Client")
 *   --project <name>    Project name to assign entries to (default: creates "CSV Import Project")
 *   --task <name>       Task name to assign entries to (default: creates "CSV Import Task")
 *   --description <text> Description for all imported entries (default: "Imported from CSV")
 *   --dry-run          Show what would be imported without actually importing
 *   --help             Show this help message
 */

class CSVImporter {
  constructor(options = {}) {
    this.options = {
      clientName: null,
      projectName: null, 
      taskName: null,
      description: 'Imported from CSV',
      dryRun: false,
      dbPath: null,
      ...options
    };
    
    this.prisma = null;
    this.client = null;
    this.project = null;
    this.task = null;
  }

  async initializeDatabase() {
    // Set up database path
    let dbPath = this.options.dbPath;
    let isPackagedDb = false;
    
    if (!dbPath) {
      // Try to find the packaged app's database first
      const homeDir = os.homedir();
      
      // Common packaged app locations on macOS
      const possiblePaths = [
        path.join(homeDir, 'Library', 'Application Support', 'MyHours', 'myhours.db'),
        path.join(homeDir, 'Library', 'Application Support', 'myhours', 'myhours.db'),
        // Also check dev location as fallback
        path.join(__dirname, '..', 'prisma', 'myhours.db')
      ];
      
      // Find the first existing database
      for (let i = 0; i < possiblePaths.length; i++) {
        const possiblePath = possiblePaths[i];
        if (fs.existsSync(possiblePath)) {
          dbPath = possiblePath;
          // Mark as packaged DB if it's one of the first two paths
          isPackagedDb = i < 2;
          console.log(`📊 Found database at: ${dbPath}`);
          break;
        }
      }
      
      // If none found, try Electron app.getPath as last resort
      if (!dbPath) {
        try {
          const { app } = await import('electron');
          const userDataDir = app.getPath('userData');
          dbPath = path.join(userDataDir, 'myhours.db');
          isPackagedDb = true;
        } catch (e) {
          // Final fallback to dev location
          dbPath = path.join(__dirname, '..', 'prisma', 'myhours.db');
          isPackagedDb = false;
        }
      }
    }

    if (!fs.existsSync(dbPath)) {
      throw new Error(`Database file not found: ${dbPath}`);
    }

    // Warn before importing to packaged database
    if (isPackagedDb && !this.options.dryRun) {
      console.log(`\n⚠️  WARNING: You are about to import data into your production MyHours database!`);
      console.log(`   Database: ${dbPath}`);
      console.log(`   This will add real time entries to your actual data.`);
      console.log(`   Consider using --dry-run first to preview the import.\n`);
      
      const confirmation = await this.promptConfirmation('Do you want to continue with the import? (y/N): ');
      if (!confirmation) {
        console.log('❌ Import cancelled by user');
        process.exit(0);
      }
    }

    console.log(`📊 Using database: ${dbPath}`);
    
    // Set up Prisma with the database path
    process.env.DATABASE_URL = `file:${dbPath}`;
    this.prisma = new PrismaClient();
    
    await this.prisma.$connect();
    console.log('✅ Connected to database');
  }

  async promptConfirmation(message) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(message, (answer) => {
        rl.close();
        const response = answer.trim().toLowerCase();
        resolve(response === 'y' || response === 'yes');
      });
    });
  }

  async ensureClientProjectTask() {
    if (this.options.dryRun) {
      // For dry runs, just use dummy data
      if (this.options.clientName) {
        console.log(`🔍 Would find client: ${this.options.clientName}`);
        this.client = { id: 1, name: this.options.clientName };
      } else {
        console.log(`🔍 No client specified - entries will be unassigned`);
        this.client = null;
      }
      
      if (this.options.projectName) {
        console.log(`🔍 Would find project: ${this.options.projectName}`);
        this.project = { id: 1, name: this.options.projectName };
      } else {
        console.log(`🔍 No project specified - entries will be unassigned`);
        this.project = null;
      }
      
      if (this.options.taskName) {
        console.log(`🔍 Would find task: ${this.options.taskName}`);
        this.task = { id: 1, name: this.options.taskName };
      } else {
        console.log(`🔍 No task specified - entries will be unassigned`);
        this.task = null;
      }
      return;
    }

    // Find client if specified
    if (this.options.clientName) {
      this.client = await this.prisma.client.findFirst({
        where: { name: this.options.clientName }
      });

      if (!this.client) {
        throw new Error(`Client "${this.options.clientName}" not found. Please create it first or omit --client to create unassigned entries.`);
      } else {
        console.log(`👤 Using client: ${this.client.name}`);
      }
    } else {
      console.log(`👤 No client specified - entries will be unassigned`);
      this.client = null;
    }

    // Find project if specified
    if (this.options.projectName) {
      if (!this.client) {
        throw new Error(`Cannot specify project without a client. Please specify --client as well.`);
      }
      
      this.project = await this.prisma.project.findFirst({
        where: { 
          name: this.options.projectName,
          clientId: this.client.id 
        }
      });

      if (!this.project) {
        throw new Error(`Project "${this.options.projectName}" not found for client "${this.client.name}". Please create it first or omit --project.`);
      } else {
        console.log(`📁 Using project: ${this.project.name}`);
      }
    } else {
      console.log(`📁 No project specified - entries will be unassigned`);
      this.project = null;
    }

    // Find task if specified
    if (this.options.taskName) {
      if (!this.project) {
        throw new Error(`Cannot specify task without a project. Please specify --project as well.`);
      }
      
      this.task = await this.prisma.task.findFirst({
        where: { 
          name: this.options.taskName,
          projectId: this.project.id 
        }
      });

      if (!this.task) {
        throw new Error(`Task "${this.options.taskName}" not found for project "${this.project.name}". Please create it first or omit --task.`);
      } else {
        console.log(`📋 Using task: ${this.task.name}`);
      }
    } else {
      console.log(`📋 No task specified - entries will be unassigned`);
      this.task = null;
    }
  }

  parseCSV(csvContent) {
    const lines = csvContent.trim().split('\n');
    const entries = [];
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV with quoted fields
      const fields = this.parseCSVLine(line);
      if (fields.length >= 3) {
        const [dateStr, durationStr, decimalHoursStr] = fields;
        
        try {
          const date = this.parseDate(dateStr);
          const decimalHours = parseFloat(decimalHoursStr);
          const durationMinutes = Math.round(decimalHours * 60);
          
          entries.push({
            date,
            durationStr,
            decimalHours,
            durationMinutes
          });
        } catch (e) {
          console.warn(`⚠️  Skipping invalid row ${i + 1}: ${line} (${e.message})`);
        }
      }
    }
    
    return entries;
  }

  parseCSVLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current) {
      fields.push(current.trim());
    }
    
    return fields;
  }

  parseDate(dateStr) {
    // Handle format like "Thu, Aug 28, 2025"
    const cleaned = dateStr.replace(/^"/, '').replace(/"$/, '').trim();
    
    // Remove day of week prefix if present
    const withoutDow = cleaned.replace(/^[A-Za-z]+,\s*/, '');
    
    const date = new Date(withoutDow);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${dateStr}`);
    }
    
    return date;
  }

  async importEntries(entries) {
    console.log(`\n📥 Importing ${entries.length} time entries...`);
    
    let imported = 0;
    let skipped = 0;
    
    for (const entry of entries) {
      try {
        // Create start and end times for the entry
        // Start at 9 AM on the given date
        const startTime = new Date(entry.date);
        startTime.setHours(9, 0, 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + entry.durationMinutes);
        
        if (this.options.dryRun) {
          const assignmentInfo = [];
          if (this.client) assignmentInfo.push(`Client: ${this.client.name}`);
          if (this.project) assignmentInfo.push(`Project: ${this.project.name}`);
          if (this.task) assignmentInfo.push(`Task: ${this.task.name}`);
          const assignment = assignmentInfo.length > 0 ? ` [${assignmentInfo.join(', ')}]` : ' [Unassigned]';
          
          console.log(`🔍 Would import: ${entry.date.toDateString()} - ${entry.durationStr} (${entry.durationMinutes} min)${assignment}`);
          imported++;
        } else {
          // Check if entry already exists for this date with same assignment
          const whereClause = {
            startTime: {
              gte: new Date(entry.date.getFullYear(), entry.date.getMonth(), entry.date.getDate()),
              lt: new Date(entry.date.getFullYear(), entry.date.getMonth(), entry.date.getDate() + 1)
            }
          };
          
          // Add assignment filters if specified
          if (this.client) whereClause.clientId = this.client.id;
          else whereClause.clientId = null;
          
          if (this.project) whereClause.projectId = this.project.id;
          else whereClause.projectId = null;
          
          if (this.task) whereClause.taskId = this.task.id;
          else whereClause.taskId = null;

          const existingEntry = await this.prisma.timeEntry.findFirst({
            where: whereClause
          });

          if (existingEntry) {
            console.log(`⏭️  Skipping ${entry.date.toDateString()} - entry already exists`);
            skipped++;
            continue;
          }

          await this.prisma.timeEntry.create({
            data: {
              clientId: this.client ? this.client.id : null,
              projectId: this.project ? this.project.id : null,
              taskId: this.task ? this.task.id : null,
              description: this.options.description,
              startTime,
              endTime,
              duration: entry.durationMinutes,
              isActive: false,
              isInvoiced: false
            }
          });
          
          const assignmentInfo = [];
          if (this.client) assignmentInfo.push(`Client: ${this.client.name}`);
          if (this.project) assignmentInfo.push(`Project: ${this.project.name}`);
          if (this.task) assignmentInfo.push(`Task: ${this.task.name}`);
          const assignment = assignmentInfo.length > 0 ? ` [${assignmentInfo.join(', ')}]` : ' [Unassigned]';
          
          console.log(`✅ Imported: ${entry.date.toDateString()} - ${entry.durationStr}${assignment}`);
          imported++;
        }
      } catch (e) {
        console.error(`❌ Failed to import ${entry.date.toDateString()}: ${e.message}`);
      }
    }
    
    console.log(`\n📊 Import complete:`);
    console.log(`   ✅ Imported: ${imported}`);
    if (skipped > 0) {
      console.log(`   ⏭️  Skipped: ${skipped}`);
    }
  }

  async close() {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
  }
}

function showHelp() {
  console.log(`
CSV Import Script for MyHours Time Tracking

Usage:
  node scripts/import-csv.js [csv-file] [options]

Options:
  --db-path <path>     Path to SQLite database file
  --client <name>      Client name to assign entries to (must exist in database)
  --project <name>     Project name to assign entries to (must exist for specified client)
  --task <name>        Task name to assign entries to (must exist for specified project)
  --description <text> Description for all imported entries (default: "Imported from CSV")
  --dry-run           Show what would be imported without actually importing
  --help              Show this help message

Database Location:
  The script automatically finds your MyHours database in this order:
  1. ~/Library/Application Support/MyHours/myhours.db (packaged app)
  2. ~/Library/Application Support/myhours/myhours.db (alternate)
  3. ./prisma/myhours.db (development)
  4. Custom path specified with --db-path

Assignment Rules:
  - If no --client is specified, entries will be unassigned to any client
  - If no --project is specified, entries will be unassigned to any project  
  - If no --task is specified, entries will be unassigned to any task
  - Project requires a client to be specified
  - Task requires both client and project to be specified
  - All specified entities must already exist in the database

Examples:
  # Import unassigned entries
  node scripts/import-csv.js timesheet.csv
  
  # Import to existing client only
  node scripts/import-csv.js timesheet.csv --client "Acme Corp"
  
  # Import to existing client and project
  node scripts/import-csv.js timesheet.csv --client "Acme Corp" --project "Website Redesign"
  
  # Import to existing client, project, and task
  node scripts/import-csv.js timesheet.csv --client "Acme Corp" --project "Website Redesign" --task "Development"
  
  # Use custom database path
  node scripts/import-csv.js timesheet.csv --db-path /path/to/custom.db
  
  # Dry run to see what would be imported
  node scripts/import-csv.js timesheet.csv --dry-run

Expected CSV format:
  Date,Duration,DecimalHours
  "Thu, Aug 28, 2025",2h 10 min,2.17
  "Wed, Aug 27, 2025",5 h 45 min,5.75
`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.length === 0) {
    showHelp();
    return;
  }
  
  const csvFile = args[0];
  const options = {};
  
  // Parse command line options
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--db-path' && i + 1 < args.length) {
      options.dbPath = args[++i];
    } else if (arg === '--client' && i + 1 < args.length) {
      options.clientName = args[++i];
    } else if (arg === '--project' && i + 1 < args.length) {
      options.projectName = args[++i];
    } else if (arg === '--task' && i + 1 < args.length) {
      options.taskName = args[++i];
    } else if (arg === '--description' && i + 1 < args.length) {
      options.description = args[++i];
    }
  }
  
  if (!fs.existsSync(csvFile)) {
    console.error(`❌ CSV file not found: ${csvFile}`);
    process.exit(1);
  }
  
  console.log(`📄 Reading CSV file: ${csvFile}`);
  if (options.dryRun) {
    console.log(`🔍 DRY RUN MODE - No data will be imported`);
  }
  
  const importer = new CSVImporter(options);
  
  try {
    await importer.initializeDatabase();
    await importer.ensureClientProjectTask();
    
    const csvContent = fs.readFileSync(csvFile, 'utf8');
    const entries = importer.parseCSV(csvContent);
    
    if (entries.length === 0) {
      console.log('⚠️  No valid entries found in CSV file');
      return;
    }
    
    await importer.importEntries(entries);
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  } finally {
    await importer.close();
  }
}

// Handle the case where this script is run outside of Electron
const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch(console.error);
}

export { CSVImporter };
export default CSVImporter;
