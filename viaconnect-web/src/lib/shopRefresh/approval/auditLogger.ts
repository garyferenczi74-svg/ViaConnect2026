// Prompt #106 §3.6 — shop_refresh_audit_log writer.
//
// Every state-changing function in the shopRefresh stack writes exactly
// one row here. Append-only at the trigger level (UPDATE/DELETE raise
// P0001). Keep the writer shape stable so UIs can grep the log by
// action_verb without worrying about schema drift.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ShopRefreshAuditCategory } from '../types';

export const SHOP_REFRESH_AUDIT_VERBS = {
  // Storage
  STORAGE_UPLOAD: 'storage_upload.object_added',
  STORAGE_REPLACE: 'storage_replace.object_versioned',
  STORAGE_ARCHIVE: 'storage_archive.object_archived',

  // Bindings
  BINDING_CREATE: 'binding_create.primary_assigned',
  BINDING_REBIND: 'binding_rebind.primary_swapped',
  BINDING_ARCHIVE: 'binding_archive.archived',

  // Catalog writes
  CATALOG_IMAGE_URL_UPDATE: 'catalog_image_url_update.bulk',
  CATALOG_ROW_INSERT: 'catalog_row_insert.gap_fill',
  CATALOG_ACTIVATE: 'catalog_active_toggle.true',
  CATALOG_DEACTIVATE: 'catalog_active_toggle.false',

  // Retirement flow
  RETIREMENT_FLAG: 'retirement_flag.queued',
  RETIREMENT_APPROVE: 'retirement_approve.executed',
  RETIREMENT_REVERT: 'retirement_revert.reverted',

  // Reconciliation normalization
  CATEGORY_NORMALIZATION: 'category_normalization.workbook_to_canonical',

  // Tamper / integrity
  SHA256_VERIFICATION_FAILURE: 'sha256_verification_failure.mismatch',

  // Approval capture
  APPROVAL_TYPED_CONFIRMATION: 'approval_typed_confirmation.captured',
} as const;

export interface ShopRefreshAuditEntry {
  actionCategory: ShopRefreshAuditCategory;
  actionVerb: string;
  targetTable?: string | null;
  targetId?: string | null;
  sku?: string | null;
  actorUserId?: string | null;
  actorRole?: string | null;
  beforeStateJson?: Record<string, unknown> | null;
  afterStateJson?: Record<string, unknown> | null;
  contextJson?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

export async function writeShopRefreshAuditLog(
  supabase: SupabaseClient,
  entry: ShopRefreshAuditEntry,
): Promise<void> {
  const loose = supabase as unknown as Loose;
  await loose.from('shop_refresh_audit_log').insert({
    action_category: entry.actionCategory,
    action_verb: entry.actionVerb,
    target_table: entry.targetTable ?? null,
    target_id: entry.targetId ?? null,
    sku: entry.sku ?? null,
    actor_user_id: entry.actorUserId ?? null,
    actor_role: entry.actorRole ?? null,
    before_state_json: entry.beforeStateJson ?? null,
    after_state_json: entry.afterStateJson ?? null,
    context_json: entry.contextJson ?? null,
    ip_address: entry.ipAddress ?? null,
    user_agent: entry.userAgent ?? null,
  });
}
