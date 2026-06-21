// src/lib/research/sources/types.ts
// Shared types for research source clients (Prompt 208, Phase 6).

export type SourceAuthority = 'pubmed' | 'clinicaltrials' | 'consensus'

export interface RawSource {
  title: string
  url: string
  sourceAuthority: SourceAuthority
  identifier: string
  snippet?: string
}
