// src/lib/research/sources/consensus.ts
// Consensus search client for Hannah's research pass (Prompt 208).
// FLAG-GATED: returns [] immediately when CONSENSUS_API_KEY is absent.
// No error logged for the absent-key case - it is expected until Gary supplies the key.
// Fail-open on all errors: returns [] and logs via safeLog.

import { withAbortTimeout } from '@/lib/utils/with-timeout'
import { safeLog } from '@/lib/utils/safe-log'
import type { RawSource } from './types'

const API_BASE = 'https://api.consensus.app/v1/search'
const SCOPE = 'research.consensus'
const TIMEOUT_MS = 5000

interface ConsensusResult {
  id?: string
  title?: string
  url?: string
  snippet?: string
}

export async function searchConsensus(query: string): Promise<RawSource[]> {
  if (!process.env.CONSENSUS_API_KEY) return []

  try {
    const url = `${API_BASE}?query=${encodeURIComponent(query)}`

    let json: unknown
    try {
      const res = await withAbortTimeout(
        (signal) =>
          fetch(url, {
            signal,
            headers: {
              Authorization: `Bearer ${process.env.CONSENSUS_API_KEY}`,
            },
          }),
        TIMEOUT_MS,
        SCOPE,
      )
      if (!res.ok) {
        safeLog.error(SCOPE, 'non-ok response', { status: res.status, query })
        return []
      }
      json = await res.json()
    } catch (err) {
      safeLog.error(SCOPE, 'request failed', {
        error: err instanceof Error ? err.message : String(err),
        query,
      })
      return []
    }

    const results: ConsensusResult[] =
      (json as { results?: ConsensusResult[] })?.results ?? []

    const sources: RawSource[] = []
    for (const item of results) {
      const identifier = item?.id
      const title = item?.title
      const url = item?.url
      if (!identifier || !title || !url) continue
      const source: RawSource = {
        title,
        url,
        sourceAuthority: 'consensus',
        identifier,
      }
      if (item.snippet) source.snippet = item.snippet
      sources.push(source)
    }
    return sources
  } catch (err) {
    safeLog.error(SCOPE, 'unexpected error in searchConsensus', {
      error: err instanceof Error ? err.message : String(err),
      query,
    })
    return []
  }
}
