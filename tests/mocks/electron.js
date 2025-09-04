// CommonJS mock for 'electron' used during tests
const handlers = new Map()

const ipcMain = {
  handle: (channel, fn) => {
    handlers.set(channel, fn)
  },
  removeHandler: (channel) => {
    handlers.delete(channel)
  },
  // Helper to simulate ipcRenderer.invoke
  invoke: async (channel, ...args) => {
    const fn = handlers.get(channel)
    if (!fn) throw new Error(`No handler for ${channel}`)
    const event = { sender: {}, reply: () => {} }
    return await fn(event, ...args)
  },
  _handlers: handlers,
}

const dialog = {
  showMessageBox: async () => ({ response: 1 }),
}

const app = {
  isPackaged: false,
  getVersion: () => '0.0.0',
}

class BrowserWindow {}

module.exports = { ipcMain, dialog, app, BrowserWindow }
