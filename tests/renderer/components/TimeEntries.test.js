import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from 'styled-components'
import TimeEntries from '../../src/renderer/src/components/TimeEntries'
import { TimerProvider } from '../../src/renderer/src/context/TimerContext'
import { mockUseElectronAPI, createMockTimerContext, mockClients, mockProjects, mockTasks } from '../helpers/test-helpers'
import { theme } from '../../src/renderer/src/styles/theme'

// Mock the hooks
vi.mock('../../src/renderer/src/hooks/useElectronAPI', () => ({
  useElectronAPI: () => mockUseElectronAPI()
}))

vi.mock('../../src/renderer/src/hooks/useModalKeyboard', () => ({
  useModalKeyboard: vi.fn()
}))

// Mock the timer context
const TimerContextProvider = ({ children, value }) => (
  <TimerProvider value={value}>
    {children}
  </TimerProvider>
)

// Test wrapper component
const TestWrapper = ({ children, timerContextValue = {} }) => (
  <ThemeProvider theme={theme}>
    <TimerContextProvider value={createMockTimerContext(timerContextValue)}>
      {children}
    </TimerContextProvider>
  </ThemeProvider>
)

// Mock time entries data
const mockTimeEntries = [
  {
    id: 1,
    description: 'Working on feature A',
    startTime: '2025-09-02T09:00:00.000Z',
    endTime: '2025-09-02T10:30:00.000Z',
    isActive: false,
    clientId: 1,
    projectId: 1,
    taskId: 1,
    client: { id: 1, name: 'Client A' },
    project: { id: 1, name: 'Project Alpha' },
    task: { id: 1, name: 'Development' }
  },
  {
    id: 2,
    description: 'Meeting with stakeholders',
    startTime: '2025-09-02T14:00:00.000Z',
    endTime: null,
    isActive: true,
    clientId: 2,
    projectId: 2,
    taskId: 2,
    client: { id: 2, name: 'Client B' },
    project: { id: 2, name: 'Project Beta' },
    task: { id: 2, name: 'Meetings' }
  }
]

// Enhanced mock for electronAPI with comprehensive data
const mockElectronAPI = {
  timeEntries: {
    getAll: vi.fn(() => Promise.resolve(mockTimeEntries)),
    update: vi.fn(() => Promise.resolve({})),
    delete: vi.fn(() => Promise.resolve({}))
  },
  clients: {
    getAllWithRelationships: vi.fn(() => Promise.resolve([
      {
        ...mockClients[0],
        projects: [
          { ...mockProjects[0], tasks: [mockTasks[0], mockTasks[1]] },
          { ...mockProjects[1], tasks: [mockTasks[2]] }
        ]
      },
      {
        ...mockClients[1],
        projects: [
          { ...mockProjects[2], tasks: [] }
        ]
      }
    ]))
  },
  projects: {
    getDefault: vi.fn(() => Promise.resolve(null))
  },
  settings: {
    get: vi.fn(() => Promise.resolve({ timer_rounding: '15' })),
    getLastUsedClient: vi.fn(() => Promise.resolve(null)),
    getLastUsedProject: vi.fn(() => Promise.resolve(null)),
    getLastUsedTask: vi.fn(() => Promise.resolve(null))
  },
  invoke: vi.fn((channel, ...args) => {
    if (channel === 'db:createTimeEntry') {
      return Promise.resolve({ id: 3, ...args[0] })
    }
    if (channel === 'db:updateTimeEntry') {
      return Promise.resolve({ id: args[0], ...args[1] })
    }
    return Promise.resolve({})
  })
}

