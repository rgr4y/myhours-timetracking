import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// Prepare temp resources dir for packaged mode
const resourcesPath = fs.mkdtempSync(path.join(os.tmpdir(), 'mh-res-prod-'))

describe('PathService (packaged)', () => {
  it('resolves paths for production and bootstraps DB from template', async () => {
    // Provide resourcesPath before constructing service
    // eslint-disable-next-line no-undef
    process.resourcesPath = resourcesPath

    await vi.resetModules()
    const electron = await import('electron')
    // Configure packaged mode and paths
    electron.app.isPackaged = true
    electron.app.getAppPath = () => path.join(resourcesPath, 'app.asar')
    const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'mh-user-prod-'))
    electron.app.getPath = (key) => (key === 'userData' ? userDataPath : '')

    const mod = await import('@main/services/path-service.js')
    const PathService = mod.default || mod
    const svc = new PathService(electron)

    const dbPath = svc.getDatabasePath('prod.db')
    expect(dbPath).toBe(path.join(userDataPath, 'prod.db'))

    const tplPath = svc.getTemplateDatabasePath('template.db')
    expect(tplPath).toBe(path.join(resourcesPath, 'prisma', 'template.db'))

    const schemaPath = svc.getSchemaPath()
    expect(schemaPath).toBe(path.join(resourcesPath, 'prisma', 'schema.prisma'))

    const migPath = svc.getMigrationsPath()
    expect(migPath).toBe(path.join(resourcesPath, 'prisma', 'migrations'))

    const seedPath = svc.getSeedScriptPath()
    expect(seedPath).toBe(path.join(resourcesPath, 'prisma', 'seed.js'))

    const prismaBin = svc.getPrismaBinaryPath()
    expect(prismaBin).toBe(path.join(resourcesPath, 'node_modules', 'prisma', 'build', 'index.js'))

    const projectRoot = svc.getProjectRoot()
    expect(projectRoot).toBe(resourcesPath)

    const url = svc.getDatabaseUrl('prod.db')
    expect(url).toBe(`file:${dbPath}`)

    // Create template and bootstrap into userData
    const prismaDir = path.join(resourcesPath, 'prisma')
    fs.mkdirSync(prismaDir, { recursive: true })
    const templateFile = path.join(prismaDir, 'template.db')
    fs.writeFileSync(templateFile, 'TEMPLATE')
    const boot = svc.bootstrapDatabaseFromTemplate('myhours.db', 'template.db')
    expect(boot).toBe(true)
    expect(fs.existsSync(path.join(userDataPath, 'myhours.db'))).toBe(true)
  })
})
