// Prompt #125 P1: SchedulerDraft normalizer.
//
// The cross-surface invariant from §6.3 + test §16 "Content hash parity
// with #121": a scheduler draft with the same caption text as a pre-check
// draft produces the same SHA-256 hash, so a receipt issued on either
// surface is reusable on the other.
//
// Implementation: the contentHashSha256 is the #121 draft-hash applied to
// the caption text alone. We reuse #121's normalizeText rules verbatim
// (NFKD, CRLF->LF, zero-width strip, whitespace collapse, triple-newline
// collapse, trim). Hashtags, mention handles, and media are rich context
// but don't participate in the hash; they already flow into the rule
// evaluator via the SchedulerDraft itself.

import { createHash } from 'node:crypto';
import type {
  SchedulerDraft,
  SchedulerMediaAttachment,
  SchedulerPlatform,
} from './types';

/**
 * Byte-compatible with src/lib/marshall/precheck/normalize.ts normalizeText.
 * Keep these two in sync. A test in tests/marshall/scheduler/normalize.test.ts
 * asserts the hashes match for shared inputs.
 */
export function normalizeCaptionText(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/\r\n?/g, '\n')
    .replace(/[​-‏﻿]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function computeContentHash(captionText: string): string {
  const normalized = normalizeCaptionText(captionText);
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

// ─── Adapter output -> SchedulerDraft ─────────────────────────────────────

export interface NormalizeInput {
  source: SchedulerPlatform;
  externalId: string;
  practitionerId: string;
  connectionId: string;
  targetPlatforms: string[];
  scheduledAt: string;
  captionText: string;
  hashtags?: string[] | null;
  mentionHandles?: string[] | null;
  mediaAttachments?: SchedulerMediaAttachment[] | null;
  editedAt: string;
  rawPayload: unknown;
}

export function buildSchedulerDraft(input: NormalizeInput): SchedulerDraft {
  const hashtags = dedupeSorted((input.hashtags ?? []).map((h) => h.trim().toLowerCase()).filter(Boolean));
  const mentionHandles = dedupeSorted(
    (input.mentionHandles ?? []).map((m) => m.trim().toLowerCase()).filter(Boolean),
  );
  const mediaAttachments: SchedulerMediaAttachment[] = (input.mediaAttachments ?? []).map((m) => ({
    kind: m.kind,
    storageUrl: m.storageUrl,
    altText: m.altText,
  }));
  return {
    source: input.source,
    externalId: input.externalId,
    practitionerId: input.practitionerId,
    connectionId: input.connectionId,
    targetPlatforms: [...input.targetPlatforms].sort(),
    scheduledAt: input.scheduledAt,
    captionText: input.captionText,
    hashtags,
    mentionHandles,
    mediaAttachments,
    editedAt: input.editedAt,
    contentHashSha256: computeContentHash(input.captionText),
    ingestedAt: new Date().toISOString(),
    rawPayload: input.rawPayload,
  };
}

function dedupeSorted(arr: string[]): string[] {
  return Array.from(new Set(arr)).sort();
}
