// Prompt #124 P3: Consumer counterfeit-report intake.
//
// Validates a submission, runs each image through normalize + PHI pre-filter,
// uploads the normalized + redacted bytes to the counterfeit-intake bucket,
// writes a consumer_counterfeit_reports row, and returns the generated
// report ID + acknowledgment payload.
//
// Privacy guarantees:
//   - PHI pre-filter runs on every image BEFORE any Storage write.
//   - If any image tripped the pre-filter, phi_redaction_applied = true and
//     the redacted bytes are what lands in Storage; original bytes are
//     discarded and never persisted.
//   - Consumer email is accepted optional; anonymous submissions allowed.
//   - Rate limiting lives upstream (in the API route, P5); this module
//     focuses on correctness of the write.

import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeImage } from './normalize';
import { redactPhi } from './phiRedact';
import { log } from './logging';

const CONSUMER_BUCKET = 'counterfeit-intake';
const MIN_DESCRIPTION_LEN = 20;
const MAX_DESCRIPTION_LEN = 2000;
const MAX_IMAGES_PER_REPORT = 4;

export interface ConsumerSubmission {
  submittedByUserId?: string;
  submittedByEmail?: string;
  purchaseLocation?: string;
  purchaseDate?: string;  // ISO yyyy-mm-dd
  orderNumber?: string;
  concernDescription: string;
  images: ReadonlyArray<{
    bytes: Uint8Array;
    declaredContentType?: string;
    /** Optional caller-supplied text that was extracted from the image (helps PHI pre-filter). */
    extractedText?: readonly string[];
  }>;
}

export interface ConsumerIntakeResult {
  reportId: string;
  reportRowId: string;
  imageStorageKeys: readonly string[];
  phiRedactionApplied: boolean;
  acknowledgment: {
    displayId: string;
    reviewTimelineBusinessDays: number;
    privacyNoticeVersion: string;
  };
}

export class ConsumerIntakeError extends Error {
  constructor(public code: ConsumerIntakeErrorCode, message: string) {
    super(message);
    this.name = 'ConsumerIntakeError';
  }
}

export type ConsumerIntakeErrorCode =
  | 'description_too_short'
  | 'description_too_long'
  | 'no_images'
  | 'too_many_images'
  | 'image_processing_failed'
  | 'storage_upload_failed'
  | 'insert_failed';

const PRIVACY_NOTICE_VERSION = 'v1.2026-04-24';
const REVIEW_TIMELINE_BUSINESS_DAYS = 10;

export interface SubmitConsumerReportInput {
  supabase: SupabaseClient;
  submission: ConsumerSubmission;
}

/**
 * Primary entry point. Validates, normalizes, PHI-redacts, uploads, writes
 * the report row, and returns the acknowledgment payload for the consumer UI.
 */
export async function submitConsumerReport(input: SubmitConsumerReportInput): Promise<ConsumerIntakeResult> {
  const { submission, supabase } = input;

  validateSubmission(submission);

  // Stage 1: normalize + PHI-redact every image locally BEFORE any upload.
  const processed: Array<{ bytes: Uint8Array; storageKey: string; redacted: boolean }> = [];
  let phiRedactionApplied = false;

  const reportId = generateReportId();

  for (let i = 0; i < submission.images.length; i++) {
    const img = submission.images[i];
    try {
      const normalized = await normalizeImage({
        bytes: img.bytes,
        declaredContentType: img.declaredContentType,
      });
      const redacted = await redactPhi({
        bytes: normalized.bytes,
        extractedText: img.extractedText,
      });
      if (redacted.redacted) phiRedactionApplied = true;
      const storageKey = `${reportId}/img-${String(i + 1).padStart(2, '0')}.jpg`;
      processed.push({ bytes: redacted.bytes, storageKey, redacted: redacted.redacted });
    } catch (err) {
      throw new ConsumerIntakeError(
        'image_processing_failed',
        `image ${i + 1} processing failed: ${(err as Error).message}`,
      );
    }
  }

  // Stage 2: upload each processed image.
  for (const p of processed) {
    const { error } = await supabase.storage
      .from(CONSUMER_BUCKET)
      .upload(p.storageKey, p.bytes, {
        contentType: 'image/jpeg',
        cacheControl: 'private, max-age=31536000, immutable',
        upsert: false,
      });
    if (error && !isAlreadyExists(error)) {
      throw new ConsumerIntakeError(
        'storage_upload_failed',
        `storage upload failed for ${p.storageKey}: ${error.message}`,
      );
    }
  }

  // Stage 3: insert report row.
  const { data, error } = await supabase
    .from('consumer_counterfeit_reports')
    .insert({
      report_id: reportId,
      submitted_by_user_id: submission.submittedByUserId ?? null,
      submitted_by_email: submission.submittedByEmail ?? null,
      purchase_location: submission.purchaseLocation ?? null,
      purchase_date: submission.purchaseDate ?? null,
      order_number: submission.orderNumber ?? null,
      concern_description: submission.concernDescription,
      image_storage_keys: processed.map((p) => p.storageKey),
      phi_redaction_applied: phiRedactionApplied,
      status: 'submitted',
    })
    .select('id')
    .single();
  if (error) {
    throw new ConsumerIntakeError('insert_failed', `consumer_counterfeit_reports insert: ${error.message}`);
  }

  log.info('consumer_report_submitted', {
    reportId,
    note: `images=${processed.length} phiRedacted=${phiRedactionApplied}`,
  });

  return {
    reportId,
    reportRowId: (data as { id: string }).id,
    imageStorageKeys: processed.map((p) => p.storageKey),
    phiRedactionApplied,
    acknowledgment: {
      displayId: reportId,
      reviewTimelineBusinessDays: REVIEW_TIMELINE_BUSINESS_DAYS,
      privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
    },
  };
}

export function validateSubmission(s: ConsumerSubmission): void {
  const desc = (s.concernDescription ?? '').trim();
  if (desc.length < MIN_DESCRIPTION_LEN) {
    throw new ConsumerIntakeError(
      'description_too_short',
      `description must be at least ${MIN_DESCRIPTION_LEN} characters`,
    );
  }
  if (desc.length > MAX_DESCRIPTION_LEN) {
    throw new ConsumerIntakeError(
      'description_too_long',
      `description exceeds ${MAX_DESCRIPTION_LEN} characters`,
    );
  }
  if (!s.images || s.images.length === 0) {
    throw new ConsumerIntakeError('no_images', 'at least one image required');
  }
  if (s.images.length > MAX_IMAGES_PER_REPORT) {
    throw new ConsumerIntakeError(
      'too_many_images',
      `at most ${MAX_IMAGES_PER_REPORT} images per report`,
    );
  }
}

export function generateReportId(now: Date = new Date()): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
  return `CCR-${yyyy}-${mm}${dd}-${rand}`;
}

function isAlreadyExists(err: { message: string; statusCode?: string | number }): boolean {
  const m = err.message.toLowerCase();
  return m.includes('already exists') || m.includes('duplicate') || String(err.statusCode ?? '').startsWith('409');
}
