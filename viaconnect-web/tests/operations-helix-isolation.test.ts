// Prompt #102 CRITICAL guardrail: Helix Rewards isolation.
// Scans the entire Workstream A + B source tree + migrations for any
// reference to consumer-rewards identifiers. §3.1 + §14 abort condition.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { renderStatementPDF, type StatementInput } from '@/lib/payouts/statementGenerator';

const REPO_ROOT = process.cwd();
const OPERATIONS_ROOTS = [
  join(REPO_ROOT, 'src/lib/verifiedChannels'),
  join(REPO_ROOT, 'src/lib/reconciliation'),
  join(REPO_ROOT, 'src/lib/payouts'),
  join(REPO_ROOT, 'src/lib/tax'),
  join(REPO_ROOT, 'src/lib/pii'),
  join(REPO_ROOT, 'src/lib/audit'),
];
const MIGRATIONS = [
  join(REPO_ROOT, 'supabase/migrations/20260421000100_commission_accruals_bridge.sql'),
  join(REPO_ROOT, 'supabase/migrations/20260421000101_verified_channels_tables.sql'),
  join(REPO_ROOT, 'supabase/migrations/20260421000102_tax_and_payment_tables.sql'),
  join(REPO_ROOT, 'supabase/migrations/20260421000103_reconciliation_payout_tables.sql'),
  join(REPO_ROOT, 'supabase/migrations/20260421000104_audit_log.sql'),
  join(REPO_ROOT, 'supabase/migrations/20260421000105_prompt_102_rls.sql'),
];

const FORBIDDEN = [
  'helix_',
  'token_balance',
  'challenge_',
  'achievement_',
  'leaderboard',
  'tier_multiplier',
  'helixRewards',
  'helix_rewards',
  'Vitality Score',
];

function walk(dir: string): string[] {
  const out: string[] = [];
  try {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) out.push(...walk(full));
      else if (/\.(ts|tsx|sql)$/.test(name)) out.push(full);
    }
  } catch {
    // directory missing; treat as empty
  }
  return out;
}

function scan(content: string): string[] {
  return FORBIDDEN.filter((t) => content.includes(t));
}

describe('Prompt #102 — Helix isolation', () => {
  it('no forbidden consumer-reward tokens anywhere in Workstream A + B source', () => {
    const violations: string[] = [];
    for (const root of OPERATIONS_ROOTS) {
      for (const file of walk(root)) {
        const raw = readFileSync(file, 'utf8');
        const hits = scan(raw);
        if (hits.length) violations.push(`${file.replace(REPO_ROOT, '')}: ${hits.join(', ')}`);
      }
    }
    if (violations.length) throw new Error(`Forbidden:\n${violations.join('\n')}`);
    expect(violations).toEqual([]);
  });

  it('no forbidden tokens in Prompt #102 migrations', () => {
    const violations: string[] = [];
    for (const file of MIGRATIONS) {
      const raw = readFileSync(file, 'utf8');
      const hits = scan(raw);
      if (hits.length) violations.push(`${file.replace(REPO_ROOT, '')}: ${hits.join(', ')}`);
    }
    expect(violations).toEqual([]);
  });

  it('rendered payout statement PDF contains no Helix copy', async () => {
    const input: StatementInput = {
      practitionerDisplayName: 'Jane Doe',
      periodStart: '2026-03-01',
      periodEnd: '2026-03-31',
      settledOrderCount: 12,
      grossAccruedCents: 120000,
      refundClawbacksCents: 1500,
      mapViolationHoldsCents: 0,
      netPayableCents: 118500,
      rail: 'Stripe Connect',
      transactionReference: 'tr_123',
      settlementDate: '2026-04-05',
      holdDetails: [],
      ytdGrossCents: 360000,
      ytdAdjustmentsCents: 4500,
      ytdNetPaidCents: 355500,
      taxFormOnFile: 'W-9',
      taxFormStatus: 'on_file',
    };
    const bytes = await renderStatementPDF(input);
    // PDF content is not plaintext UTF-8, but text strings from
    // drawText() ARE present in the byte stream. Extract a best-effort
    // ASCII view and scan it.
    const bytesArray: number[] = [];
    for (let i = 0; i < bytes.byteLength; i += 1) bytesArray.push(bytes[i]!);
    const ascii = bytesArray
      .map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : ' '))
      .join('');
    const hits = scan(ascii);
    expect(hits).toEqual([]);
  });
});