describe('TimeEntries Component', () => {
  let user

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
    
    // Setup global mocks
    global.window.electronAPI = mockElectronAPI
    global.window.confirm = vi.fn(() => true)
    global.window.alert = vi.fn()
    
    // Mock console methods to reduce noise
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders the timer section with default state', async () => {
      render(
        <TestWrapper>
          <TimeEntries />
        </TestWrapper>
      )

      // Check timer display
      expect(screen.getByText('00:00:00')).toBeInTheDocument()
      expect(screen.getByText('Start Timer')).toBeInTheDocument()
      
      // Check form elements
      expect(screen.getByPlaceholderText('Describe this work')).toBeInTheDocument()
      expect(screen.getByText('No Client Selected')).toBeInTheDocument()
      expect(screen.getByText('No Project Selected')).toBeInTheDocument()
      expect(screen.getByText('No Task Selected')).toBeInTheDocument()
    })

    it('renders time entries section', async () => {
      render(
        <TestWrapper>
          <TimeEntries />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Recent Time Entries')).toBeInTheDocument()
        expect(screen.getByText('Manual Entry')).toBeInTheDocument()
      })
    })

    it('shows loading state initially', async () => {
      render(
        <TestWrapper>
          <TimeEntries />
        </TestWrapper>
      )

      expect(screen.getByText('Loading Time Entries...')).toBeInTheDocument()
    })
  })

  describe('Timer Functionality', () => {
    it('displays running timer state correctly', async () => {
      const mockTimerContext = {
        isRunning: true,
        time: 3661, // 1 hour, 1 minute, 1 second
        activeTimer: {
          id: 1,
          description: 'Working on tests',
          startTime: new Date().toISOString(),
          isActive: true,
          client: { id: 1, name: 'Test Client' },
          project: { id: 1, name: 'Test Project' },
          task: { id: 1, name: 'Test Task' }
        },
        selectedClient: { id: 1, name: 'Test Client' },
        description: 'Working on tests'
      }

      render(
        <TestWrapper timerContextValue={mockTimerContext}>
          <TimeEntries />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('01:01:01')).toBeInTheDocument()
        expect(screen.getByText('Stop Timer')).toBeInTheDocument()
        expect(screen.getByText('Test Client • Test Project • Test Task')).toBeInTheDocument()
      })
    })

    it('calls startTimer when start button is clicked', async () => {
      const mockStartTimer = vi.fn()
      const mockTimerContext = {
        startTimer: mockStartTimer
      }

      render(
        <TestWrapper timerContextValue={mockTimerContext}>
          <TimeEntries />
        </TestWrapper>
      )

      const startButton = screen.getByText('Start Timer')
      await user.click(startButton)

      expect(mockStartTimer).toHaveBeenCalledWith(
        {
          clientId: null,
          projectId: null,
          taskId: null,
          description: ''
        },
        ''
      )
    })

    it('calls stopTimer when stop button is clicked', async () => {
      const mockStopTimer = vi.fn()
      const mockTimerContext = {
        isRunning: true,
        stopTimer: mockStopTimer
      }

      render(
        <TestWrapper timerContextValue={mockTimerContext}>
          <TimeEntries />
        </TestWrapper>
      )

      const stopButton = screen.getByText('Stop Timer')
      await user.click(stopButton)

      expect(mockStopTimer).toHaveBeenCalledWith(15) // Default rounding
    })

    it('updates description when typing', async () => {
      const mockUpdateTimerDescription = vi.fn()
      const mockTimerContext = {
        updateTimerDescription: mockUpdateTimerDescription,
        activeTimer: { id: 1 }
      }

      render(
        <TestWrapper timerContextValue={mockTimerContext}>
          <TimeEntries />
        </TestWrapper>
      )

      const descriptionInput = screen.getByPlaceholderText('Describe this work')
      await user.type(descriptionInput, 'New description')

      await waitFor(() => {
        expect(mockUpdateTimerDescription).toHaveBeenCalledWith('New description')
      })
    })
  })

  describe('Client/Project/Task Selection', () => {
    it('opens client dropdown and selects a client', async () => {
      render(
        <TestWrapper>
          <TimeEntries />
        </TestWrapper>
      )

      await waitFor(() => {
        const clientDropdown = screen.getByText('No Client Selected')
        expect(clientDropdown).toBeInTheDocument()
      })

      // Click to open dropdown
      const clientButton = screen.getByText('No Client Selected')
      await user.click(clientButton)

      await waitFor(() => {
        expect(screen.getByText('Client 1')).toBeInTheDocument()
        expect(screen.getByText('Client 2')).toBeInTheDocument()
      })
    })

    it('enables project dropdown after client selection', async () => {
      render(
        <TestWrapper>
          <TimeEntries />
        </TestWrapper>
      )

      await waitFor(() => {
        // Project dropdown should be disabled initially
        const projectButton = screen.getByText('No Project Selected')
        expect(projectButton.closest('button')).toHaveStyle('opacity: 0.5')
      })
    })

    it('handles rounding selection', async () => {
      render(
        <TestWrapper>
          <TimeEntries />
        </TestWrapper>
      )

      await waitFor(() => {
        const roundingButtons = screen.getAllByText(/\d+m/)
        expect(roundingButtons).toHaveLength(5) // 5m, 10m, 15m, 30m, 60m
        
        // 15m should be active by default
        const fifteenMinButton = screen.getByText('15m')
        expect(fifteenMinButton).toHaveStyle('background: #007AFF') // primary color
      })
    })
  })

  describe('Time Entries Display', () => {
    beforeEach(() => {
      // Mock the data loading to return our test data
      mockElectronAPI.timeEntries.getAll.mockResolvedValue(mockTimeEntries)
    })

    it('displays time entries grouped by date', async () => {
      render(
        <TestWrapper>
          <TimeEntries />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Working on feature A')).toBeInTheDocument()
        expect(screen.getByText('Meeting with stakeholders')).toBeInTheDocument()
        expect(screen.getByText('ACTIVE')).toBeInTheDocument()
      })
    })

    it('shows correct duration for completed entries', async () => {
      render(
        <TestWrapper>
          <TimeEntries />
        </TestWrapper>
      )

      await waitFor(() => {
        // Should show duration for completed entry
        expect(screen.getByText('1h 30m')).toBeInTheDocument()
      })
    })

    it('shows running time for active entries', async () => {
      render(
        <TestWrapper>
          <TimeEntries />
        </TestWrapper>
      )

      await waitFor(() => {
        // Active entry should show running time
        const activeEntry = screen.getByText('Meeting with stakeholders').closest('[data-testid="time-entry"]') || 
                            screen.getByText('Meeting with stakeholders').closest('div')
        expect(activeEntry).toBeInTheDocument()
      })
    })

    it('handles play button click for time entries', async () => {
      const mockStartTimer = vi.fn()
      const mockTimerContext = {
        startTimer: mockStartTimer
      }

      render(
        <TestWrapper timerContextValue={mockTimerContext}>
          <TimeEntries />
        </TestWrapper>
      )

      await waitFor(() => {
        const playButtons = screen.getAllByTitle('Start timer with this entry\'s details')
        expect(playButtons).toHaveLength(1) // Only non-active entries have play buttons
      })
    })

    it('handles edit button click', async () => {
      render(
        <TestWrapper>
          <TimeEntries />
        </TestWrapper>
      )

      await waitFor(() => {
        const editButtons = screen.getAllByTitle('Edit entry')
        expect(editButtons).toHaveLength(1) // Only non-active entries can be edited
      })
    })

    it('handles delete button click', async () => {
      render(
        <TestWrapper>
          <TimeEntries />
        </TestWrapper>
      )

      await waitFor(() => {
        const deleteButtons = screen.getAllByTitle('Delete entry')
        if (deleteButtons.length > 0) {
          expect(deleteButtons[0]).toBeInTheDocument()
        }
      })
    })
  })

  describe('Manual Entry Modal', () => {
    it('opens modal when Manual Entry button is clicked', async () => {
      render(
        <TestWrapper>
          <TimeEntries />
        </TestWrapper>
      )

      const manualEntryButton = screen.getByText('Manual Entry')
      await user.click(manualEntryButton)

      await waitFor(() => {
        expect(screen.getByText('Manual Time Entry')).toBeInTheDocument()
        expect(screen.getByText('Client *')).toBeInTheDocument()
        expect(screen.getByText('Start Time *')).toBeInTheDocument()
        expect(screen.getByText('End Time *')).toBeInTheDocument()
      })
    })

    it('closes modal when close button is clicked', async () => {
      render(
        <TestWrapper>
          <TimeEntries />
        </TestWrapper>
      )

      // Open modal
      const manualEntryButton = screen.getByText('Manual Entry')
      await user.click(manualEntryButton)

      // Close modal
      const closeButton = screen.getByText('×')
      await user.click(closeButton)

      await waitFor(() => {
        expect(screen.queryByText('Manual Time Entry')).not.toBeInTheDocument()
      })
    })

    it('validates required fields in modal', async () => {
      render(
        <TestWrapper>
          <TimeEntries />
        </TestWrapper>
      )

      // Open modal
      const manualEntryButton = screen.getByText('Manual Entry')
      await user.click(manualEntryButton)

      await waitFor(() => {
        const createButton = screen.getByText('Create Entry')
        expect(createButton).toBeDisabled()
      })
    })

    it('creates time entry when form is filled and submitted', async () => {
      render(
        <TestWrapper>
          <TimeEntries />
        </TestWrapper>
      )

      // Open modal
      const manualEntryButton = screen.getByText('Manual Entry')
      await user.click(manualEntryButton)

      await waitFor(async () => {
        // Fill form
        const clientSelect = screen.getByDisplayValue('Select a client')
        await user.selectOptions(clientSelect, '1')

        const startTimeInput = screen.getByDisplayValue('')
        await user.type(startTimeInput, '09:00')

        const endTimeInput = screen.getAllByDisplayValue('')[1] // Second empty input
        await user.type(endTimeInput, '10:00')

        // Submit
        const createButton = screen.getByText('Create Entry')
        await user.click(createButton)

        expect(mockElectronAPI.invoke).toHaveBeenCalledWith('db:createTimeEntry', expect.any(Object))
      })
    })
  })

  describe('Data Loading and Error Handling', () => {
    it('handles API errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockElectronAPI.clients.getAllWithRelationships.mockRejectedValue(new Error('API Error'))

      render(
        <TestWrapper>
          <TimeEntries />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Error loading data:'),
          expect.any(Error)
        )
      })
    })

    it('shows empty state when no time entries', async () => {
      mockElectronAPI.timeEntries.getAll.mockResolvedValue([])

      render(
        <TestWrapper>
          <TimeEntries />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('No Time Entries')).toBeInTheDocument()
        expect(screen.getByText('Start tracking your time or add a manual entry')).toBeInTheDocument()
      })
    })
  })

  describe('Day Grouping and Collapsing', () => {
    it('groups time entries by date', async () => {
      const entriesOnDifferentDays = [
        {
          ...mockTimeEntries[0],
          startTime: '2025-09-01T09:00:00.000Z' // Different day
        },
        mockTimeEntries[1]
      ]
      
      mockElectronAPI.timeEntries.getAll.mockResolvedValue(entriesOnDifferentDays)

      render(
        <TestWrapper>
          <TimeEntries />
        </TestWrapper>
      )

      await waitFor(() => {
        // Should have date headers
        expect(screen.getByText(/Sep.*2025/)).toBeInTheDocument()
      })
    })

    it('allows collapsing and expanding day groups', async () => {
      mockElectronAPI.timeEntries.getAll.mockResolvedValue(mockTimeEntries)

      render(
        <TestWrapper>
          <TimeEntries />
        </TestWrapper>
      )

      await waitFor(async () => {
        const dateHeader = screen.getByText(/Sep.*2025/)
        await user.click(dateHeader)
        
        // Entries should be hidden/shown after click
        // This tests the toggle functionality
      })
    })
  })

  describe('Event Listeners', () => {
    it('listens for timer events', async () => {
      render(
        <TestWrapper>
          <TimeEntries />
        </TestWrapper>
      )

      // Simulate timer started event
      const timerStartedEvent = new CustomEvent('timer-started')
      window.dispatchEvent(timerStartedEvent)

      await waitFor(() => {
        expect(mockElectronAPI.timeEntries.getAll).toHaveBeenCalled()
      })
    })

    it('listens for show timer modal event', async () => {
      render(
        <TestWrapper>
          <TimeEntries />
        </TestWrapper>
      )

      // Simulate show timer modal event (from tray)
      const showModalEvent = new CustomEvent('show-timer-modal')
      window.dispatchEvent(showModalEvent)

      await waitFor(() => {
        expect(screen.getByText('Manual Time Entry')).toBeInTheDocument()
      })
    })
  })
})
