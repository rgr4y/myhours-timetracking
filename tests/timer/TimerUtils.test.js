import { describe, it, expect, vi, beforeEach } from 'vitest'

// Timer utility functions tests
describe('Timer Utility Functions', () => {
  describe('Time Formatting', () => {
    const formatTime = (seconds) => {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = seconds % 60
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    it('should format zero time correctly', () => {
      expect(formatTime(0)).toBe('00:00:00')
    })

    it('should format seconds correctly', () => {
      expect(formatTime(1)).toBe('00:00:01')
      expect(formatTime(30)).toBe('00:00:30')
      expect(formatTime(59)).toBe('00:00:59')
    })

    it('should format minutes correctly', () => {
      expect(formatTime(60)).toBe('00:01:00')
      expect(formatTime(90)).toBe('00:01:30')
      expect(formatTime(3599)).toBe('00:59:59')
    })

    it('should format hours correctly', () => {
      expect(formatTime(3600)).toBe('01:00:00')
      expect(formatTime(3661)).toBe('01:01:01')
      expect(formatTime(7323)).toBe('02:02:03')
    })

    it('should handle large values', () => {
      expect(formatTime(359999)).toBe('99:59:59')
      expect(formatTime(360000)).toBe('100:00:00')
    })

    it('should handle edge cases', () => {
      expect(formatTime(86399)).toBe('23:59:59') // Almost 24 hours
      expect(formatTime(86400)).toBe('24:00:00') // Exactly 24 hours
    })
  })

  describe('Elapsed Time Calculation', () => {
    const calculateElapsedTime = (startTime, currentTime = new Date()) => {
      if (!startTime) {
        return 0
      }
      const start = new Date(startTime)
      if (isNaN(start.getTime())) {
        return 0
      }
      return Math.floor((currentTime.getTime() - start.getTime()) / 1000)
    }

    it('should calculate elapsed time correctly', () => {
      const start = new Date('2023-01-01T10:00:00Z')
      const current = new Date('2023-01-01T10:05:30Z')
      
      expect(calculateElapsedTime(start, current)).toBe(330) // 5 minutes 30 seconds
    })

    it('should handle same start and current time', () => {
      const time = new Date('2023-01-01T10:00:00Z')
      
      expect(calculateElapsedTime(time, time)).toBe(0)
    })

    it('should handle future start time', () => {
      const start = new Date('2023-01-01T11:00:00Z')
      const current = new Date('2023-01-01T10:00:00Z')
      
      expect(calculateElapsedTime(start, current)).toBe(-3600) // -1 hour
    })

    it('should handle invalid start time', () => {
      expect(calculateElapsedTime('invalid-date')).toBe(0)
      expect(calculateElapsedTime(null)).toBe(0)
      expect(calculateElapsedTime(undefined)).toBe(0)
    })

    it('should handle different time formats', () => {
      const current = new Date('2023-01-01T10:05:00Z')
      
      expect(calculateElapsedTime('2023-01-01T10:00:00Z', current)).toBe(300)
      expect(calculateElapsedTime('2023-01-01T10:00:00.000Z', current)).toBe(300)
      expect(calculateElapsedTime(new Date('2023-01-01T10:00:00Z'), current)).toBe(300)
    })
  })

  describe('Timer Rounding', () => {
    const roundTime = (seconds, roundToMinutes = 15) => {
      const roundToSeconds = roundToMinutes * 60
      return Math.ceil(seconds / roundToSeconds) * roundToSeconds
    }

    it('should round to 15 minutes by default', () => {
      expect(roundTime(0)).toBe(0)
      expect(roundTime(1)).toBe(900) // 15 minutes
      expect(roundTime(899)).toBe(900) // 15 minutes
      expect(roundTime(900)).toBe(900) // 15 minutes
      expect(roundTime(901)).toBe(1800) // 30 minutes
    })

    it('should round to custom intervals', () => {
      expect(roundTime(0, 30)).toBe(0)
      expect(roundTime(1, 30)).toBe(1800) // 30 minutes
      expect(roundTime(1800, 30)).toBe(1800) // 30 minutes
      expect(roundTime(1801, 30)).toBe(3600) // 60 minutes
    })

    it('should handle 60-minute rounding', () => {
      expect(roundTime(0, 60)).toBe(0)
      expect(roundTime(1, 60)).toBe(3600) // 60 minutes
      expect(roundTime(3600, 60)).toBe(3600) // 60 minutes
      expect(roundTime(3601, 60)).toBe(7200) // 120 minutes
    })

    it('should handle edge cases', () => {
      expect(roundTime(0, 1)).toBe(0)
      expect(roundTime(1, 1)).toBe(60) // 1 minute
      expect(roundTime(59, 1)).toBe(60) // 1 minute
      expect(roundTime(60, 1)).toBe(60) // 1 minute
    })
  })

  describe('Timer Validation', () => {
    const validateTimerData = (timerData) => {
      if (!timerData || typeof timerData !== 'object') {
        return { isValid: false, errors: ['Timer data is required'] }
      }

      const errors = []
      
      if (!timerData.id || typeof timerData.id !== 'number') {
        errors.push('Timer ID is required and must be a number')
      }

      if (timerData.description !== undefined && typeof timerData.description !== 'string') {
        errors.push('Description must be a string')
      }

      if (!timerData.startTime) {
        errors.push('Start time is required')
      } else {
        const startDate = new Date(timerData.startTime)
        if (isNaN(startDate.getTime())) {
          errors.push('Start time must be a valid date')
        }
      }

      if (timerData.isActive !== undefined && typeof timerData.isActive !== 'boolean') {
        errors.push('isActive must be a boolean')
      }

      return { isValid: errors.length === 0, errors }
    }

    it('should validate correct timer data', () => {
      const validTimer = {
        id: 1,
        description: 'Test task',
        startTime: '2023-01-01T10:00:00Z',
        isActive: true
      }

      const result = validateTimerData(validTimer)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject null or undefined timer data', () => {
      expect(validateTimerData(null).isValid).toBe(false)
      expect(validateTimerData(undefined).isValid).toBe(false)
      expect(validateTimerData('string').isValid).toBe(false)
    })

    it('should require timer ID', () => {
      const invalidTimer = {
        description: 'Test task',
        startTime: '2023-01-01T10:00:00Z'
      }

      const result = validateTimerData(invalidTimer)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Timer ID is required and must be a number')
    })

    it('should validate start time', () => {
      const invalidTimer = {
        id: 1,
        startTime: 'invalid-date'
      }

      const result = validateTimerData(invalidTimer)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Start time must be a valid date')
    })

    it('should validate description type', () => {
      const invalidTimer = {
        id: 1,
        description: 123,
        startTime: '2023-01-01T10:00:00Z'
      }

      const result = validateTimerData(invalidTimer)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Description must be a string')
    })

    it('should validate isActive type', () => {
      const invalidTimer = {
        id: 1,
        startTime: '2023-01-01T10:00:00Z',
        isActive: 'true'
      }

      const result = validateTimerData(invalidTimer)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('isActive must be a boolean')
    })

    it('should allow optional fields', () => {
      const minimalTimer = {
        id: 1,
        startTime: '2023-01-01T10:00:00Z'
      }

      const result = validateTimerData(minimalTimer)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Window Event Handling', () => {
    const createEventHandler = () => {
      const handlers = new Map()
      
      return {
        addEventListener: vi.fn((event, handler) => {
          if (!handlers.has(event)) {
            handlers.set(event, [])
          }
          handlers.get(event).push(handler)
        }),
        removeEventListener: vi.fn((event, handler) => {
          if (handlers.has(event)) {
            const eventHandlers = handlers.get(event)
            const index = eventHandlers.indexOf(handler)
            if (index > -1) {
              eventHandlers.splice(index, 1)
            }
          }
        }),
        dispatchEvent: vi.fn((event) => {
          const eventType = event.type || event
          if (handlers.has(eventType)) {
            handlers.get(eventType).forEach(handler => handler(event))
          }
        }),
        getHandlers: () => handlers
      }
    }

    it('should add event listeners correctly', () => {
      const eventManager = createEventHandler()
      const handler = vi.fn()
      
      eventManager.addEventListener('focus', handler)
      
      expect(eventManager.addEventListener).toHaveBeenCalledWith('focus', handler)
      expect(eventManager.getHandlers().get('focus')).toContain(handler)
    })

    it('should remove event listeners correctly', () => {
      const eventManager = createEventHandler()
      const handler = vi.fn()
      
      eventManager.addEventListener('focus', handler)
      eventManager.removeEventListener('focus', handler)
      
      expect(eventManager.removeEventListener).toHaveBeenCalledWith('focus', handler)
      expect(eventManager.getHandlers().get('focus')).not.toContain(handler)
    })

    it('should dispatch events correctly', () => {
      const eventManager = createEventHandler()
      const handler = vi.fn()
      
      eventManager.addEventListener('focus', handler)
      eventManager.dispatchEvent({ type: 'focus' })
      
      expect(handler).toHaveBeenCalledWith({ type: 'focus' })
    })

    it('should handle multiple event listeners', () => {
      const eventManager = createEventHandler()
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      
      eventManager.addEventListener('focus', handler1)
      eventManager.addEventListener('focus', handler2)
      eventManager.dispatchEvent({ type: 'focus' })
      
      expect(handler1).toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })

    it('should not crash when removing non-existent handler', () => {
      const eventManager = createEventHandler()
      const handler = vi.fn()
      
      expect(() => {
        eventManager.removeEventListener('focus', handler)
      }).not.toThrow()
    })
  })

  describe('Performance Utilities', () => {
    const debounce = (func, delay) => {
      let timeoutId
      return (...args) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => func.apply(null, args), delay)
        return timeoutId
      }
    }

    const throttle = (func, limit) => {
      let inThrottle
      return (...args) => {
        if (!inThrottle) {
          func.apply(null, args)
          inThrottle = true
          setTimeout(() => inThrottle = false, limit)
        }
      }
    }

    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should debounce function calls', () => {
      const mockFn = vi.fn()
      const debouncedFn = debounce(mockFn, 100)
      
      debouncedFn('call1')
      debouncedFn('call2')
      debouncedFn('call3')
      
      expect(mockFn).not.toHaveBeenCalled()
      
      vi.advanceTimersByTime(100)
      
      expect(mockFn).toHaveBeenCalledOnce()
      expect(mockFn).toHaveBeenCalledWith('call3')
    })

    it('should throttle function calls', () => {
      const mockFn = vi.fn()
      const throttledFn = throttle(mockFn, 100)
      
      throttledFn('call1')
      throttledFn('call2')
      throttledFn('call3')
      
      expect(mockFn).toHaveBeenCalledOnce()
      expect(mockFn).toHaveBeenCalledWith('call1')
      
      vi.advanceTimersByTime(100)
      
      throttledFn('call4')
      expect(mockFn).toHaveBeenCalledTimes(2)
      expect(mockFn).toHaveBeenCalledWith('call4')
    })
  })
})