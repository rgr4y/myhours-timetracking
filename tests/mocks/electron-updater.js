// CommonJS mock for electron-updater used in tests
const { vi } = require('vitest')

function createAutoUpdaterMock() {
  const listeners = {}
  const on = (evt, cb) => {
    listeners[evt] = listeners[evt] || []
    listeners[evt].push(cb)
  }
  const emit = (evt, payload) => {
    ;(listeners[evt] || []).forEach((cb) => cb(payload))
  }
  return {
    on,
    emit, // helper for tests if needed
    checkForUpdates: vi.fn(async () => {
      emit('checking-for-update')
      emit('update-not-available', { version: '0.0.0' })
    }),
    downloadUpdate: vi.fn(async () => {
      emit('download-progress', { percent: 100 })
      emit('update-downloaded', { version: '0.0.0' })
    }),
    quitAndInstall: vi.fn(() => {}),
    setFeedURL: vi.fn(() => {}),
    get updateConfigPath() {
      return '/tmp/app-update.yml'
    },
    logger: { transports: { file: { level: 'info' } } },
    autoDownload: false,
    autoInstallOnAppQuit: true,
  }
}

module.exports = { autoUpdater: createAutoUpdaterMock() }

