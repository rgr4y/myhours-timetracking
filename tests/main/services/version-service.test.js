import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('electron', () => {
  return {
    app: {
      isPackaged: false,
      getVersion: vi.fn(() => '0.0.0')
    }
  }
})

vi.mock('fs', async (orig) => {
  const actual = await orig()
  return {
    ...actual,
    readFileSync: vi.fn(() => JSON.stringify({ version: '1.2.3' }))
  }
})

vi.mock('child_process', async (orig) => {
  const actual = await orig()
  return {
    ...actual,
    execSync: vi.fn((cmd) => {
      if (cmd.startsWith('git rev-parse')) return 'abcdef\n'
      if (cmd.startsWith('git describe')) return 'v1.2.0\n'
      if (cmd.startsWith('git rev-list')) return 'abcdef1234567890\n'
      return ''
    })
  }
})

import VersionService from '@main/services/version-service'

describe.skip('VersionService', () => {
  let vs
  beforeEach(() => {
    vs = new VersionService()
  })

  it('getBaseVersion reads package.json in dev', () => {
    const v = vs.getBaseVersion()
    expect(v).toBe('1.2.3')
  })

  it('getDisplayVersion uses git tag and hash in dev', () => {
    const v = vs.getDisplayVersion()
    // latest tag is v1.2.0 and current hash is abcdef (short), expect tag + hash
    expect(v).toMatch(/^v1\.2\.0-abcdef$/)
  })
})
