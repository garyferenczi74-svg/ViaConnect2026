/**
 * Pure field helpers for peptide_education_entries.
 * Browse/detail bind only to the Thanos 35 entry_keys. No invented rows.
 * Semaglutide keys/titles and BPC Arginate seeds are dropped, not catalogued.
 */

export interface EducationEntry {
  entryKey: string;
  title: string;
  isPeptide: boolean;
  mechanism: string | null;
  evidenceGrade: string;
  regulatoryStatus: string | null;
  safetyContext: string | null;
  provenanceText: string | null;
  pmids: string[];
}

/** Thanos consumer education keys. Do not add extras. */
export const THANOS_CONSUMER_ENTRY_KEYS = [
  'edu-aod-9604',
  'edu-bpc157',
  'edu-bronchogen-aedl',
  'edu-cdk5-inhibitory-peptides',
  'edu-cerebrolysin',
  'edu-cjc1295-no-dac',
  'edu-dihexa',
  'edu-epitalon',
  'edu-fr-alpha-binding',
  'edu-generative-ai-peptide-design',
  'edu-ghk-cu',
  'edu-ipamorelin',
  'edu-kpv',
  'edu-melanotan-2',
  'edu-mots-c',
  'edu-peptide-drug-conjugates',
  'edu-peptideiq-topic-map',
  'edu-pinealon',
  'edu-pt141-bremelanotide',
  'edu-retatrutide',
  'edu-selank',
  'edu-semax',
  'edu-sermorelin',
  'edu-ss31',
  'edu-tb500-thymosin-beta4',
  'edu-tesamorelin',
  'edu-tesofensine-pause',
  'edu-therapeutic-peptide-chem-strategies',
  'edu-thymosin-alpha1',
  'edu-uacd-acps',
  'edu-vilon-ke',
  'edu-5-amino-1mq-nonpeptide',
  'edu-slu-pp-332-nonpeptide',
  'depth-bpc157-framework',
  'depth-ss31-framework',
] as const;

export type ThanosConsumerEntryKey = (typeof THANOS_CONSUMER_ENTRY_KEYS)[number];

const THANOS_CONSUMER_ENTRY_KEY_SET: ReadonlySet<string> = new Set(
  THANOS_CONSUMER_ENTRY_KEYS,
);

const NONPEPTIDE_ENTRY_KEYS: ReadonlySet<string> = new Set([
  'edu-5-amino-1mq-nonpeptide',
  'edu-slu-pp-332-nonpeptide',
]);

const EXCLUDED_COMPOUND = /semaglutide/i;
const ARGINATE_SEED = /arginate/i;

export function isSafeEntryKey(key: string): boolean {
  return /^[a-z0-9][a-z0-9_-]{0,80}$/i.test(key);
}

export function isThanosAllowlistedEntryKey(key: string): boolean {
  return THANOS_CONSUMER_ENTRY_KEY_SET.has(key);
}

export function isAllowlistedNonPeptide(key: string): boolean {
  return NONPEPTIDE_ENTRY_KEYS.has(key);
}

export function dropsEducationCompound(entryKey: string, title?: string): boolean {
  if (EXCLUDED_COMPOUND.test(entryKey) || ARGINATE_SEED.test(entryKey)) return true;
  if (!title) return false;
  return EXCLUDED_COMPOUND.test(title) || ARGINATE_SEED.test(title);
}

function asTrimmed(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function collectPmids(value: unknown, into: Set<string>): void {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    into.add(String(value));
    return;
  }
  if (typeof value !== 'string') {
    if (Array.isArray(value)) {
      for (const item of value) collectPmids(item, into);
      return;
    }
    if (value && typeof value === 'object') {
      const row = value as Record<string, unknown>;
      if ('pmid' in row) collectPmids(row.pmid, into);
      for (const nested of Object.values(row)) collectPmids(nested, into);
    }
    return;
  }
  const pubmed = value.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i);
  if (pubmed?.[1]) into.add(pubmed[1]);
  const labeled = value.match(/\bPMID[:\s]+(\d+)/i);
  if (labeled?.[1]) into.add(labeled[1]);
  if (/^\d{5,9}$/.test(value.trim())) into.add(value.trim());
}

export function extractPmids(provenance: unknown, sourceUrl: string | null): string[] {
  const found = new Set<string>();
  collectPmids(provenance, found);
  collectPmids(sourceUrl, found);
  return [...found];
}

export function formatProvenance(raw: unknown): string | null {
  if (typeof raw === 'string') return asTrimmed(raw);
  const rows = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object'
      ? [raw]
      : null;
  if (!rows) return null;
  const bits: string[] = [];
  for (const item of rows) {
    if (typeof item === 'string') {
      const trimmed = asTrimmed(item);
      if (trimmed) bits.push(trimmed);
      continue;
    }
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const parts = [row.source, row.source_url, row.note, row.agent, row.pmid]
      .map((part) => asTrimmed(part))
      .filter((part): part is string => Boolean(part));
    if (parts.length > 0) bits.push(parts.join(' · '));
  }
  return bits.length > 0 ? bits.join('; ') : null;
}

export function mapEducationRow(row: Record<string, unknown>): EducationEntry | null {
  const entryKey = String(row.entry_key ?? '');
  const title = String(row.title ?? '').trim();
  if (!isSafeEntryKey(entryKey) || !title) return null;
  if (!isThanosAllowlistedEntryKey(entryKey)) return null;
  if (dropsEducationCompound(entryKey, title)) return null;
  return {
    entryKey,
    title,
    isPeptide: !isAllowlistedNonPeptide(entryKey),
    mechanism: asTrimmed(row.mechanism),
    evidenceGrade: String(row.evidence_grade ?? 'unknown'),
    regulatoryStatus: asTrimmed(row.regulatory_status),
    safetyContext: asTrimmed(row.safety_context),
    provenanceText: formatProvenance(row.provenance),
    pmids: extractPmids(row.provenance, asTrimmed(row.source_url)),
  };
}
