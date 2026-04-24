// Prompt #124 P3: Test-buy workflow.
//
// Four discrete state transitions, each a separate function so the API
// route in P5 can authorize each step independently:
//   1. initiate:       row created with budget + target listing URL.
//   2. recordOrdered:  Steve logs the order placement.
//   3. recordArrived:  Steve uploads received-product photos; these are
//                      stored on the row for post-receipt evaluation.
//   4. recordOutcome:  Steve finalizes the outcome (counterfeit confirmed
//                      / authentic confirmed / inconclusive / not delivered)
//                      and optionally links a takedown.
//
// Evaluation of received photos is triggered separately by the orchestrator
// in P5; this module only records the storage keys + post-receipt evaluation
// ID once the orchestrator has produced one.

import type { SupabaseClient } from '@supabase/supabase-js';
import { log } from './logging';

export type TestBuyOutcome =
  | 'counterfeit_confirmed'
  | 'authentic_confirmed'
  | 'inconclusive'
  | 'product_not_delivered';

export interface InitiateTestBuyInput {
  supabase: SupabaseClient;
  targetListingUrl: string;
  targetEvaluationId?: string;
  budgetUsd: number;
  initiatedBy: string;
}

export interface InitiateTestBuyResult {
  testBuyId: string;
  initiatedAt: string;
}

export async function initiateTestBuy(input: InitiateTestBuyInput): Promise<InitiateTestBuyResult> {
  if (input.budgetUsd <= 0) {
    throw new Error('initiateTestBuy: budget must be > 0');
  }
  const { data, error } = await input.supabase
    .from('counterfeit_test_buys')
    .insert({
      target_listing_url: input.targetListingUrl,
      target_evaluation_id: input.targetEvaluationId ?? null,
      budget_usd: input.budgetUsd,
      initiated_by: input.initiatedBy,
    })
    .select('id, initiated_at')
    .single();
  if (error) throw new Error(`initiateTestBuy: ${error.message}`);
  const row = data as { id: string; initiated_at: string };
  log.info('test_buy_initiated', { testBuyId: row.id, note: `budget=${input.budgetUsd}` });
  return { testBuyId: row.id, initiatedAt: row.initiated_at };
}

export interface RecordOrderedInput {
  supabase: SupabaseClient;
  testBuyId: string;
  orderedAt?: string; // ISO 8601; defaults to now
}

export async function recordOrdered(input: RecordOrderedInput): Promise<void> {
  const { error } = await input.supabase
    .from('counterfeit_test_buys')
    .update({ ordered_at: input.orderedAt ?? new Date().toISOString() })
    .eq('id', input.testBuyId);
  if (error) throw new Error(`recordOrdered: ${error.message}`);
  log.info('test_buy_ordered', { testBuyId: input.testBuyId });
}

export interface RecordArrivedInput {
  supabase: SupabaseClient;
  testBuyId: string;
  arrivedAt?: string;
  receivedPhotoStorageKeys: readonly string[];
}

export async function recordArrived(input: RecordArrivedInput): Promise<void> {
  if (input.receivedPhotoStorageKeys.length === 0) {
    throw new Error('recordArrived: at least one received-photo storage key required');
  }
  const { error } = await input.supabase
    .from('counterfeit_test_buys')
    .update({
      arrived_at: input.arrivedAt ?? new Date().toISOString(),
      received_photo_storage_keys: input.receivedPhotoStorageKeys,
    })
    .eq('id', input.testBuyId);
  if (error) throw new Error(`recordArrived: ${error.message}`);
  log.info('test_buy_arrived', {
    testBuyId: input.testBuyId,
    note: `photos=${input.receivedPhotoStorageKeys.length}`,
  });
}

export interface AttachPostReceiptEvaluationInput {
  supabase: SupabaseClient;
  testBuyId: string;
  postReceiptEvaluationId: string;
}

/**
 * Called by the orchestrator (P5) after the received-product evaluation
 * completes. Stores the evaluation ID on the test-buy row so the outcome
 * step can link it into the final takedown draft.
 */
export async function attachPostReceiptEvaluation(input: AttachPostReceiptEvaluationInput): Promise<void> {
  const { error } = await input.supabase
    .from('counterfeit_test_buys')
    .update({ post_receipt_evaluation_id: input.postReceiptEvaluationId })
    .eq('id', input.testBuyId);
  if (error) throw new Error(`attachPostReceiptEvaluation: ${error.message}`);
  log.info('test_buy_evaluation_attached', { testBuyId: input.testBuyId });
}

export interface RecordOutcomeInput {
  supabase: SupabaseClient;
  testBuyId: string;
  outcome: TestBuyOutcome;
  linkedTakedownId?: string;
  closedAt?: string;
}

export async function recordOutcome(input: RecordOutcomeInput): Promise<void> {
  const { error } = await input.supabase
    .from('counterfeit_test_buys')
    .update({
      outcome: input.outcome,
      linked_takedown_id: input.linkedTakedownId ?? null,
      closed_at: input.closedAt ?? new Date().toISOString(),
    })
    .eq('id', input.testBuyId);
  if (error) throw new Error(`recordOutcome: ${error.message}`);
  log.info('test_buy_outcome', {
    testBuyId: input.testBuyId,
    note: `outcome=${input.outcome} linkedTakedown=${input.linkedTakedownId ?? 'none'}`,
  });
}

/**
 * Validate an outcome string at runtime. Useful when the value arrives from
 * an API request body and the TS type has been erased.
 */
export function isValidOutcome(outcome: string): outcome is TestBuyOutcome {
  return (
    outcome === 'counterfeit_confirmed'
    || outcome === 'authentic_confirmed'
    || outcome === 'inconclusive'
    || outcome === 'product_not_delivered'
  );
}
