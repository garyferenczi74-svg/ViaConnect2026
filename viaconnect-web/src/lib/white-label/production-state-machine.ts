// Prompt #96 Phase 5: Production order state machine.
//
// Pure transition table. Defines which status can advance to which.
// API routes consult isValidTransition before any state mutation; admin
// UI uses ALLOWED_TRANSITIONS to render only the buttons that lead
// somewhere valid.

import { PRODUCTION_ORDER_STATUSES, type ProductionOrderStatus } from './schema-types';

export type ProductionStatus = ProductionOrderStatus;

// The 8 production milestones the operations admin marks complete (the
// stage between quote and delivery). Order matters: surfacing buttons
// in the admin UI walks this list.
export const PRODUCTION_MILESTONES: ProductionStatus[] = [
  'labels_approved_pending_deposit',
  'deposit_paid',
  'in_production',
  'quality_control',
  'final_payment_pending',
  'shipped',
  'delivered',
  'canceled',
];

// Whitelisted forward transitions only. Anything not listed is rejected.
export const ALLOWED_TRANSITIONS: Record<ProductionStatus, ProductionStatus[]> = {
  quote: ['labels_pending_review', 'canceled'],
  labels_pending_review: ['labels_approved_pending_deposit', 'canceled'],
  labels_approved_pending_deposit: ['deposit_paid', 'canceled'],
  deposit_paid: ['in_production', 'canceled'],
  in_production: ['quality_control', 'canceled'],
  quality_control: ['final_payment_pending', 'canceled'],
  final_payment_pending: ['shipped', 'canceled'],
  shipped: ['delivered'],   // shipped is past the no-cancel threshold
  delivered: [],            // terminal
  canceled: [],             // terminal
};

export function isValidTransition(from: ProductionStatus, to: ProductionStatus): boolean {
  if (!PRODUCTION_ORDER_STATUSES.includes(from) || !PRODUCTION_ORDER_STATUSES.includes(to)) {
    return false;
  }
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/**
 * Maps a production status to the cancellation stage used by the fee
 * calculator. quote/labels_pending_review/labels_approved_pending_deposit
 * are 'before_deposit'; deposit_paid is 'after_deposit_before_production';
 * in_production is also 'after_deposit_before_production' until lots
 * actually start; quality_control + final_payment_pending are
 * 'after_qc'. Refine when the operations team has a sharper definition
 * of "production started" vs "raw materials ordered".
 */
export function mapStatusToCancellationStage(
  status: ProductionStatus,
): import('./cancellation-fees').CancellationStage {
  switch (status) {
    case 'quote':
    case 'labels_pending_review':
    case 'labels_approved_pending_deposit':
      return 'before_deposit';
    case 'deposit_paid':
      return 'after_deposit_before_production';
    case 'in_production':
      return 'after_production_before_qc';
    case 'quality_control':
    case 'final_payment_pending':
    case 'shipped':
    case 'delivered':
    case 'canceled':
      return 'after_qc';
  }
}
