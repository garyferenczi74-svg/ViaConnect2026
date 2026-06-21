// src/lib/research/__tests__/heartbeat.test.ts
// TDD tests for heartbeat.ts (Prompt 208, Task 18b).
// All external dependencies are mocked; no live DB or network calls.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Module mocks - before imports so vi.mock hoisting applies.
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// Imports under test.
// ---------------------------------------------------------------------------
import { writeHeartbeat, readHeartbeats } from '../heartbeat'
import { createAdminClient } from '@/lib/supabase/admin'
import { safeLog } from '@/lib/utils/safe-log'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUpsertMock(error: { message: string } | null = null) {
  const chain = {
    upsert: vi.fn().mockResolvedValue({ error }),
  }
  return chain
}

function makeSelectMock(
  rows: Array<{ agent: string; status: string; detail: Record<string, unknown>; last_beat_at: string }> | null,
  error: { message: string } | null = null,
) {
  const chain = {
    select: vi.fn().mockResolvedValue({ data: rows, error }),
  }
  return chain
}

// ---------------------------------------------------------------------------
// Tests: writeHeartbeat
// ---------------------------------------------------------------------------

describe('writeHeartbeat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('upserts with the correct shape on ok status', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null })
    const fromMock = vi.fn().mockReturnValue({ upsert: upsertMock })
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromMock })

    await writeHeartbeat('hannah', 'ok', { domain: 'methylation', atomsCreated: 3 })

    expect(fromMock).toHaveBeenCalledWith('agent_heartbeats')
    expect(upsertMock).toHaveBeenCalledOnce()

    const upsertArg = upsertMock.mock.calls[0][0]
    expect(upsertArg).toMatchObject({
      agent: 'hannah',
      status: 'ok',
      detail: { domain: 'methylation', atomsCreated: 3 },
    })
    expect(typeof upsertArg.last_beat_at).toBe('string')
    expect(upsertArg.last_beat_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)

    const upsertOptions = upsertMock.mock.calls[0][1]
    expect(upsertOptions).toMatchObject({ onConflict: 'agent' })
  })

  it('uses empty object as default detail when not provided', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null })
    const fromMock = vi.fn().mockReturnValue({ upsert: upsertMock })
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromMock })

    await writeHeartbeat('hannah', 'degraded')

    const upsertArg = upsertMock.mock.calls[0][0]
    expect(upsertArg.detail).toEqual({})
  })

  it('fails open on DB error (does not throw) and calls safeLog.error', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: { message: 'DB down' } })
    const fromMock = vi.fn().mockReturnValue({ upsert: upsertMock })
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromMock })

    await expect(writeHeartbeat('hannah', 'error', { err: 'boom' })).resolves.toBeUndefined()
    expect(safeLog.error).toHaveBeenCalled()
  })

  it('fails open when createAdminClient throws (does not throw)', async () => {
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('env not configured')
    })

    await expect(writeHeartbeat('hannah', 'ok')).resolves.toBeUndefined()
    expect(safeLog.error).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Tests: readHeartbeats
// ---------------------------------------------------------------------------

describe('readHeartbeats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns rows from agent_heartbeats on success', async () => {
    const rows = [
      { agent: 'hannah', status: 'ok', detail: { domain: 'methylation' }, last_beat_at: '2026-06-21T00:00:00Z' },
    ]
    const selectMock = vi.fn().mockResolvedValue({ data: rows, error: null })
    const fromMock = vi.fn().mockReturnValue({ select: selectMock })
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromMock })

    const result = await readHeartbeats()

    expect(fromMock).toHaveBeenCalledWith('agent_heartbeats')
    expect(selectMock).toHaveBeenCalledWith('*')
    expect(result).toEqual(rows)
  })

  it('returns empty array on DB error and calls safeLog.error', async () => {
    const selectMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'select failed' } })
    const fromMock = vi.fn().mockReturnValue({ select: selectMock })
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromMock })

    const result = await readHeartbeats()

    expect(result).toEqual([])
    expect(safeLog.error).toHaveBeenCalled()
  })

  it('returns empty array when createAdminClient throws', async () => {
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('env not configured')
    })

    const result = await readHeartbeats()

    expect(result).toEqual([])
    expect(safeLog.error).toHaveBeenCalled()
  })
})
