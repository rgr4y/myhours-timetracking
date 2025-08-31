import '@testing-library/jest-dom'
import { vi, beforeEach } from 'vitest'
import React from 'react'

// Mock React for tests
global.React = React

// Mock window.electronAPI
global.window = global.window || {}
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
    set: vi.fn(() => Promise.resolve())
  },
  tray: {
    updateTimerStatus: vi.fn()
  },
  invoke: vi.fn()
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