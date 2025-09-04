import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

describe('PathService (dev)', () => {
  it('resolves paths for development and bootstraps DB from template', async () => {
    await vi.resetModules()
    const electron = await import('electron')
    // Configure dev mode app paths
    electron.app.isPackaged = false
    const appPath = fs.mkdtempSync(path.join(os.tmpdir(), 'mh-app-dev-'))
    const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'mh-user-dev-'))
    electron.app.getAppPath = () => appPath
    electron.app.getPath = (key) => (key === 'userData' ? userData : '')

    const mod = await import('@main/services/path-service.js')
    const PathService = mod.default || mod
    const svc = new PathService(electron)

    const dbPath = svc.getDatabasePath('dev.db')
    expect(dbPath).toBe(path.join(appPath, 'prisma', 'dev.db'))

    const tplPath = svc.getTemplateDatabasePath('template.db')
    expect(tplPath).toBe(path.join(appPath, 'prisma', 'template.db'))

    const schemaPath = svc.getSchemaPath()
    expect(schemaPath).toBe(path.join(appPath, 'prisma', 'schema.prisma'))

    const migPath = svc.getMigrationsPath()
    expect(migPath).toBe(path.join(appPath, 'prisma', 'migrations'))

    const seedPath = svc.getSeedScriptPath()
    expect(seedPath).toBe(path.join(appPath, 'prisma', 'seed.js'))

    const prismaBin = svc.getPrismaBinaryPath()
    expect(prismaBin).toBe('npx prisma')

    // project root points to an absolute path
    const projectRoot = svc.getProjectRoot()
    expect(path.isAbsolute(projectRoot)).toBe(true)

    const url = svc.getDatabaseUrl('dev.db')
    expect(url).toBe(`file:${dbPath}`)

    // Bootstrap from template
    const prismaDir = path.join(appPath, 'prisma')
    fs.mkdirSync(prismaDir, { recursive: true })
    const templateFile = path.join(prismaDir, 'template.db')
    fs.writeFileSync(templateFile, 'TEMPLATE')
    const bootstrapped = svc.bootstrapDatabaseFromTemplate('myhours.db', 'template.db')
    expect(bootstrapped).toBe(true)
    expect(fs.existsSync(path.join(prismaDir, 'myhours.db'))).toBe(true)

    const debug = svc.getDebugInfo()
    expect(debug.isPackaged).toBe(false)
    expect(debug.appPath).toBe(appPath)
    expect(debug.userDataDir).toBe(userData)
  })
})
