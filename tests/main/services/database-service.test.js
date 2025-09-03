import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Database Service - Business Logic', () => {
  describe('Database path resolution', () => {
    it('should determine correct database paths for different environments', () => {
      const getDbPath = (isPackaged, userDataDir, appPath) => {
        if (isPackaged) {
          return `${userDataDir}/myhours.db`
        } else {
          return `${appPath}/prisma/myhours.db`
        }
      }

      expect(getDbPath(true, '/home/user/.config/myHours', '/app')).toBe('/home/user/.config/myHours/myhours.db')
      expect(getDbPath(false, '/home/user/.config/myHours', '/dev/project')).toBe('/dev/project/prisma/myhours.db')
    })

    it('should construct proper database URLs', () => {
      const createDatabaseUrl = (dbPath) => {
        return `file:${dbPath}`
      }

      expect(createDatabaseUrl('/path/to/db.sqlite')).toBe('file:/path/to/db.sqlite')
      expect(createDatabaseUrl('./relative/path.db')).toBe('file:./relative/path.db')
    })
  })

  describe('Database initialization logic', () => {
    it('should validate SQLite version format', () => {
      const isValidSQLiteVersion = (version) => {
        const versionPattern = /^\d+\.\d+\.\d+$/
        return versionPattern.test(version)
      }

      expect(isValidSQLiteVersion('3.39.0')).toBe(true)
      expect(isValidSQLiteVersion('3.40.1')).toBe(true)
      expect(isValidSQLiteVersion('invalid')).toBe(false)
      expect(isValidSQLiteVersion('3.39')).toBe(false)
    })

    it('should count database tables correctly', () => {
      const mockTableResult = [{ count: 5 }]
      const extractTableCount = (result) => {
        return Number(result[0]?.count || 0)
      }

      expect(extractTableCount(mockTableResult)).toBe(5)
      expect(extractTableCount([{ count: 0 }])).toBe(0)
      expect(extractTableCount([])).toBe(0)
    })
  })

  describe('Migration handling', () => {
    it('should detect missing columns', () => {
      const detectMissingColumn = (error) => {
        return (error.message && error.message.includes('no such column')) || 
               error.code === 'SQLITE_ERROR'
      }

      const missingColumnError = { message: 'no such column: is_default' }
      const otherError = { message: 'syntax error' }

      expect(detectMissingColumn(missingColumnError)).toBe(true)
      expect(detectMissingColumn(otherError)).toBe(false)
    })

    it('should validate migration SQL syntax', () => {
      const validateAlterTableSQL = (sql) => {
        const pattern = /^ALTER TABLE\s+"?\w+"?\s+ADD COLUMN\s+"?\w+"?\s+\w+/i
        return pattern.test(sql.trim())
      }

      const validSQL = 'ALTER TABLE "projects" ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT false'
      const invalidSQL = 'DROP TABLE projects'

      expect(validateAlterTableSQL(validSQL)).toBe(true)
      expect(validateAlterTableSQL(invalidSQL)).toBe(false)
    })
  })

  describe('Database seeding logic', () => {
    it('should determine if seeding is needed', () => {
      const needsSeeding = (clientCount) => {
        return clientCount === 0
      }

      expect(needsSeeding(0)).toBe(true)
      expect(needsSeeding(1)).toBe(false)
      expect(needsSeeding(10)).toBe(false)
    })

    it('should validate seed script paths', () => {
      const isValidSeedPath = (path) => {
        return path.endsWith('seed.js') && path.includes('prisma')
      }

      expect(isValidSeedPath('/app/prisma/seed.js')).toBe(true)
      expect(isValidSeedPath('/resources/prisma/seed.js')).toBe(true)
      expect(isValidSeedPath('/app/scripts/other.js')).toBe(false)
    })

    it('should handle seed execution environments', () => {
      const getSeedCommand = (isPackaged, seedPath, execPath) => {
        if (isPackaged) {
          return `"${execPath}" "${seedPath}"`
        } else {
          return 'npx prisma db seed'
        }
      }

      expect(getSeedCommand(true, '/app/seed.js', '/usr/bin/node')).toBe('"/usr/bin/node" "/app/seed.js"')
      expect(getSeedCommand(false, '', '')).toBe('npx prisma db seed')
    })
  })

  describe('Backup management', () => {
    it('should identify backup files correctly', () => {
      const isBackupFile = (filename) => {
        return filename.includes('.backup.') && /\d+/.test(filename)
      }

      expect(isBackupFile('myhours.backup.1641234567')).toBe(true)
      expect(isBackupFile('myhours.db')).toBe(false)
      expect(isBackupFile('template.backup.123')).toBe(true)
    })

    it('should sort backups by timestamp', () => {
      const sortBackupsByTimestamp = (backups) => {
        return backups.sort((a, b) => {
          const aTimestamp = parseInt(a.split('.backup.')[1]) || 0
          const bTimestamp = parseInt(b.split('.backup.')[1]) || 0
          return bTimestamp - aTimestamp // newest first
        })
      }

      const backups = [
        'db.backup.1000',
        'db.backup.3000', 
        'db.backup.2000'
      ]

      const sorted = sortBackupsByTimestamp([...backups])
      expect(sorted[0]).toBe('db.backup.3000')
      expect(sorted[1]).toBe('db.backup.2000')
      expect(sorted[2]).toBe('db.backup.1000')
    })

    it('should determine files to delete for cleanup', () => {
      const getFilesToCleanup = (backups, keepCount) => {
        const sorted = backups.sort((a, b) => b.timestamp - a.timestamp)
        return sorted.slice(keepCount)
      }

      const backups = [
        { name: 'backup1', timestamp: 1000 },
        { name: 'backup2', timestamp: 3000 },
        { name: 'backup3', timestamp: 2000 },
        { name: 'backup4', timestamp: 4000 }
      ]

      const toDelete = getFilesToCleanup(backups, 2)
      expect(toDelete).toHaveLength(2)
      expect(toDelete[0].timestamp).toBe(2000)
      expect(toDelete[1].timestamp).toBe(1000)
    })
  })

  describe('Database operations', () => {
    it('should handle foreign key constraints during nuke', () => {
      const nukeTables = () => {
        const operations = [
          'PRAGMA foreign_keys = OFF',
          'DELETE FROM timeEntry',
          'DELETE FROM invoice', 
          'DELETE FROM task',
          'DELETE FROM project',
          'DELETE FROM client',
          'DELETE FROM setting',
          'PRAGMA foreign_keys = ON'
        ]
        return operations
      }

      const operations = nukeTables()
      expect(operations[0]).toBe('PRAGMA foreign_keys = OFF')
      expect(operations[operations.length - 1]).toBe('PRAGMA foreign_keys = ON')
      expect(operations).toContain('DELETE FROM timeEntry')
      expect(operations).toContain('DELETE FROM client')
    })

    it('should validate table deletion order', () => {
      const getTableDeletionOrder = () => {
        // Delete in order to respect foreign key dependencies
        return ['timeEntry', 'invoice', 'task', 'project', 'client', 'setting']
      }

      const order = getTableDeletionOrder()
      expect(order.indexOf('timeEntry')).toBeLessThan(order.indexOf('task'))
      expect(order.indexOf('task')).toBeLessThan(order.indexOf('project'))
      expect(order.indexOf('project')).toBeLessThan(order.indexOf('client'))
    })
  })

  describe('Client operations', () => {
    it('should validate client data before creation', () => {
      const validateClient = (client) => {
        const required = ['name']
        const optional = ['email', 'phone', 'address', 'hourlyRate']
        
        const hasRequired = required.every(field => 
          client[field] && typeof client[field] === 'string' && client[field].trim()
        )
        
        if (!hasRequired) return false
        
        // Validate optional fields if present
        if (client.email && !client.email.includes('@')) return false
        if (client.hourlyRate && (typeof client.hourlyRate !== 'number' || client.hourlyRate < 0)) return false
        
        return true
      }

      expect(validateClient({ name: 'Test Client' })).toBe(true)
      expect(validateClient({ name: 'Test', email: 'test@example.com', hourlyRate: 100 })).toBe(true)
      expect(validateClient({})).toBe(false) // missing name
      expect(validateClient({ name: '' })).toBe(false) // empty name
      expect(validateClient({ name: 'Test', email: 'invalid' })).toBe(false) // invalid email
      expect(validateClient({ name: 'Test', hourlyRate: -10 })).toBe(false) // negative rate
    })

    it('should handle client relationships', () => {
      const clientHasRelatedData = (client) => {
        return (client.projects && client.projects.length > 0) ||
               (client.timeEntries && client.timeEntries.length > 0)
      }

      const clientWithProjects = { name: 'Client', projects: [{ id: 1 }] }
      const clientWithTimeEntries = { name: 'Client', timeEntries: [{ id: 1 }] }
      const emptyClient = { name: 'Client', projects: [], timeEntries: [] }

      expect(clientHasRelatedData(clientWithProjects)).toBe(true)
      expect(clientHasRelatedData(clientWithTimeEntries)).toBe(true)
      expect(clientHasRelatedData(emptyClient)).toBe(false)
    })
  })

  describe('Project operations', () => {
    it('should validate project data', () => {
      const validateProject = (project) => {
        const required = ['name', 'clientId']
        
        return required.every(field => project[field] !== undefined && project[field] !== null) &&
               typeof project.name === 'string' &&
               project.name.trim().length > 0 &&
               typeof project.clientId === 'number' &&
               project.clientId > 0
      }

      expect(validateProject({ name: 'Project', clientId: 1 })).toBe(true)
      expect(validateProject({ name: '', clientId: 1 })).toBe(false) // empty name
      expect(validateProject({ name: 'Project' })).toBe(false) // missing clientId
      expect(validateProject({ name: 'Project', clientId: 0 })).toBe(false) // invalid clientId
    })

    it('should handle default project logic', () => {
      const setDefaultProject = (projects, newDefaultId) => {
        return projects.map(project => ({
          ...project,
          isDefault: project.id === newDefaultId
        }))
      }

      const projects = [
        { id: 1, name: 'Project 1', isDefault: true },
        { id: 2, name: 'Project 2', isDefault: false }
      ]

      const updated = setDefaultProject(projects, 2)
      expect(updated[0].isDefault).toBe(false)
      expect(updated[1].isDefault).toBe(true)
    })
  })

  describe('Time entry operations', () => {
    it('should validate time entry data', () => {
      const validateTimeEntry = (entry) => {
        if (!entry.startTime) return false
        if (entry.endTime && new Date(entry.endTime) <= new Date(entry.startTime)) return false
        if (entry.duration && (typeof entry.duration !== 'number' || entry.duration < 0)) return false
        
        return true
      }

      const validEntry = { 
        startTime: '2025-01-01T10:00:00Z',
        endTime: '2025-01-01T11:00:00Z',
        duration: 60
      }

      const invalidEntry1 = {} // missing startTime
      const invalidEntry2 = { 
        startTime: '2025-01-01T11:00:00Z',
        endTime: '2025-01-01T10:00:00Z' // end before start
      }

      expect(validateTimeEntry(validEntry)).toBe(true)
      expect(validateTimeEntry(invalidEntry1)).toBe(false)
      expect(validateTimeEntry(invalidEntry2)).toBe(false)
    })

    it('should calculate time entry duration', () => {
      const calculateDuration = (startTime, endTime) => {
        if (!startTime || !endTime) return 0
        
        const start = new Date(startTime)
        const end = new Date(endTime)
        
        if (end <= start) return 0
        
        return Math.floor((end - start) / 1000 / 60) // minutes
      }

      expect(calculateDuration('2025-01-01T10:00:00Z', '2025-01-01T11:30:00Z')).toBe(90)
      expect(calculateDuration('2025-01-01T10:00:00Z', '2025-01-01T10:00:00Z')).toBe(0)
      expect(calculateDuration(null, '2025-01-01T11:00:00Z')).toBe(0)
    })

    it('should handle active timer logic', () => {
      const findActiveTimer = (timeEntries) => {
        return timeEntries.find(entry => entry.isActive === true) || null
      }

      const entries = [
        { id: 1, isActive: false },
        { id: 2, isActive: true },
        { id: 3, isActive: false }
      ]

      expect(findActiveTimer(entries)?.id).toBe(2)
      expect(findActiveTimer([])).toBe(null)
      expect(findActiveTimer([{ id: 1, isActive: false }])).toBe(null)
    })
  })

  describe('Settings operations', () => {
    it('should handle setting key validation', () => {
      const isValidSettingKey = (key) => {
        const validKeys = [
          'lastUsedClientId',
          'lastUsedProjectId', 
          'lastUsedTaskId',
          'company_name',
          'company_email',
          'timer_rounding'
        ]
        return typeof key === 'string' && validKeys.includes(key)
      }

      expect(isValidSettingKey('lastUsedClientId')).toBe(true)
      expect(isValidSettingKey('company_name')).toBe(true)
      expect(isValidSettingKey('invalid_key')).toBe(false)
      expect(isValidSettingKey(null)).toBe(false)
    })

    it('should convert setting values appropriately', () => {
      const convertSettingValue = (key, value) => {
        if (key.endsWith('Id')) {
          return parseInt(value, 10)
        }
        if (key === 'timer_rounding') {
          return parseFloat(value)
        }
        return String(value)
      }

      expect(convertSettingValue('lastUsedClientId', '123')).toBe(123)
      expect(convertSettingValue('timer_rounding', '15.5')).toBe(15.5)
      expect(convertSettingValue('company_name', 'Test')).toBe('Test')
    })
  })

  describe('Error handling', () => {
    it('should classify database errors', () => {
      const classifyDatabaseError = (error) => {
        if (error.code === 'SQLITE_CONSTRAINT') return 'constraint'
        if (error.code === 'ENOENT') return 'file_not_found'
        if (error.message && error.message.includes('database is locked')) return 'locked'
        if (error.message && error.message.includes('no such table')) return 'schema'
        return 'unknown'
      }

      expect(classifyDatabaseError({ code: 'SQLITE_CONSTRAINT' })).toBe('constraint')
      expect(classifyDatabaseError({ code: 'ENOENT' })).toBe('file_not_found')
      expect(classifyDatabaseError({ message: 'database is locked' })).toBe('locked')
      expect(classifyDatabaseError({ message: 'no such table: clients' })).toBe('schema')
      expect(classifyDatabaseError({ message: 'unknown error' })).toBe('unknown')
    })

    it('should handle connection recovery', () => {
      const shouldRetryConnection = (error, retryCount, maxRetries) => {
        if (retryCount >= maxRetries) return false
        
        const retryableErrors = ['database is locked', 'SQLITE_BUSY', 'connection lost']
        return retryableErrors.some(errType => 
          (error.message && error.message.includes(errType)) || error.code === errType
        )
      }

      expect(shouldRetryConnection({ message: 'database is locked' }, 1, 3)).toBe(true)
      expect(shouldRetryConnection({ code: 'SQLITE_BUSY' }, 2, 3)).toBe(true)
      expect(shouldRetryConnection({ message: 'database is locked' }, 3, 3)).toBe(false)
      expect(shouldRetryConnection({ message: 'syntax error' }, 1, 3)).toBe(false)
    })
  })
})
