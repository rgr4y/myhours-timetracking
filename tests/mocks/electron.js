import { vi } from 'vitest';

const handlers = new Map();

export const ipcMain = {
  handle: (channel, fn) => {
    handlers.set(channel, fn);
  },
  removeHandler: (channel) => {
    handlers.delete(channel);
  },
  invoke: async (channel, ...args) => {
    const fn = handlers.get(channel);
    if (!fn) {
      throw new Error(`No handler for ${channel}`);
    }
    const event = { sender: {}, reply: vi.fn(), webContents: { send: vi.fn() } };
    return await fn(event, ...args);
  },
  on: vi.fn(),
  once: vi.fn(),
  _handlers: handlers,
};

export const dialog = {
  showMessageBox: vi.fn(async () => ({ response: 1 })),
  showSaveDialog: vi.fn(async () => ({ canceled: false, filePath: '/mock/path.pdf' })),
  showErrorBox: vi.fn(),
};

export const shell = {
  openExternal: vi.fn(async () => true),
};

export const app = {
  isPackaged: false,
  getVersion: vi.fn(() => '0.0.0'),
  getPath: vi.fn(() => '/tmp'),
  getAppPath: vi.fn(() => process.cwd()),
  whenReady: vi.fn(() => Promise.resolve()),
  quit: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  requestSingleInstanceLock: vi.fn(() => true),
};

export class BrowserWindow {
  constructor() {
    this.webContents = {
      send: vi.fn(),
      loadURL: vi.fn(async () => {}),
      loadFile: vi.fn(async () => {}),
      openDevTools: vi.fn(),
      setWindowOpenHandler: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn(),
      printToPDF: vi.fn(async () => Buffer.from('PDF')),
    };
    this.show = vi.fn();
    this.hide = vi.fn();
    this.focus = vi.fn();
    this.isVisible = vi.fn(() => true);
    this.isMinimized = vi.fn(() => false);
    this.restore = vi.fn();
    this.getContentBounds = vi.fn(() => ({ width: 1200, height: 840 }));
    this.once = vi.fn((_event, cb) => {
      if (typeof cb === 'function') cb();
    });
    this.on = vi.fn();
    this.setTitle = vi.fn();
    this.loadURL = vi.fn(async () => {});
    this.loadFile = vi.fn(async () => {});
    this.destroy = vi.fn();
    this.moveTop = vi.fn();
    this.setMenu = vi.fn();
  }
}

BrowserWindow.getAllWindows = () => [];

export class Tray {
  constructor() {
    this.setToolTip = vi.fn();
    this.setContextMenu = vi.fn();
    this.on = vi.fn();
    this.destroy = vi.fn();
    this.setImage = vi.fn();
  }
}

export const Menu = {
  buildFromTemplate: vi.fn(() => ({ items: [] })),
};

export const nativeImage = {
  createFromBuffer: vi.fn(() => {
    const resized = {
      setTemplateImage: vi.fn(),
      getSize: vi.fn(() => ({ width: 16, height: 16 })),
    };

    return {
      isEmpty: vi.fn(() => false),
      resize: vi.fn(() => resized),
      setTemplateImage: vi.fn(),
      getSize: vi.fn(() => ({ width: 32, height: 32 })),
    };
  }),
};

export default {
  ipcMain,
  dialog,
  shell,
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
};
