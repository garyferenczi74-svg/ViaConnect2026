import { getSupabaseAdmin } from './supabase-admin.ts';

/**
 * Write an entry to audit_logs (CLAUDE.md rule #3).
 */
export async function writeAudit(params: {
  userId: string | null;
  action: string;
  tableName: string;
  recordId: string;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
}): Promise<void> {
  const admin = getSupabaseAdmin();
  await admin.from('audit_logs').insert({
    user_id: params.userId,
    action: params.action,
    table_name: params.tableName,
    record_id: params.recordId,
    old_data: params.oldData ?? null,
    new_data: params.newData ?? null,
  });
}
