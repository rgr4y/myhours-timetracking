import { vi } from 'vitest'

// Reusable IPC Main mock with invoke helper
export function createIpcMainMock() {
  const handlers = new Map()
  return {
    handle: vi.fn((channel, fn) => {
      handlers.set(channel, fn)
    }),
    removeHandler: vi.fn((channel) => {
      handlers.delete(channel)
    }),
    // Helper to simulate ipcRenderer.invoke(channel, ...args)
    invoke: async (channel, ...args) => {
      const fn = handlers.get(channel)
      if (!fn) throw new Error(`No handler for ${channel}`)
      const event = { sender: {}, reply: vi.fn() }
      return await fn(event, ...args)
    },
    _handlers: handlers,
  }
}

// Minimal BrowserWindow mock
export function createMainWindowMock() {
  return {
    webContents: {
      send: vi.fn(),
    },
  }
}

// Dialog mock
export function createDialogMock(responseIndex = 1) {
  return {
    showMessageBox: vi.fn(async () => ({ response: responseIndex })),
  }
}

// electron-updater mock
export function createAutoUpdaterMock() {
  const listeners = {}
  const on = (evt, cb) => {
    listeners[evt] = listeners[evt] || []
    listeners[evt].push(cb)
  }
  const emit = (evt, payload) => {
    ;(listeners[evt] || []).forEach((cb) => cb(payload))
  }
  return {
    // API surface used by service
    on,
    emit, // test helper
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

// Platform helpers
export function withDarwinPlatform(fn) {
  const original = Object.getOwnPropertyDescriptor(process, 'platform')
  Object.defineProperty(process, 'platform', { value: 'darwin' })
  try {
    return fn()
  } finally {
    if (original) Object.defineProperty(process, 'platform', original)
  }
}
