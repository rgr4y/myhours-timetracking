import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('CustomEvent System Tests', () => {
  let eventListeners
  let originalAddEventListener
  let originalRemoveEventListener
  let originalDispatchEvent

  beforeEach(() => {
    // Store original methods
    originalAddEventListener = window.addEventListener
    originalRemoveEventListener = window.removeEventListener
    originalDispatchEvent = window.dispatchEvent

    // Track event listeners
    eventListeners = new Map()

    // Mock window event methods
    window.addEventListener = vi.fn((event, handler) => {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, [])
      }
      eventListeners.get(event).push(handler)
    })

    window.removeEventListener = vi.fn((event, handler) => {
      if (eventListeners.has(event)) {
        const handlers = eventListeners.get(event)
        const index = handlers.indexOf(handler)
        if (index > -1) {
          handlers.splice(index, 1)
        }
      }
    })

    window.dispatchEvent = vi.fn((event) => {
      const eventType = event.type
      if (eventListeners.has(eventType)) {
        eventListeners.get(eventType).forEach(handler => {
          try {
            handler(event)
          } catch (error) {
            console.error('Error in event handler:', error)
          }
        })
      }
      return true
    })

    // Mock CustomEvent constructor
    global.CustomEvent = vi.fn((type, options) => ({
      type,
      detail: options?.detail,
      bubbles: options?.bubbles || false,
      cancelable: options?.cancelable || false
    }))
  })

  afterEach(() => {
    // Restore original methods
    window.addEventListener = originalAddEventListener
    window.removeEventListener = originalRemoveEventListener
    window.dispatchEvent = originalDispatchEvent
    
    // Clear mocks
    vi.clearAllMocks()
    eventListeners.clear()
  })

  describe('Event Registration and Cleanup', () => {
    it('should register event listeners correctly', () => {
      const handler = vi.fn()
      
      window.addEventListener('show-timer-modal', handler)
      window.addEventListener('refresh-time-entries', handler)
      window.addEventListener('timer-started', handler)
      window.addEventListener('timer-stopped', handler)

      expect(window.addEventListener).toHaveBeenCalledTimes(4)
      expect(window.addEventListener).toHaveBeenCalledWith('show-timer-modal', handler)
      expect(window.addEventListener).toHaveBeenCalledWith('refresh-time-entries', handler)
      expect(window.addEventListener).toHaveBeenCalledWith('timer-started', handler)
      expect(window.addEventListener).toHaveBeenCalledWith('timer-stopped', handler)
    })

    it('should remove event listeners correctly', () => {
      const handler = vi.fn()
      
      window.addEventListener('show-timer-modal', handler)
      window.removeEventListener('show-timer-modal', handler)

      expect(window.removeEventListener).toHaveBeenCalledWith('show-timer-modal', handler)
    })

    it('should handle multiple listeners for the same event', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      
      window.addEventListener('timer-started', handler1)
      window.addEventListener('timer-started', handler2)

      const event = new CustomEvent('timer-started')
      window.dispatchEvent(event)

      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
    })
  })

  describe('Event Dispatching', () => {
    it('should create and dispatch CustomEvent correctly', () => {
      const handler = vi.fn()
      window.addEventListener('show-timer-modal', handler)

      const event = new CustomEvent('show-timer-modal')
      window.dispatchEvent(event)

      expect(global.CustomEvent).toHaveBeenCalledWith('show-timer-modal')
      expect(window.dispatchEvent).toHaveBeenCalledWith(event)
      expect(handler).toHaveBeenCalledWith(event)
    })

    it('should dispatch refresh-time-entries event', () => {
      const handler = vi.fn()
      window.addEventListener('refresh-time-entries', handler)

      const event = new CustomEvent('refresh-time-entries')
      window.dispatchEvent(event)

      expect(handler).toHaveBeenCalledWith(event)
    })

    it('should dispatch timer-started event', () => {
      const handler = vi.fn()
      window.addEventListener('timer-started', handler)

      const event = new CustomEvent('timer-started')
      window.dispatchEvent(event)

      expect(handler).toHaveBeenCalledWith(event)
    })

    it('should dispatch timer-stopped event', () => {
      const handler = vi.fn()
      window.addEventListener('timer-stopped', handler)

      const event = new CustomEvent('timer-stopped')
      window.dispatchEvent(event)

      expect(handler).toHaveBeenCalledWith(event)
    })

    it('should dispatch time-entries-updated event', () => {
      const handler = vi.fn()
      window.addEventListener('time-entries-updated', handler)

      const event = new CustomEvent('time-entries-updated')
      window.dispatchEvent(event)

      expect(handler).toHaveBeenCalledWith(event)
    })
  })

  describe('Event Handler Behavior', () => {
    it('should handle events even if some handlers throw errors', () => {
      const workingHandler = vi.fn()
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error')
      })
      
      window.addEventListener('timer-started', errorHandler)
      window.addEventListener('timer-started', workingHandler)

      const event = new CustomEvent('timer-started')
      window.dispatchEvent(event)

      expect(errorHandler).toHaveBeenCalledTimes(1)
      expect(workingHandler).toHaveBeenCalledTimes(1)
    })

    it('should not call handlers for unregistered events', () => {
      const handler = vi.fn()
      window.addEventListener('timer-started', handler)

      const event = new CustomEvent('timer-stopped')
      window.dispatchEvent(event)

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('Event System Integration', () => {
    it('should simulate tray interaction flow', () => {
      const showModalHandler = vi.fn()
      const refreshEntriesHandler = vi.fn()
      
      window.addEventListener('show-timer-modal', showModalHandler)
      window.addEventListener('refresh-time-entries', refreshEntriesHandler)

      // Simulate tray requesting timer modal
      const showModalEvent = new CustomEvent('show-timer-modal')
      window.dispatchEvent(showModalEvent)

      // Simulate refresh after timer operation
      const refreshEvent = new CustomEvent('refresh-time-entries')
      window.dispatchEvent(refreshEvent)

      expect(showModalHandler).toHaveBeenCalledWith(showModalEvent)
      expect(refreshEntriesHandler).toHaveBeenCalledWith(refreshEvent)
    })

    it('should simulate timer lifecycle events', () => {
      const startHandler = vi.fn()
      const stopHandler = vi.fn()
      const updateHandler = vi.fn()
      
      window.addEventListener('timer-started', startHandler)
      window.addEventListener('timer-stopped', stopHandler)
      window.addEventListener('time-entries-updated', updateHandler)

      // Simulate starting timer
      const startEvent = new CustomEvent('timer-started')
      window.dispatchEvent(startEvent)

      // Simulate stopping timer
      const stopEvent = new CustomEvent('timer-stopped')
      window.dispatchEvent(stopEvent)

      // Simulate updating entries
      const updateEvent = new CustomEvent('time-entries-updated')
      window.dispatchEvent(updateEvent)

      expect(startHandler).toHaveBeenCalledWith(startEvent)
      expect(stopHandler).toHaveBeenCalledWith(stopEvent)
      expect(updateHandler).toHaveBeenCalledWith(updateEvent)
    })
  })

  describe('Event Detail Handling', () => {
    it('should handle events with detail data', () => {
      const handler = vi.fn()
      window.addEventListener('custom-event', handler)

      const eventDetail = { data: 'test', value: 123 }
      const event = new CustomEvent('custom-event', { detail: eventDetail })
      window.dispatchEvent(event)

      expect(global.CustomEvent).toHaveBeenCalledWith('custom-event', { detail: eventDetail })
      expect(handler).toHaveBeenCalledWith(event)
      expect(handler.mock.calls[0][0].detail).toEqual(eventDetail)
    })

    it('should handle events with bubbles and cancelable options', () => {
      const event = new CustomEvent('custom-event', { 
        bubbles: true, 
        cancelable: true,
        detail: { test: true }
      })

      expect(global.CustomEvent).toHaveBeenCalledWith('custom-event', { 
        bubbles: true, 
        cancelable: true,
        detail: { test: true }
      })
      expect(event.bubbles).toBe(true)
      expect(event.cancelable).toBe(true)
      expect(event.detail).toEqual({ test: true })
    })
  })

  describe('Memory Management', () => {
    it('should clean up event listeners to prevent memory leaks', () => {
      const handlers = []
      
      // Register multiple handlers
      for (let i = 0; i < 5; i++) {
        const handler = vi.fn()
        handlers.push(handler)
        window.addEventListener('timer-started', handler)
      }

      // Verify they're all registered
      expect(eventListeners.get('timer-started')).toHaveLength(5)

      // Remove all handlers
      handlers.forEach(handler => {
        window.removeEventListener('timer-started', handler)
      })

      // Verify they're all removed
      expect(eventListeners.get('timer-started')).toHaveLength(0)
    })

    it('should handle removal of non-existent handlers gracefully', () => {
      const handler = vi.fn()
      
      // Try to remove a handler that was never added
      expect(() => {
        window.removeEventListener('timer-started', handler)
      }).not.toThrow()

      // Add handler and remove it twice
      window.addEventListener('timer-started', handler)
      window.removeEventListener('timer-started', handler)
      window.removeEventListener('timer-started', handler)

      expect(eventListeners.get('timer-started')).toHaveLength(0)
    })
  })
})