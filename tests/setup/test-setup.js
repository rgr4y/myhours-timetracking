import '@testing-library/jest-dom'
import { vi, beforeEach } from 'vitest'
import React from 'react'

// Ensure React is properly set up globally
global.React = React
global.window = global.window || {}

// Make sure React is available in the global scope for JSX
if (typeof globalThis !== 'undefined') {
  globalThis.React = React
}

// Global Electron main-process mock to ensure require('electron') resolves consistently in tests
vi.mock('electron', () => require('../mocks/electron.js'))
global.window.electronAPI = {
  clients: {
    getAll: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve({ id: 1, name: 'Test Client' })),
    update: vi.fn(() => Promise.resolve({ id: 1, name: 'Updated Client' })),
    delete: vi.fn(() => Promise.resolve())
  },
  projects: {
    getAll: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve({ id: 1, name: 'Test Project' })),
    update: vi.fn(() => Promise.resolve({ id: 1, name: 'Updated Project' })),
    delete: vi.fn(() => Promise.resolve())
  },
  tasks: {
    getAll: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve({ id: 1, name: 'Test Task' })),
    update: vi.fn(() => Promise.resolve({ id: 1, name: 'Updated Task' })),
    delete: vi.fn(() => Promise.resolve())
  },
  timeEntries: {
    getAll: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve({ id: 1, description: 'Test Entry' })),
    update: vi.fn(() => Promise.resolve({ id: 1, description: 'Updated Entry' })),
    delete: vi.fn(() => Promise.resolve())
  },
  settings: {
    get: vi.fn(() => Promise.resolve({ timer_rounding: 15 })),
    set: vi.fn(() => Promise.resolve()),
    update: vi.fn(() => Promise.resolve())
  },
  tray: {
    updateTimerStatus: vi.fn()
  },
  updater: {
    check: vi.fn(() => Promise.resolve({})),
    download: vi.fn(() => Promise.resolve({})),
    install: vi.fn(() => Promise.resolve({})),
    onEvent: vi.fn((cb) => {
      // store handler to trigger within tests if needed
      global.__updaterHandler = cb
    }),
    removeEventListener: vi.fn((cb) => {
      if (global.__updaterHandler === cb) global.__updaterHandler = null
    })
  },
  openExternal: vi.fn(() => Promise.resolve(true)),
  invoke: vi.fn((channel, ...args) => {
    if (channel === 'db:getSetting') {
      // default to notifications enabled
      return Promise.resolve('true')
    }
    if (channel === 'update:getFeedUrl') {
      return Promise.resolve({ url: 'http://127.0.0.1:3010/mock-update.json' })
    }
    if (channel === 'update:setFeedUrl') {
      return Promise.resolve({ success: true })
    }
    return Promise.resolve({})
  })
}

// Mock global functions
global.matchMedia = global.matchMedia || function () {
  return {
    matches: false,
    addListener: function () {},
    removeListener: function () {}
  }
}

// Mock CustomEvent for timer events
global.CustomEvent = global.CustomEvent || class CustomEvent extends Event {
  constructor(type, eventInitDict = {}) {
    super(type, eventInitDict)
    this.detail = eventInitDict.detail
  }
}

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})
