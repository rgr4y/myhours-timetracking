import { describe, it, expect, vi, beforeEach } from 'vitest'
import { withElectronAPI } from '@renderer/hooks/useElectronAPI'
import { act } from '@testing-library/react'

describe('withElectronAPI', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Ensure no API by default
    // eslint-disable-next-line no-undef
    if (window.electronAPI) delete window.electronAPI
  })

  it('retries until electronAPI is available and calls wrapped fn', async () => {
    const wrapped = withElectronAPI(async (api, arg) => {
      return api.value + arg
    })

    setTimeout(() => {
      window.electronAPI = { value: 10 }
    }, 200)

    const p = wrapped(5)

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    await expect(p).resolves.toBe(15)
    vi.useRealTimers()
  })

  it.skip('throws if electronAPI never appears', async () => {})
})
