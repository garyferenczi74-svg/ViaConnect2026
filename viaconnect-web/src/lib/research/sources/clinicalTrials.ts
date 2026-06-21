// src/lib/research/sources/clinicalTrials.ts
// ClinicalTrials.gov API v2 client for Hannah's research pass (Prompt 208).
// Free public REST, no API key required.
// Fail-open: any error returns [] and logs via safeLog.

import { withAbortTimeout } from '@/lib/utils/with-timeout'
import { safeLog } from '@/lib/utils/safe-log'
import type { RawSource } from './types'

const API_BASE = 'https://clinicaltrials.gov/api/v2/studies'
const SCOPE = 'research.clinicaltrials'
const TIMEOUT_MS = 5000

interface CtStudy {
  protocolSection?: {
    identificationModule?: {
      nctId?: string
      briefTitle?: string
    }
  }
}

export async function searchClinicalTrials(
  query: string,
  opts?: { pageSize?: number },
): Promise<RawSource[]> {
  try {
    const pageSize = opts?.pageSize ?? 10
    const url = `${API_BASE}?query.term=${encodeURIComponent(query)}&pageSize=${pageSize}`

    let json: unknown
    try {
      const res = await withAbortTimeout(
        (signal) => fetch(url, { signal }),
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

    const studies: CtStudy[] =
      (json as { studies?: CtStudy[] })?.studies ?? []

    const sources: RawSource[] = []
    for (const study of studies) {
      const idMod = study.protocolSection?.identificationModule
      const nctId = idMod?.nctId
      if (!nctId) continue
      const title = idMod?.briefTitle ?? ''
      sources.push({
        title,
        url: `https://clinicaltrials.gov/study/${nctId}`,
        sourceAuthority: 'clinicaltrials',
        identifier: nctId,
      })
    }
    return sources
  } catch (err) {
    safeLog.error(SCOPE, 'unexpected error in searchClinicalTrials', {
      error: err instanceof Error ? err.message : String(err),
      query,
    })
    return []
  }
}
