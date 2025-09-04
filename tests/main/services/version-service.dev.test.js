import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// child_process stub
vi.mock('child_process', () => ({ execSync: vi.fn() }))

// Mock child_process with mutable execSync for tests
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}))

// Fresh module per test for isolated spies
async function freshService() {
  await vi.resetModules()
  const mod = await import('@main/services/version-service.js')
  const VersionService = mod.default || mod
  const electron = await import('electron')
  const { execSync } = await import('child_process')
  return new VersionService(electron, { execSync })
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('VersionService (dev)', () => {
  it('getBaseVersion returns package.json version when not packaged', async () => {
    const electron = await import('electron')
    electron.app.isPackaged = false
    const svc = await freshService()
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'))
    expect(svc.getBaseVersion()).toBe(pkg.version)
  })

  it('getCurrentCommitHash returns short hash when git succeeds', async () => {
    const electron = await import('electron')
    electron.app.isPackaged = false
    const { execSync } = await import('child_process')
    execSync.mockReturnValue('abcdef\n')
    const svc = await freshService()
    expect(svc.getCurrentCommitHash()).toBe('abcdef')
  })

  it('getCurrentCommitHash returns null when git fails', async () => {
    const electron = await import('electron')
    electron.app.isPackaged = false
    const { execSync } = await import('child_process')
    execSync.mockImplementation(() => { throw new Error('no git') })
    const svc = await freshService()
    expect(svc.getCurrentCommitHash()).toBeNull()
  })

  it('getLatestTag returns tag and short commit when git succeeds', async () => {
    const electron = await import('electron')
    electron.app.isPackaged = false
    const { execSync } = await import('child_process')
    execSync.mockReset()
    execSync.mockImplementationOnce(() => 'v1.2.3') // describe --tags
      .mockImplementationOnce(() => '1234567890abcdef') // rev-list full hash
    const svc = await freshService()
    expect(svc.getLatestTag()).toEqual({ tag: 'v1.2.3', commitHash: '123456' })
  })

  it('getLatestTag returns null when git fails', async () => {
    const electron = await import('electron')
    electron.app.isPackaged = false
    const { execSync } = await import('child_process')
    execSync.mockImplementation(() => { throw new Error('no tags') })
    const svc = await freshService()
    expect(svc.getLatestTag()).toBeNull()
  })

  it('getDisplayVersion logic for dev: no git -> base version', async () => {
    const electron = await import('electron')
    electron.app.isPackaged = false
    const svc = await freshService()
    vi.spyOn(svc, 'getBaseVersion').mockReturnValue('0.1.0')
    vi.spyOn(svc, 'getCurrentCommitHash').mockReturnValue(null)
    expect(svc.getDisplayVersion()).toBe('0.1.0')
  })

  it('getDisplayVersion logic for dev: has hash, no tags -> base-hash', async () => {
    const electron = await import('electron')
    electron.app.isPackaged = false
    const svc = await freshService()
    vi.spyOn(svc, 'getBaseVersion').mockReturnValue('0.1.0')
    vi.spyOn(svc, 'getCurrentCommitHash').mockReturnValue('abc123')
    vi.spyOn(svc, 'getLatestTag').mockReturnValue(null)
    expect(svc.getDisplayVersion()).toBe('0.1.0-abc123')
  })

  it('getDisplayVersion logic for dev: matches tag commit -> tag', async () => {
    const electron = await import('electron')
    electron.app.isPackaged = false
    const svc = await freshService()
    vi.spyOn(svc, 'getBaseVersion').mockReturnValue('0.1.0')
    vi.spyOn(svc, 'getCurrentCommitHash').mockReturnValue('abc123')
    vi.spyOn(svc, 'getLatestTag').mockReturnValue({ tag: 'v0.1.0', commitHash: 'abc123' })
    expect(svc.getDisplayVersion()).toBe('v0.1.0')
  })

  it('getDisplayVersion logic for dev: differs from tag -> base-hash', async () => {
    const electron = await import('electron')
    electron.app.isPackaged = false
    const svc = await freshService()
    vi.spyOn(svc, 'getBaseVersion').mockReturnValue('0.1.0')
    vi.spyOn(svc, 'getCurrentCommitHash').mockReturnValue('zzz999')
    vi.spyOn(svc, 'getLatestTag').mockReturnValue({ tag: 'v0.1.0', commitHash: 'abc123' })
    expect(svc.getDisplayVersion()).toBe('0.1.0-zzz999')
  })
})
