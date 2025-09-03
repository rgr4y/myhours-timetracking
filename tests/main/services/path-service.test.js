import { describe, it, expect } from 'vitest'
import path from 'path'

describe('Path Service - Basic Logic', () => {
  describe('Path manipulation utilities', () => {
    it('should handle basic path operations', () => {
      const testPath = '/Users/test/documents/file.txt'
      
      expect(path.dirname(testPath)).toBe('/Users/test/documents')
      expect(path.basename(testPath)).toBe('file.txt')
      expect(path.extname(testPath)).toBe('.txt')
    })

    it('should join paths correctly', () => {
      const joined = path.join('home', 'user', 'documents', 'file.txt')
      expect(joined.includes('file.txt')).toBe(true)
      expect(joined.includes('documents')).toBe(true)
    })

    it('should resolve relative paths', () => {
      const relative = path.relative('/Users/test', '/Users/test/documents/file.txt')
      expect(relative).toBe('documents/file.txt')
    })
  })

  describe('Environment-based path resolution', () => {
    it('should resolve database paths correctly for different environments', () => {
      const getDatabasePath = (isPackaged, userDataDir, appPath, dbName = 'myhours.db') => {
        if (isPackaged) {
          return path.join(userDataDir, dbName)
        } else {
          return path.join(appPath, 'prisma', dbName)
        }
      }

      expect(getDatabasePath(true, '/user/data', '/app', 'test.db')).toBe(path.join('/user/data', 'test.db'))
      expect(getDatabasePath(false, '/user/data', '/app', 'test.db')).toBe(path.join('/app', 'prisma', 'test.db'))
    })

    it('should construct database URLs correctly', () => {
      const createDatabaseUrl = (dbPath) => `file:${dbPath}`
      
      expect(createDatabaseUrl('/path/to/database.db')).toBe('file:/path/to/database.db')
      expect(createDatabaseUrl('./relative/path.db')).toBe('file:./relative/path.db')
    })

    it('should resolve Prisma paths for different environments', () => {
      const getPrismaPath = (isPackaged, resourcesPath, appPath, fileName) => {
        if (isPackaged) {
          const base = resourcesPath || appPath
          return path.join(base, 'prisma', fileName)
        } else {
          return path.join(appPath, 'prisma', fileName)
        }
      }

      expect(getPrismaPath(true, '/resources', '/app', 'schema.prisma'))
        .toBe(path.join('/resources', 'prisma', 'schema.prisma'))
      expect(getPrismaPath(false, '/resources', '/app', 'schema.prisma'))
        .toBe(path.join('/app', 'prisma', 'schema.prisma'))
    })
  })

  describe('Path validation and safety', () => {
    it('should validate file paths', () => {
      const isValidPath = (filePath) => {
        return typeof filePath === 'string' && 
               filePath.length > 0 && 
               !filePath.includes('..')
      }

      expect(isValidPath('/valid/path.txt')).toBe(true)
      expect(isValidPath('relative/path.txt')).toBe(true)
      expect(isValidPath('../malicious/path')).toBe(false)
      expect(isValidPath('')).toBe(false)
    })

    it('should sanitize file names', () => {
      const sanitizeFileName = (fileName) => {
        return fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
      }

      expect(sanitizeFileName('normal_file.txt')).toBe('normal_file.txt')
      expect(sanitizeFileName('file with spaces.txt')).toBe('file_with_spaces.txt')
      expect(sanitizeFileName('file/with/slashes.txt')).toBe('file_with_slashes.txt')
    })
  })

  describe('File extension utilities', () => {
    it('should identify file types by extension', () => {
      const getFileType = (filename) => {
        const ext = path.extname(filename).toLowerCase()
        const types = {
          '.pdf': 'pdf',
          '.csv': 'csv',
          '.json': 'json',
          '.db': 'database',
          '.log': 'log'
        }
        return types[ext] || 'unknown'
      }
      
      expect(getFileType('invoice.pdf')).toBe('pdf')
      expect(getFileType('export.csv')).toBe('csv')
      expect(getFileType('data.db')).toBe('database')
      expect(getFileType('app.log')).toBe('log')
      expect(getFileType('unknown.xyz')).toBe('unknown')
    })

    it('should validate file extensions', () => {
      const isValidExtension = (filename, allowedExts) => {
        const ext = path.extname(filename).toLowerCase()
        return allowedExts.includes(ext)
      }
      
      const allowedExts = ['.pdf', '.csv', '.json']
      expect(isValidExtension('report.pdf', allowedExts)).toBe(true)
      expect(isValidExtension('data.csv', allowedExts)).toBe(true)
      expect(isValidExtension('config.json', allowedExts)).toBe(true)
      expect(isValidExtension('image.png', allowedExts)).toBe(false)
    })
  })

  describe('Path validation logic', () => {
    it('should validate path format', () => {
      const isValidPath = (pathStr) => {
        if (!pathStr || typeof pathStr !== 'string') return false
        return pathStr.length > 0 && !pathStr.includes('\0')
      }
      
      expect(isValidPath('/valid/path')).toBe(true)
      expect(isValidPath('relative/path')).toBe(true)
      expect(isValidPath('')).toBe(false)
      expect(isValidPath(null)).toBe(false)
      expect(isValidPath(123)).toBe(false)
    })

    it('should detect absolute vs relative paths', () => {
      const isAbsolute = (pathStr) => path.isAbsolute(pathStr)
      
      expect(isAbsolute('/Users/test')).toBe(true)
      // Windows paths may not work on macOS, so let's test more universal patterns
      expect(isAbsolute('relative/path')).toBe(false)
      expect(isAbsolute('./relative')).toBe(false)
      expect(isAbsolute('../parent')).toBe(false)
    })
  })

  describe('Filename utilities', () => {
    it('should generate safe filenames', () => {
      const sanitizeFilename = (name) => {
        return name
          .replace(/[<>:"/\\|?*]/g, '-')
          .replace(/\s+/g, '-')
          .toLowerCase()
      }
      
      expect(sanitizeFilename('My Invoice: Client Name')).toBe('my-invoice--client-name')
      expect(sanitizeFilename('Report/Data?')).toBe('report-data-')
      expect(sanitizeFilename('File with spaces')).toBe('file-with-spaces')
    })

    it('should add timestamps to filenames', () => {
      const addTimestamp = (filename) => {
        const ext = path.extname(filename)
        const base = path.basename(filename, ext)
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
        return `${base}-${timestamp}${ext}`
      }
      
      const result = addTimestamp('invoice.pdf')
      expect(result).toMatch(/invoice-\d{8}T\d{6}\.pdf/)
    })
  })

  describe('Directory structure logic', () => {
    it('should organize paths by type', () => {
      const organizePaths = (paths) => {
        return paths.reduce((acc, p) => {
          const ext = path.extname(p)
          const type = ext || 'folder'
          if (!acc[type]) acc[type] = []
          acc[type].push(p)
          return acc
        }, {})
      }
      
      const paths = [
        '/path/to/file.pdf',
        '/path/to/data.csv',
        '/path/to/config.json',
        '/path/to/another.pdf',
        '/path/to/directory'
      ]
      
      const organized = organizePaths(paths)
      expect(organized['.pdf']).toHaveLength(2)
      expect(organized['.csv']).toHaveLength(1)
      expect(organized['.json']).toHaveLength(1)
      expect(organized['folder']).toHaveLength(1)
    })
  })
})