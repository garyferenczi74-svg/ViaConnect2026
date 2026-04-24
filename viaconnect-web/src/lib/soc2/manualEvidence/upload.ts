// Prompt #122 P6: Server-side upload helper for manual evidence.
//
// Consumes raw bytes + metadata, writes to the soc2-manual-evidence bucket,
// inserts the soc2_manual_evidence row. Validates title / controls /
// content-type and truncates oversize metadata. Never logs bytes.

import { createHash, randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { ManualEvidenceUploadInput, ManualEvidenceUploadResult } from './types';

export const MANUAL_EVIDENCE_BUCKET = 'soc2-manual-evidence';
const MAX_TITLE_LEN = 200;
const MAX_DESCRIPTION_LEN = 2000;
const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp',
  'text/csv', 'text/plain', 'text/markdown',
  'application/json',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

export class ManualEvidenceUploadError extends Error {
  constructor(public code: UploadErrorCode, message: string) {
    super(message);
    this.name = 'ManualEvidenceUploadError';
  }
}
export type UploadErrorCode =
  | 'title_required'
  | 'controls_required'
  | 'source_description_required'
  | 'unsupported_content_type'
  | 'empty_file'
  | 'storage_upload_failed'
  | 'insert_failed';

export interface ServerUploadInput {
  supabase: SupabaseClient;
  /** Authenticated user's UUID; stored as uploaded_by. */
  uploadedBy: string;
  evidence: ManualEvidenceUploadInput;
}

export async function uploadManualEvidence(input: ServerUploadInput): Promise<ManualEvidenceUploadResult> {
  const { supabase, uploadedBy, evidence } = input;

  validate(evidence);

  const bytes = evidence.bytes;
  const sha256 = createHash('sha256').update(Buffer.from(bytes)).digest('hex');
  const storageKey = buildStorageKey(evidence.filenameHint, evidence.contentType);

  const { error: uploadErr } = await supabase.storage
    .from(MANUAL_EVIDENCE_BUCKET)
    .upload(storageKey, bytes, {
      contentType: evidence.contentType,
      cacheControl: 'private, max-age=31536000, immutable',
      upsert: false,
    });
  if (uploadErr && !isAlreadyExists(uploadErr)) {
    throw new ManualEvidenceUploadError('storage_upload_failed', uploadErr.message);
  }

  const { data, error } = await supabase
    .from('soc2_manual_evidence')
    .insert({
      title: evidence.title.trim().slice(0, MAX_TITLE_LEN),
      storage_key: storageKey,
      sha256,
      size_bytes: bytes.byteLength,
      content_type: evidence.contentType,
      controls: evidence.controls,
      valid_from: evidence.validFrom ?? null,
      valid_until: evidence.validUntil ?? null,
      source_description: evidence.sourceDescription.trim().slice(0, MAX_DESCRIPTION_LEN),
      uploaded_by: uploadedBy,
    })
    .select('id')
    .single();
  if (error) {
    throw new ManualEvidenceUploadError('insert_failed', error.message);
  }

  return {
    rowId: (data as { id: string }).id,
    storageKey,
    sha256,
    sizeBytes: bytes.byteLength,
  };
}

function validate(e: ManualEvidenceUploadInput): void {
  if (!e.title || e.title.trim().length === 0) {
    throw new ManualEvidenceUploadError('title_required', 'title is required');
  }
  if (!e.controls || e.controls.length === 0) {
    throw new ManualEvidenceUploadError('controls_required', 'at least one control must be attached');
  }
  if (!e.sourceDescription || e.sourceDescription.trim().length === 0) {
    throw new ManualEvidenceUploadError('source_description_required', 'source description is required');
  }
  if (!ALLOWED_CONTENT_TYPES.has(e.contentType)) {
    throw new ManualEvidenceUploadError('unsupported_content_type', `content type "${e.contentType}" not allowed`);
  }
  if (e.bytes.byteLength === 0) {
    throw new ManualEvidenceUploadError('empty_file', 'file is empty');
  }
}

/** Build a unique storage key that preserves a safe slug of the filename hint. */
export function buildStorageKey(filenameHint: string | undefined, contentType: string): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const slug = sanitizeSlug(filenameHint ?? 'evidence');
  const ext = contentTypeToExt(contentType);
  const uid = randomUUID().slice(0, 8);
  return `${y}/${m}/${slug}-${uid}${ext}`;
}

function sanitizeSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/\.[^.]*$/, '')          // drop original extension
    .replace(/[^a-z0-9]+/g, '_')      // non-alphanumeric to underscore
    .replace(/^_+|_+$/g, '')          // trim edges
    .slice(0, 60) || 'evidence';
}

function contentTypeToExt(ct: string): string {
  switch (ct) {
    case 'application/pdf': return '.pdf';
    case 'image/jpeg': return '.jpg';
    case 'image/png': return '.png';
    case 'image/webp': return '.webp';
    case 'text/csv': return '.csv';
    case 'text/plain': return '.txt';
    case 'text/markdown': return '.md';
    case 'application/json': return '.json';
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': return '.xlsx';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': return '.docx';
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation': return '.pptx';
    default: return '';
  }
}

function isAlreadyExists(err: { message: string; statusCode?: string | number }): boolean {
  const m = err.message.toLowerCase();
  return m.includes('already exists') || m.includes('duplicate') || String(err.statusCode ?? '').startsWith('409');
}
