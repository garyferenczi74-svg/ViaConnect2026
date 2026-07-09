/**
 * src/lib/compliance/__tests__/kelsey-review-shape.test.ts
 *
 * Prompt 210d P0-9: Kelsey compliance review insert shape test.
 *
 * Guards the contract between:
 *   1. The LIVE regulatory_kelsey_reviews columns, parsed AT RUNTIME from the
 *      drift snapshot docs/integrity/snapshot/live-types.ts (Tables ->
 *      regulatory_kelsey_reviews -> Row keys, plus the REQUIRED Insert keys).
 *      Never hardcoded here, so a snapshot refresh keeps this suite honest.
 *   2. The two insert payload builders exported by
 *      src/lib/compliance/kelsey-review-rows.ts:
 *        - buildKelseyEscalateRow: the fail-closed insert when the Kelsey LLM
 *          is unavailable or returns malformed JSON.
 *        - buildKelseyReviewRow: the fresh Stage-2 verdict persist.
 *      Both were inline object literals in
 *      src/lib/compliance/review-server-text.ts (the sites in
 *      docs/integrity/snapshot/column-misses-verified.json at :154 and :189)
 *      using phantom keys subject_hash / stage_1_score / reviewed_by /
 *      citations / model_used, so every row was rejected whole and silently
 *      lost.
 *
 * Invariants:
 *   - every payload key is a subset of the live Row keys;
 *   - every REQUIRED live Insert key is present (subject_text_excerpt was
 *     missing entirely, so the writes failed NOT NULL even after renames);
 *   - renamed keys carry their values unchanged;
 *   - no value is dropped: homeless values (stage_1_score, citations,
 *     reviewed_by on the Stage-2 row) are folded into the stage_2_raw jsonb,
 *     following the route.ts:140 wrapper precedent.
 *
 * Node-safe (no jsdom), node builtins only, zero any.
 * Rules: no em dashes, no en dashes, no emojis.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildKelseyEscalateRow,
  buildKelseyReviewRow,
} from '@/lib/compliance/kelsey-review-rows';
import type { DetectorFlag } from '@/lib/compliance/types';
import type { ValidatedKelseyResponse } from '@/lib/compliance/kelsey/verdict-schema';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, '..', '..', '..', '..');
const LIVE_TYPES_PATH = join(REPO_ROOT, 'docs', 'integrity', 'snapshot', 'live-types.ts');
const REVIEW_SERVER_TEXT_PATH = resolve(TEST_DIR, '..', 'review-server-text.ts');

// ---------------------------------------------------------------------------
// Live snapshot parsing (Tables -> regulatory_kelsey_reviews, at runtime)
// ---------------------------------------------------------------------------

interface LiveBlockKey {
  name: string;
  optional: boolean;
}

/**
 * Parses the keys of one block (Row or Insert) of the
 * regulatory_kelsey_reviews table entry in live-types.ts. The table matcher
 * anchors the exact name after start-of-line whitespace; keys are collected
 * one per line until the block's closing brace. `optional` records whether
 * the key carries a `?` (Insert blocks mark defaulted/nullable columns
 * optional, so a non-optional Insert key means NOT NULL with no default).
 */
function parseLiveKelseyBlock(block: 'Row' | 'Insert'): LiveBlockKey[] {
  const lines = readFileSync(LIVE_TYPES_PATH, 'utf8').split(/\r?\n/);
  const tableIndex = lines.findIndex((line) => /^\s*regulatory_kelsey_reviews: \{$/.test(line));
  if (tableIndex === -1) {
    throw new Error('regulatory_kelsey_reviews table entry not found in live-types.ts');
  }
  const blockPattern = new RegExp(`^\\s*${block}: \\{$`);
  let blockIndex = -1;
  for (let i = tableIndex + 1; i < lines.length; i += 1) {
    if (blockPattern.test(lines[i])) {
      blockIndex = i;
      break;
    }
    if (/^\s*Relationships\b/.test(lines[i])) {
      break;
    }
  }
  if (blockIndex === -1) {
    throw new Error(`regulatory_kelsey_reviews ${block} block not found in live-types.ts`);
  }
  const keys: LiveBlockKey[] = [];
  for (let i = blockIndex + 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '}') {
      return keys;
    }
    const keyMatch = /^\s*([A-Za-z_][A-Za-z0-9_]*)(\?)?:/.exec(lines[i]);
    if (keyMatch) {
      keys.push({ name: keyMatch[1], optional: keyMatch[2] === '?' });
    }
  }
  throw new Error(`regulatory_kelsey_reviews ${block} block not terminated in live-types.ts`);
}

function liveRowKeys(): Set<string> {
  return new Set(parseLiveKelseyBlock('Row').map((k) => k.name));
}

function requiredInsertKeys(): string[] {
  return parseLiveKelseyBlock('Insert')
    .filter((k) => !k.optional)
    .map((k) => k.name);
}

