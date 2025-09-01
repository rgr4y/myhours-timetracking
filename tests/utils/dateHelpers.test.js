import { describe, it, expect } from 'vitest'
import {
  formatDuration,
  formatDurationHumanFriendly,
  formatDate,
  formatTime,
  formatTimeForForm,
  formatDateForForm,
  parseTimeWithDate,
  calculateDuration,
} from '@renderer/utils/dateHelpers'

describe('dateHelpers', () => {
  it('formatDuration handles minutes and zero/invalid', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(undefined)).toBe('0:00')
    expect(formatDuration(5)).toBe('0:05')
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(600)).toBe('10:00')
  })

  it('formatDurationHumanFriendly works for hours/minutes/zero', () => {
    expect(formatDurationHumanFriendly(0)).toBe('0m')
    expect(formatDurationHumanFriendly(undefined)).toBe('0m')
    expect(formatDurationHumanFriendly(5)).toBe('5m')
    expect(formatDurationHumanFriendly(60)).toBe('1h')
    expect(formatDurationHumanFriendly(125)).toBe('2h 5m')
  })

  it('formatDate handles invalid and valid inputs', () => {
    expect(formatDate(undefined)).toBe('Invalid Date')
    expect(formatDate('not-a-date')).toBe('Invalid Date')
    expect(typeof formatDate('2024-01-02')).toBe('string')
  })

  it('formatTime handles invalid and valid inputs', () => {
    expect(formatTime(undefined)).toBe('Invalid Time')
    expect(formatTime('not-a-date')).toBe('Invalid Time')
    expect(typeof formatTime('2024-01-02T10:00:00Z')).toBe('string')
  })

  it('formatTimeForForm returns HH:MM or empty for invalid', () => {
    expect(formatTimeForForm(undefined)).toBe('')
    expect(formatTimeForForm('not-a-date')).toBe('')
    const out = formatTimeForForm('2024-01-02T10:05:00Z')
    expect(/\d{2}:\d{2}/.test(out)).toBe(true)
  })

  it('formatDateForForm returns YYYY-MM-DD or empty for invalid', () => {
    expect(formatDateForForm(undefined)).toBe('')
    expect(formatDateForForm('not-a-date')).toBe('')
    const out = formatDateForForm('2024-01-02T10:05:00Z')
    expect(/\d{4}-\d{2}-\d{2}/.test(out)).toBe(true)
  })

  // Tests that demonstrate the timezone bug in time entry edit modal
  describe('formatDateForForm timezone issues', () => {
    // Create a buggy version that uses UTC (like the original broken implementation)
    const formatDateForFormBuggy = (dateInput) => {
      if (!dateInput) return '';
      
      try {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return '';
        
        // BUGGY: Uses toISOString() which always returns UTC
        return date.toISOString().split('T')[0];
      } catch (error) {
        console.error('Error formatting date for form:', error);
        return '';
      }
    };

    it('should demonstrate the timezone bug with late evening Pacific time', () => {
      // Create a time that's Aug 31, 2025 11:00 PM PDT
      // This becomes Sep 1, 2025 06:00 AM UTC when stored
      const localDate = new Date(2025, 7, 31, 23, 0, 0) // Month is 0-indexed, so 7 = August
      
      // Test the buggy version (what was happening before)
      const buggyResult = formatDateForFormBuggy(localDate.getTime())
      const fixedResult = formatDateForForm(localDate.getTime())
      
      // The bug: shows next day due to UTC conversion
      expect(buggyResult).toBe('2025-09-01') // BUG: Shows Sep 1 instead of Aug 31
      
      // The fix: shows correct local date
      expect(fixedResult).toBe('2025-08-31') // FIXED: Shows Aug 31 as intended
      
      console.log(`Bug demonstrated - Buggy: ${buggyResult}, Fixed: ${fixedResult}`)
    })

    it('should demonstrate timezone issue with early morning time that crosses date boundary', () => {
      // Create a time that's Sep 1, 2025 1:00 AM PDT 
      // This becomes Sep 1, 2025 08:00 AM UTC when stored
      const localDate = new Date(2025, 8, 1, 1, 0, 0) // Month is 0-indexed, so 8 = September
      
      const buggyResult = formatDateForFormBuggy(localDate.getTime())
      const fixedResult = formatDateForForm(localDate.getTime())
      
      // In this case both should be the same since it doesn't cross date boundary
      expect(buggyResult).toBe('2025-09-01') 
      expect(fixedResult).toBe('2025-09-01')
    })

    it('should handle evening time where local and UTC dates differ', () => {
      // Test with a timestamp that would be stored as UTC in database
      // Simulate what happens when a time entry from Aug 31 11:45 PM PDT is edited
      const timestampUTC = new Date('2025-09-01T06:45:00.000Z').getTime() // This is Aug 31 11:45 PM PDT
      
      const buggyResult = formatDateForFormBuggy(timestampUTC)
      const fixedResult = formatDateForForm(timestampUTC)
      
      // The bug shows the UTC date (Sep 1)
      expect(buggyResult).toBe('2025-09-01')
      
      // The fix shows the local date (Aug 31) - this depends on system timezone
      // In PDT timezone, this should show Aug 31
      const expectedLocalDate = new Date(timestampUTC).toLocaleDateString('en-CA') // YYYY-MM-DD format
      expect(fixedResult).toBe(expectedLocalDate)
    })
  })

  it('parseTimeWithDate parses HH:MM with YYYY-MM-DD correctly', () => {
    const d = parseTimeWithDate('09:30', '2024-01-02')
    expect(d instanceof Date).toBe(true)
    expect(d?.getHours()).toBe(9)
    expect(d?.getMinutes()).toBe(30)
  })

  it('parseTimeWithDate handles invalid input', () => {
    expect(parseTimeWithDate(undefined, '2024-01-02')).toBeNull()
    expect(parseTimeWithDate('09:30', 'bad-date')).toBeNull()
  })

  it('calculateDuration computes minute diff and guards invalid', () => {
    expect(calculateDuration(undefined, undefined)).toBe(0)
    expect(calculateDuration('bad', 'bad')).toBe(0)
    expect(calculateDuration('2024-01-02T09:00:00Z', '2024-01-02T10:45:00Z')).toBe(105)
  })
})
