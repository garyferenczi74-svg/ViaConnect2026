// Prompt #122 P6: Manual-evidence loader for the packet orchestrator.
//
// Reads approved + signed-off + non-archived manual evidence whose
// validity window overlaps the packet period, downloads each object's
// bytes from the soc2-manual-evidence bucket, and maps the result into a
// list of ManualEvidenceFile[] for `generateSoc2Packet()`.
//
// "Approved" in this context means `signoff_at IS NOT NULL`. Evidence
// that Steve hasn't signed off yet is never bundled into a live packet.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Period } from '../types';
import type { ManualEvidenceFile } from '../assemble/orchestrator';
import { SOC2_CATEGORY_DIRS } from '../types';
import { MANUAL_EVIDENCE_BUCKET } from './upload';

export interface LoaderInput {
  supabase: SupabaseClient;
  period: Period;
}

interface Row {
  id: string;
  title: string;
  storage_key: string;
  content_type: string;
  controls: string[];
  valid_from: string | null;
  valid_until: string | null;
  signoff_at: string | null;
  archived: boolean;
  superseded_by: string | null;
}

/**
 * Load every active manual-evidence file that applies to the period.
 * Caller passes the result directly to `generateSoc2Packet({manualEvidence: ...})`.
 */
export async function loadActiveManualEvidence(input: LoaderInput): Promise<ManualEvidenceFile[]> {
  const { supabase, period } = input;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data, error } = await sb
    .from('soc2_manual_evidence')
    .select('id, title, storage_key, content_type, controls, valid_from, valid_until, signoff_at, archived, superseded_by')
    .eq('archived', false)
    .is('superseded_by', null)
    .not('signoff_at', 'is', null);
  if (error) {
    throw new Error(`loadActiveManualEvidence: ${error.message}`);
  }

  const periodStart = new Date(period.start).getTime();
  const periodEnd = new Date(period.end).getTime();
  const rows = ((data ?? []) as Row[]).filter((r) => overlapsPeriod(r, periodStart, periodEnd));

  const files: ManualEvidenceFile[] = [];
  for (const r of rows) {
    const bytes = await downloadBytes(supabase, r.storage_key);
    if (!bytes) continue;
    const relativePath = buildManifestPath(r);
    const contentType = coerceContentType(r.content_type);
    files.push({
      relativePath,
      contentType,
      bytes,
      controls: r.controls,
      manualEvidenceId: r.id,
    });
  }

  return files;
}

function overlapsPeriod(row: Row, periodStartMs: number, periodEndMs: number): boolean {
  const vfMs = row.valid_from ? new Date(row.valid_from).getTime() : -Infinity;
  const vuMs = row.valid_until ? new Date(row.valid_until).getTime() : Infinity;
  return vfMs <= periodEndMs && vuMs >= periodStartMs;
}

async function downloadBytes(supabase: SupabaseClient, storageKey: string): Promise<Uint8Array | null> {
  const { data, error } = await supabase.storage
    .from(MANUAL_EVIDENCE_BUCKET)
    .download(storageKey);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('loadActiveManualEvidence: download failed', storageKey, error);
    return null;
  }
  if (!data) return null;
  const ab = await data.arrayBuffer();
  return new Uint8Array(ab);
}

/**
 * Turn a row into a ZIP-relative path. If a row's controls include multiple
 * categories, the first TSC-prefixed dir wins for filing purposes; all
 * controls still flow through to the manifest's controls array. When no
 * control maps cleanly to a TSC dir, the file lands under a manual-evidence/
 * top-level folder so it still appears in the packet without drifting the
 * TSC classifications.
 */
function buildManifestPath(row: Row): string {
  const dir = firstTscDir(row.controls);
  const slug = slugFromTitle(row.title);
  const ext = extFromContentType(row.content_type);
  return `${dir}/manual-evidence/${slug}-${row.id.slice(0, 8)}${ext}`;
}

function firstTscDir(controls: readonly string[]): string {
  for (const c of controls) {
    const prefix = c.split('.')[0];
    const mapped = (SOC2_CATEGORY_DIRS as Record<string, string>)[prefix];
    if (mapped) return mapped;
  }
  return 'MANUAL-supplementary-evidence';
}

function slugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'evidence';
}

function extFromContentType(ct: string): string {
  switch (ct) {
    case 'application/pdf': return '.pdf';
    case 'image/jpeg': return '.jpg';
    case 'image/png': return '.png';
    case 'image/webp': return '.webp';
    case 'text/csv': return '.csv';
    case 'text/plain': return '.txt';
    case 'text/markdown': return '.md';
    case 'application/json': return '.json';
    default: return '';
  }
}

function coerceContentType(ct: string): ManualEvidenceFile['contentType'] {
  if (ct === 'application/pdf') return 'application/pdf';
  if (ct === 'text/csv') return 'text/csv';
  if (ct === 'application/json') return 'application/json';
  if (ct === 'text/markdown') return 'text/markdown';
  // Office docs + images get filed as markdown-equivalent PDFs in practice —
  // the manifest only recognizes 4 mime types. Upload route already
  // constrains the allow-list to PDF / markdown / CSV / JSON for files that
  // actually land in packets; other office docs get renormalized to PDF by
  // Steve's ingestion workflow (operational, outside this module).
  return 'application/pdf';
}