function expectSubsetOfLiveRow(payload: Record<string, unknown>, label: string): void {
  const live = liveRowKeys();
  for (const key of Object.keys(payload)) {
    expect(
      live.has(key),
      `${label} payload key "${key}" is not a live regulatory_kelsey_reviews column`,
    ).toBe(true);
  }
}

function expectRequiredInsertKeysPresent(payload: Record<string, unknown>, label: string): void {
  for (const key of requiredInsertKeys()) {
    expect(
      Object.prototype.hasOwnProperty.call(payload, key),
      `${label} payload is missing the required live Insert key "${key}"`,
    ).toBe(true);
  }
}

// ---------------------------------------------------------------------------
// Shared fixtures (values only; content is synthetic test data)
// ---------------------------------------------------------------------------

const FLAGS: DetectorFlag[] = [
  { rule: 'disease_claim', match: 'test-match', position: 12, severity: 4 },
];

const LONG_TEXT = 'x'.repeat(620);

const VALIDATED: ValidatedKelseyResponse = {
  verdict: 'CONDITIONAL',
  rationale: 'Needs a qualifier.',
  rule_references: ['21 CFR 101.93'],
  suggested_rewrite: 'May support overall wellness.',
  confidence: 0.82,
  citations: [{ title: 'Guidance document', url: 'https://example.gov/doc', loe: 'A' }],
};

// ---------------------------------------------------------------------------
// 1. Live snapshot parsing sanity
// ---------------------------------------------------------------------------

describe('live regulatory_kelsey_reviews keys (parsed from live-types.ts at runtime)', () => {
  it('parses the full Row key set without duplicates', () => {
    const keys = parseLiveKelseyBlock('Row').map((k) => k.name);
    expect(keys.length).toBe(15);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain('id');
    expect(keys).toContain('subject_text_hash');
    expect(keys).toContain('reviewer_model');
    expect(keys).toContain('verdict');
  });

  it('parses the required Insert keys (NOT NULL, no default)', () => {
    expect([...requiredInsertKeys()].sort()).toEqual([
      'jurisdiction_id',
      'rationale',
      'subject_id',
      'subject_text_excerpt',
      'subject_text_hash',
      'subject_type',
      'verdict',
    ]);
  });
});

// ---------------------------------------------------------------------------
// 2. Fail-closed ESCALATE payload (site review-server-text.ts:154)
// ---------------------------------------------------------------------------

describe('buildKelseyEscalateRow (fail-closed insert, live shape)', () => {
  const row = buildKelseyEscalateRow({
    reviewId: 'review-1',
    subjectType: 'protocol',
    subjectId: undefined,
    jurisdictionId: 'jur-1',
    subjectHash: 'a'.repeat(64),
    text: LONG_TEXT,
    stage1Flags: FLAGS,
    stage1Score: 4.5,
  });

  it('every payload key is a live column (RED before P0-9 fix)', () => {
    expectSubsetOfLiveRow(row, 'escalate');
  });

  it('carries every required live Insert key (RED before P0-9 fix)', () => {
    expectRequiredInsertKeysPresent(row, 'escalate');
  });

  it('renames subject_hash to subject_text_hash with the value unchanged', () => {
    expect(row.subject_text_hash).toBe('a'.repeat(64));
    expect(Object.keys(row)).not.toContain('subject_hash');
  });

  it('uses the fail_closed sentinel in reviewer_model (unified with route.ts:96)', () => {
    expect(row.reviewer_model).toBe('fail_closed');
    expect(Object.keys(row)).not.toContain('reviewed_by');
  });

  it('folds stage_1_score and source provenance into stage_2_raw without dropping either', () => {
    expect(Object.keys(row)).not.toContain('stage_1_score');
    expect(row.stage_2_raw).toEqual({ stage_1_score: 4.5, source: 'kelsey-server-helper' });
  });

  it('adds the required subject_text_excerpt as the first 500 chars (route.ts shape)', () => {
    expect(row.subject_text_excerpt).toBe(LONG_TEXT.slice(0, 500));
    expect(row.subject_text_excerpt.length).toBe(500);
  });

  it('keeps every other key and value unchanged from the pre-210d literal', () => {
    expect(row.id).toBe('review-1');
    expect(row.subject_type).toBe('protocol');
    expect(row.subject_id).toBe('review-1');
    expect(row.jurisdiction_id).toBe('jur-1');
    expect(row.stage_1_flags).toEqual(FLAGS);
    expect(row.verdict).toBe('ESCALATE');
    expect(row.rationale).toBe(
      'Kelsey LLM unavailable or malformed response; fail-closed escalation from server review helper.',
    );
    expect(row.rule_references).toEqual([]);
    expect(row.confidence).toBe(0);
  });

  it('falls back subject_id to the review id only when no subject id is given', () => {
    const withSubject = buildKelseyEscalateRow({
      reviewId: 'review-1',
      subjectType: 'protocol',
      subjectId: 'subject-7',
      jurisdictionId: 'jur-1',
      subjectHash: 'a'.repeat(64),
      text: 'short text',
      stage1Flags: FLAGS,
      stage1Score: 4.5,
    });
    expect(withSubject.subject_id).toBe('subject-7');
  });
});

