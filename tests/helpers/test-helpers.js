import { vi } from 'vitest'

/**
 * Mock for the useElectronAPI hook
 */
export const mockUseElectronAPI = () => ({
  waitForReady: vi.fn(() => Promise.resolve(window.electronAPI)),
  isReady: true
})

/**
 * Mock timer data for testing
 */
export const mockTimerData = {
  activeTimer: {
    id: 1,
    description: 'Test timer description',
    startTime: new Date().toISOString(),
    isActive: true,
    clientId: 1,
    projectId: 1,
    taskId: 1,
    client: { id: 1, name: 'Test Client' },
    project: { id: 1, name: 'Test Project' },
    task: { id: 1, name: 'Test Task' }
  },
  stoppedTimer: {
    id: 1,
    description: 'Test timer description',
    startTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    endTime: new Date().toISOString(),
    isActive: false,
    duration: 3600, // 1 hour in seconds
    clientId: 1,
    projectId: 1,
    taskId: 1
  }
}

/**
 * Mock clients data
 */
export const mockClients = [
  { id: 1, name: 'Client 1', color: '#FF0000' },
  { id: 2, name: 'Client 2', color: '#00FF00' },
  { id: 3, name: 'Client 3', color: '#0000FF' }
]

/**
 * Mock projects data
 */
export const mockProjects = [
  { id: 1, name: 'Project 1', clientId: 1, color: '#FF0000' },
  { id: 2, name: 'Project 2', clientId: 1, color: '#00FF00' },
  { id: 3, name: 'Project 3', clientId: 2, color: '#0000FF' }
]

/**
 * Mock tasks data
 */
export const mockTasks = [
  { id: 1, name: 'Task 1', projectId: 1 },
  { id: 2, name: 'Task 2', projectId: 1 },
  { id: 3, name: 'Task 3', projectId: 2 }
]

/**
 * Helper to create a mock timer context value
 */
export const createMockTimerContext = (overrides = {}) => ({
  isRunning: false,
  time: 0,
  activeTimer: null,
  selectedClient: null,
  description: '',
  startTimer: vi.fn(),
  stopTimer: vi.fn(),
  updateTimerDescription: vi.fn(),
  updateTimerClient: vi.fn(),
  updateTimerProject: vi.fn(),
  updateTimerTask: vi.fn(),
  checkActiveTimer: vi.fn(),
  formatTime: vi.fn((seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }),
  ...overrides
})

/**
 * Helper to simulate timer running for testing
 */
export const simulateTimerRunning = (startTime = new Date(), currentTime = new Date()) => {
  const elapsedSeconds = Math.floor((currentTime - startTime) / 1000)
  return elapsedSeconds
}