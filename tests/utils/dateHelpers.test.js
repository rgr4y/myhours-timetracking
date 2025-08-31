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