// ---------------------------------------------------------------------------
// 3. Fresh Stage-2 verdict payload (site review-server-text.ts:189)
// ---------------------------------------------------------------------------

describe('buildKelseyReviewRow (Stage-2 persist, live shape)', () => {
  const row = buildKelseyReviewRow({
    reviewId: 'review-2',
    subjectType: 'marketing_copy',
    subjectId: 'subject-9',
    jurisdictionId: 'jur-1',
    subjectHash: 'b'.repeat(64),
    text: LONG_TEXT,
    stage1Flags: FLAGS,
    stage1Score: 6,
    validated: VALIDATED,
    rawResponse: '{"verdict":"CONDITIONAL"}',
    modelUsed: 'claude-sonnet-4-6',
  });

  it('every payload key is a live column (RED before P0-9 fix)', () => {
    expectSubsetOfLiveRow(row, 'review');
  });

  it('carries every required live Insert key (RED before P0-9 fix)', () => {
    expectRequiredInsertKeysPresent(row, 'review');
  });

  it('renames subject_hash to subject_text_hash with the value unchanged', () => {
    expect(row.subject_text_hash).toBe('b'.repeat(64));
    expect(Object.keys(row)).not.toContain('subject_hash');
  });

  it('renames model_used to reviewer_model with the value unchanged', () => {
    expect(row.reviewer_model).toBe('claude-sonnet-4-6');
    expect(Object.keys(row)).not.toContain('model_used');
  });

  it('folds every homeless value into stage_2_raw without dropping any', () => {
    expect(Object.keys(row)).not.toContain('stage_1_score');
    expect(Object.keys(row)).not.toContain('citations');
    expect(Object.keys(row)).not.toContain('reviewed_by');
    expect(row.stage_2_raw).toEqual({
      raw_response: '{"verdict":"CONDITIONAL"}',
      citations: VALIDATED.citations,
      stage_1_score: 6,
      reviewed_by: 'kelsey-server-helper',
    });
  });

  it('adds the required subject_text_excerpt as the first 500 chars (route.ts shape)', () => {
    expect(row.subject_text_excerpt).toBe(LONG_TEXT.slice(0, 500));
  });

  it('keeps every other key and value unchanged from the pre-210d literal', () => {
    expect(row.id).toBe('review-2');
    expect(row.subject_type).toBe('marketing_copy');
    expect(row.subject_id).toBe('subject-9');
    expect(row.jurisdiction_id).toBe('jur-1');
    expect(row.stage_1_flags).toEqual(FLAGS);
    expect(row.verdict).toBe('CONDITIONAL');
    expect(row.rationale).toBe('Needs a qualifier.');
    expect(row.rule_references).toEqual(['21 CFR 101.93']);
    expect(row.suggested_rewrite).toBe('May support overall wellness.');
    expect(row.confidence).toBe(0.82);
  });

  it('falls back subject_id to the review id only when no subject id is given', () => {
    const noSubject = buildKelseyReviewRow({
      reviewId: 'review-2',
      subjectType: 'marketing_copy',
      subjectId: undefined,
      jurisdictionId: 'jur-1',
      subjectHash: 'b'.repeat(64),
      text: 'short text',
      stage1Flags: FLAGS,
      stage1Score: 6,
      validated: VALIDATED,
      rawResponse: '{"verdict":"CONDITIONAL"}',
      modelUsed: 'claude-sonnet-4-6',
    });
    expect(noSubject.subject_id).toBe('review-2');
  });
});

// ---------------------------------------------------------------------------
// 4. The helper actually uses the builders (source-text guard, P0-5b style)
// ---------------------------------------------------------------------------

describe('review-server-text.ts insert sites use the shared builders', () => {
  const src = readFileSync(REVIEW_SERVER_TEXT_PATH, 'utf8');

  it('calls buildKelseyEscalateRow for the fail-closed insert', () => {
    expect(src).toContain('buildKelseyEscalateRow(');
  });

  it('calls buildKelseyReviewRow for the Stage-2 persist', () => {
    expect(src).toContain('buildKelseyReviewRow(');
  });

  it('contains no phantom subject_hash key anywhere (RED before P0-9 fix)', () => {
    expect(src).not.toMatch(/\bsubject_hash\b/);
  });

  it('contains no phantom reviewed_by key anywhere (RED before P0-9 fix)', () => {
    expect(src).not.toMatch(/\breviewed_by\b/);
  });
});
