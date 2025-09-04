import { describe, it, expect, vi } from 'vitest'
import { createMainWindowMock, withDarwinPlatform } from '../helpers/electron-main-test-harness'

// Force 'electron' to use our test double module
vi.mock('electron', () => require('../../mocks/electron.js'))

describe('AutoUpdaterService (dev mock)', () => {
  it('registers IPC, manages feed URL, and simulates download/install', async () => {
    await withDarwinPlatform(async () => {
      const { ipcMain } = await import('electron')
      ipcMain._handlers.clear()
      const mainWindow = createMainWindowMock()

      const mod = await import('../../../src/main/services/auto-updater-service.js')
      const AutoUpdaterService = mod.default || mod

      const electron = await import('electron')
      const versionService = { getBaseVersion: () => '1.2.3' }
      const service = new AutoUpdaterService(mainWindow, versionService, true, electron)
      service.setup()

      // feed URL getters/setters
      const getFeed = ipcMain._handlers.get('update:getFeedUrl')
      const setFeed = ipcMain._handlers.get('update:setFeedUrl')
      expect(getFeed).toBeTypeOf('function')
      const feedBefore = await getFeed()
      expect(feedBefore.url).toContain('mock-update.json')
      const setRes = await setFeed(null, 'http://localhost/custom.json')
      expect(setRes.success).toBe(true)
      const feedAfter = await getFeed()
      expect(feedAfter.url).toBe('http://localhost/custom.json')

      // prime lastInfo to allow download path
      service.updater.lastInfo = { version: '9.9.9' }

      const dlHandler = ipcMain._handlers.get('update:download')
      expect(dlHandler).toBeTypeOf('function')
      const dl = await dlHandler()
      expect(dl.downloaded).toBe(true)

      const eventTypesAfter = mainWindow.webContents.send.mock.calls.map(([, p]) => p?.type)
      expect(eventTypesAfter).toContain('download-progress')
      expect(eventTypesAfter).toContain('update-downloaded')

      const installHandler = ipcMain._handlers.get('update:install')
      const insRes = await installHandler()
      expect(insRes.installed).toBe(true)
    })
  })
})
