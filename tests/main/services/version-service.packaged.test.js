import { describe, it, expect } from 'vitest'

describe('VersionService (packaged)', () => {
  it('getBaseVersion and getDisplayVersion return app version when packaged', async () => {
    const electron = await import('electron')
    electron.app.isPackaged = true
    electron.app.getVersion = () => '5.6.7'
    const mod = await import('@main/services/version-service.js')
    const VersionService = mod.default || mod
    const svc = new VersionService(electron)
    expect(svc.getBaseVersion()).toBe('5.6.7')
    expect(svc.getDisplayVersion()).toBe('5.6.7')
  })
})
