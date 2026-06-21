// src/lib/research/sources/pubmed.ts
// PubMed E-utilities client for Hannah's autonomous research pass (Prompt 208).
// Two-step: esearch -> PMIDs, esummary -> titles. No API key required.
// Fail-open: any error returns [] and logs via safeLog.

import { withAbortTimeout } from '@/lib/utils/with-timeout'
import { safeLog } from '@/lib/utils/safe-log'
import type { RawSource } from './types'

const ESEARCH_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi'
const ESUMMARY_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi'
const SCOPE = 'research.pubmed'
const TIMEOUT_MS = 5000

export async function searchPubMed(
  query: string,
  opts?: { retmax?: number },
): Promise<RawSource[]> {
  try {
    const retmax = opts?.retmax ?? 10
    const esearchUrl = `${ESEARCH_BASE}?db=pubmed&retmode=json&retmax=${retmax}&term=${encodeURIComponent(query)}`

    let esearchJson: unknown
    try {
      const esearchRes = await withAbortTimeout(
        (signal) => fetch(esearchUrl, { signal }),
        TIMEOUT_MS,
        SCOPE,
      )
      if (!esearchRes.ok) {
        safeLog.error(SCOPE, 'esearch non-ok response', { status: esearchRes.status, query })
        return []
      }
      esearchJson = await esearchRes.json()
    } catch (err) {
      safeLog.error(SCOPE, 'esearch request failed', {
        error: err instanceof Error ? err.message : String(err),
        query,
      })
      return []
    }

    const idlist: string[] =
      (esearchJson as { esearchresult?: { idlist?: string[] } })?.esearchresult?.idlist ?? []

    if (idlist.length === 0) return []

    const esummaryUrl = `${ESUMMARY_BASE}?db=pubmed&retmode=json&id=${idlist.join(',')}`

    let esummaryJson: unknown
    try {
      const esummaryRes = await withAbortTimeout(
        (signal) => fetch(esummaryUrl, { signal }),
        TIMEOUT_MS,
        SCOPE,
      )
      if (!esummaryRes.ok) {
        safeLog.error(SCOPE, 'esummary non-ok response', { status: esummaryRes.status, query })
        return []
      }
      esummaryJson = await esummaryRes.json()
    } catch (err) {
      safeLog.error(SCOPE, 'esummary request failed', {
        error: err instanceof Error ? err.message : String(err),
        query,
      })
      return []
    }

    const result = (esummaryJson as { result?: Record<string, { title?: string }> })?.result ?? {}

    const sources: RawSource[] = []
    for (const pmid of idlist) {
      const entry = result[pmid]
      if (!entry) continue
      sources.push({
        title: entry.title ?? '',
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        sourceAuthority: 'pubmed',
        identifier: pmid,
      })
    }
    return sources
  } catch (err) {
    safeLog.error(SCOPE, 'unexpected error in searchPubMed', {
      error: err instanceof Error ? err.message : String(err),
      query,
    })
    return []
  }
}
