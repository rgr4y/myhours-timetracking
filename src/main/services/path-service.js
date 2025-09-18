import * as electronBuiltin from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Centralized path resolution service for myHours app
 * Handles cross-platform paths for development and production environments
 */
class PathService {
  constructor(electronModule) {
    this.electron = electronModule || electronBuiltin;
    this.isPackaged = this.electron.app.isPackaged;
    this.appPath = this.electron.app.getAppPath();
    this.userDataDir = this.electron.app.getPath('userData');
    this.resourcesPath = process.resourcesPath;
  }

  /**
   * Get the correct database file path for the current environment
   * @param {string} dbName - Name of the database file (e.g., 'myhours.db')
   * @returns {string} Absolute path to the database file
   */
  getDatabasePath(dbName = 'myhours.db') {
    if (this.isPackaged) {
      // Production: Database in user data directory
      // macOS: ~/Library/Application Support/myHours/
      // Windows: %APPDATA%/myHours/
      // Linux: ~/.config/myHours/
      return path.join(this.userDataDir, dbName);
    } else {
      // Development: Database in project prisma folder
      return path.join(this.appPath, 'prisma', dbName);
    }
  }

  /**
   * Get the template database path (for bootstrapping new databases)
   * @param {string} templateName - Name of the template file (e.g., 'template.db')
   * @returns {string} Absolute path to the template database file
   */
  getTemplateDatabasePath(templateName = 'template.db') {
    if (this.isPackaged) {
      // Production: Template is in the resources folder
      const base = this.resourcesPath || this.appPath;
      return path.join(base, 'prisma', templateName);
    } else {
      // Development: Template is in project prisma folder
      return path.join(this.appPath, 'prisma', templateName);
    }
  }

  /**
   * Get the Prisma schema file path
   * @returns {string} Absolute path to the schema.prisma file
   */
  getSchemaPath() {
    if (this.isPackaged) {
      // Production: Schema is in the resources folder
      const base = this.resourcesPath || path.dirname(this.appPath);
      return path.join(base, 'prisma', 'schema.prisma');
    } else {
      // Development: Schema is in project prisma folder
      return path.join(this.appPath, 'prisma', 'schema.prisma');
    }
  }

  /**
   * Get the Prisma migrations directory path
   * @returns {string} Absolute path to the migrations directory
   */
  getMigrationsPath() {
    if (this.isPackaged) {
      // Production: Migrations are in the resources folder
      const base = this.resourcesPath || path.dirname(this.appPath);
      return path.join(base, 'prisma', 'migrations');
    } else {
      // Development: Migrations are in project prisma folder
      return path.join(this.appPath, 'prisma', 'migrations');
    }
  }

  /**
   * Get the Prisma seed script path
   * @returns {string} Absolute path to the seed script
   */
  getSeedScriptPath() {
    if (this.isPackaged) {
      // Production: Seed script is in the resources folder
      const base = this.resourcesPath || path.dirname(this.appPath);
      return path.join(base, 'prisma', 'seed.js');
    } else {
      // Development: Seed script is in project prisma folder
      return path.join(this.appPath, 'prisma', 'seed.js');
    }
  }

  /**
   * Get the Prisma CLI binary path
   * @returns {string} Absolute path to the Prisma CLI binary
   */
  getPrismaBinaryPath() {
    if (this.isPackaged) {
      const base = this.resourcesPath || path.dirname(this.appPath);
      const candidates = [
        path.join(base, 'app.asar.unpacked', 'node_modules', 'prisma', 'build', 'index.js'),
        path.join(base, 'node_modules', 'prisma', 'build', 'index.js')
      ];

      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }

      return candidates[0];
    } else {
      // Development: Use npx prisma (CLI handles path resolution)
      return 'npx prisma';
    }
  }

  /**
   * Get the project root directory (useful for development)
   * @returns {string} Absolute path to the project root
   */
  getProjectRoot() {
    if (this.isPackaged) {
      // Production: No project root concept, return resources path
      return this.resourcesPath || path.dirname(this.appPath);
    } else {
      // Development: Project root is typically three levels up from this file
      // This file is in src/main/services/path-service.js, so we go up 3 levels
      return path.resolve(__dirname, '..', '..', '..');
    }
  }

  /**
   * Get the database URL for Prisma (file: protocol with absolute path)
   * @param {string} dbName - Name of the database file
   * @returns {string} Database URL for Prisma
   */
  getDatabaseUrl(dbName = 'myhours.db') {
    const dbPath = this.getDatabasePath(dbName);
    return `file:${dbPath}`;
  }

  /**
   * Ensure a directory exists, creating it if necessary
   * @param {string} dirPath - Directory path to ensure exists
   */
  ensureDirectoryExists(dirPath) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
    } catch (error) {
      // Directory might already exist, which is fine
      if (error.code !== 'EEXIST') {
        console.warn('[PATH-SERVICE] Failed to create directory:', dirPath, error.message);
      }
    }
  }

  /**
   * Bootstrap database from template if it doesn't exist
   * @param {string} dbName - Target database name
   * @param {string} templateName - Template database name
   * @returns {boolean} True if database was bootstrapped, false if it already existed
   */
  bootstrapDatabaseFromTemplate(dbName = 'myhours.db', templateName = 'template.db') {
    const dbPath = this.getDatabasePath(dbName);
    const templatePath = this.getTemplateDatabasePath(templateName);

    // Ensure the database directory exists
    this.ensureDirectoryExists(path.dirname(dbPath));

    if (!fs.existsSync(dbPath) && fs.existsSync(templatePath)) {
      try {
        fs.copyFileSync(templatePath, dbPath);
        console.log('[PATH-SERVICE] Bootstrapped database from template:', templatePath, '->', dbPath);
        return true;
      } catch (error) {
        console.warn('[PATH-SERVICE] Failed to bootstrap database:', error.message);
        return false;
      }
    }

    return false;
  }

  /**
   * Get the Prisma schema file path
   * @returns {string} Absolute path to the schema.prisma file
   */
  getSchemaPath() {
    if (this.isPackaged) {
      // Production: Schema is in the resources folder
      const base = this.resourcesPath || path.dirname(this.appPath);
      return path.join(base, 'prisma', 'schema.prisma');
    } else {
      // Development: Schema is in project prisma folder
      return path.join(this.appPath, 'prisma', 'schema.prisma');
    }
  }

  /**
   * Get platform-specific information for debugging
   * @returns {object} Platform and path information
   */
  getDebugInfo() {
    return {
      platform: process.platform,
      isPackaged: this.isPackaged,
      appPath: this.appPath,
      userDataDir: this.userDataDir,
      resourcesPath: this.resourcesPath,
      databasePath: this.getDatabasePath(),
      migrationsPath: this.getMigrationsPath(),
      projectRoot: this.getProjectRoot()
    };
  }
}

export default PathService;
