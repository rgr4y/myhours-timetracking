const winston = require('winston');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');

// Global BigInt serialization fix for JSON logging
const originalJSONStringify = JSON.stringify;
JSON.stringify = function(value, replacer, space) {
  return originalJSONStringify(value, function(key, val) {
    if (typeof val === 'bigint') {
      return val.toString() + 'n';
    }
    return replacer ? replacer.call(this, key, val) : val;
  }, space);
};

class LoggerService {
  constructor() {
    this.logger = null;
    this.isInitialized = false;
  }

  initialize() {
    if (this.isInitialized) {
      return this.logger;
    }

    const isDev = process.env.NODE_ENV === 'development';
    const isPackaged = app ? app.isPackaged : false;

    // Determine log directory
    let logDir;
    if (isDev) {
      // Development: logs/ in project root
      logDir = path.join(process.cwd(), 'logs');
    } else {
      // Production: logs/ in user data directory
      const userDataPath = app ? app.getPath('userData') : process.cwd();
      logDir = path.join(userDataPath, 'logs');
    }

    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, 'app.log');
    const errorFile = path.join(logDir, 'error.log');

    // Configure log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let log = `${timestamp} [${level.toUpperCase()}] ${message}`;
        
        // Add metadata if present
        if (Object.keys(meta).length > 0) {
          log += ` ${JSON.stringify(meta)}`;
        }
        
        // Add stack trace for errors
        if (stack) {
          log += `\n${stack}`;
        }
        
        return log;
      })
    );

    // Create transports
    const transports = [
      // File transport for all logs
      new winston.transports.File({
        filename: logFile,
        level: isDev ? 'debug' : 'info', // Production logs at info level and above
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true
      }),
      // Separate file for errors
      new winston.transports.File({
        filename: errorFile,
        level: 'error',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 3,
        tailable: true
      })
    ];

    // Add console transport for development
    if (isDev) {
      transports.push(
        new winston.transports.Console({
          level: 'debug',
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      );
    }

    this.logger = winston.createLogger({
      format: logFormat,
      transports,
      // Handle uncaught exceptions and rejections
      exceptionHandlers: [
        new winston.transports.File({ 
          filename: path.join(logDir, 'exceptions.log'),
          maxsize: 5 * 1024 * 1024,
          maxFiles: 2
        })
      ],
      rejectionHandlers: [
        new winston.transports.File({ 
          filename: path.join(logDir, 'rejections.log'),
          maxsize: 5 * 1024 * 1024,
          maxFiles: 2
        })
      ],
      exitOnError: false
    });

    this.isInitialized = true;

    // Log initialization
    this.logger.info('Logger initialized', {
      environment: isDev ? 'development' : 'production',
      logDir,
      logFile,
      errorFile,
      isPackaged
    });

    return this.logger;
  }

  getLogger() {
    if (!this.isInitialized) {
      return this.initialize();
    }
    return this.logger;
  }

  // Convenience methods with prefixes for different components
  main(level, message, meta = {}) {
    this.getLogger()[level](`[MAIN] ${message}`, meta);
  }

  database(level, message, meta = {}) {
    this.getLogger()[level](`[DATABASE] ${message}`, meta);
  }

  tray(level, message, meta = {}) {
    this.getLogger()[level](`[TRAY] ${message}`, meta);
  }

  updater(level, message, meta = {}) {
    this.getLogger()[level](`[UPDATER] ${message}`, meta);
  }

  websocket(level, message, meta = {}) {
    this.getLogger()[level](`[WEBSOCKET] ${message}`, meta);
  }

  renderer(level, message, meta = {}) {
    this.getLogger()[level](`[RNDR] ${message}`, meta);
  }

  // Helper methods for common log levels
  info(message, meta = {}) {
    this.getLogger().info(message, meta);
  }

  error(message, meta = {}) {
    this.getLogger().error(message, meta);
  }

  warn(message, meta = {}) {
    this.getLogger().warn(message, meta);
  }

  debug(message, meta = {}) {
    this.getLogger().debug(message, meta);
  }
}

// Export singleton instance
module.exports = new LoggerService();
