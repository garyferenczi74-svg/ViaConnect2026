import type { AccountAdmin, QueryError } from '@/lib/account/admin-port';
import {
  CLEAR_SELF_REFERENCE,
  DELETE_BY_COLUMN,
  DELETE_USER_ID_TABLES,
  NULL_ACTOR_COLUMNS,
} from '@/lib/account/owned-tables';
import { withTimeout } from '@/lib/utils/with-timeout';

const TIMEOUT_MS = 8000;
const REDACTED_EMAIL = 'redacted@deleted.invalid';

export interface DataFailure {
  ok: false;
  errorCode: 'database_failed';
}

function isSkippable(error: QueryError): boolean {
  if (
    error.code === '42P01'
    || error.code === '42703'
    || error.code === '23502'
    || error.code === 'PGRST204'
    || error.code === 'PGRST205'
  ) {
    return true;
  }
  return /does not exist|schema cache|could not find the/i.test(error.message);
}

async function run(
  query: PromiseLike<{ data: unknown; error: QueryError | null }>,
  op: string,
): Promise<{ error: QueryError | null } | DataFailure> {
  try {
    const result = await withTimeout(Promise.resolve(query), TIMEOUT_MS, op);
    return { error: result.error };
  } catch {
    return { ok: false, errorCode: 'database_failed' };
  }
}

async function apply(
  query: PromiseLike<{ data: unknown; error: QueryError | null }>,
  op: string,
  skipConstraint: boolean,
): Promise<DataFailure | null> {
  const result = await run(query, op);
  if ('ok' in result) return result;
  if (!result.error) return null;
  if (isSkippable(result.error)) return null;
  if (skipConstraint && result.error.code === '23503') return null;
  return { ok: false, errorCode: 'database_failed' };
}

function rowsOf(data: unknown): Record<string, unknown>[] {
  if (!Array.isArray(data)) return [];
  return data.filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null);
}

async function selectValues(
  admin: AccountAdmin,
  table: string,
  column: string,
  matchColumn: string,
  matchValue: string,
): Promise<string[] | DataFailure> {
  const pending = admin.from(table).select(column).eq(matchColumn, matchValue);
  let result: { data: unknown; error: QueryError | null };
  try {
    result = await withTimeout(Promise.resolve(pending), TIMEOUT_MS, 'account.delete.db.select');
  } catch {
    return { ok: false, errorCode: 'database_failed' };
  }
  if (result.error) {
    if (isSkippable(result.error)) return [];
    return { ok: false, errorCode: 'database_failed' };
  }
  const values: string[] = [];
  for (const row of rowsOf(result.data)) {
    const value = row[column];
    if (typeof value === 'string' && value.length > 0) values.push(value);
  }
  return values;
}

export async function loadStripeCustomerIds(admin: AccountAdmin, userId: string): Promise<string[] | DataFailure> {
  const ids = new Set<string>();
  const memberships = await selectValues(admin, 'memberships', 'stripe_customer_id', 'user_id', userId);
  if (!Array.isArray(memberships)) return memberships;
  const subscriptions = await selectValues(admin, 'subscriptions', 'stripe_customer_id', 'user_id', userId);
  if (!Array.isArray(subscriptions)) return subscriptions;
  for (const id of [...memberships, ...subscriptions]) ids.add(id);

  const practitionerIds = await selectValues(admin, 'practitioners', 'id', 'user_id', userId);
  if (!Array.isArray(practitionerIds)) return practitionerIds;
  if (practitionerIds.length > 0) {
    const pending = admin.from('practitioner_subscriptions').select('stripe_customer_id').in('practitioner_id', practitionerIds);
    let result: { data: unknown; error: QueryError | null };
    try {
      result = await withTimeout(Promise.resolve(pending), TIMEOUT_MS, 'account.delete.db.practitioner_stripe');
    } catch {
      return { ok: false, errorCode: 'database_failed' };
    }
    if (result.error && !isSkippable(result.error)) {
      return { ok: false, errorCode: 'database_failed' };
    }
    if (!result.error) {
      for (const row of rowsOf(result.data)) {
        const value = row.stripe_customer_id;
        if (typeof value === 'string' && value.length > 0) ids.add(value);
      }
    }
  }

  return [...ids];
}

async function anonymizeRetained(admin: AccountAdmin, userId: string): Promise<DataFailure | null> {
  const shop = await apply(
    admin.from('shop_orders').update({
      shipping_address_line1: null,
      shipping_address_line2: null,
      shipping_city: null,
      shipping_country: null,
      shipping_email: null,
      shipping_first_name: null,
      shipping_last_name: null,
      shipping_phone: null,
      shipping_state: null,
      shipping_zip: null,
      notes: null,
      metadata: {},
      tracking_number: null,
      tracking_url: null,
    }).eq('user_id', userId),
    'account.delete.db.anonymize_shop_orders',
    false,
  );
  if (shop) return shop;

  const orders = await apply(
    admin.from('orders').update({ shipping_address: null }).eq('user_id', userId),
    'account.delete.db.anonymize_orders',
    false,
  );
  if (orders) return orders;

  const memberships = await apply(
    admin.from('memberships').update({ metadata: {} }).eq('user_id', userId),
    'account.delete.db.anonymize_memberships',
    false,
  );
  if (memberships) return memberships;

  const purchases = await apply(
    admin.from('genex360_purchases').update({
      metadata: {},
      kit_tracking_number: null,
    }).eq('user_id', userId),
    'account.delete.db.anonymize_genex',
    false,
  );
  if (purchases) return purchases;

  const audit = await apply(
    admin.from('audit_logs').update({
      user_id: null,
      ip_address: null,
      old_data: null,
      new_data: null,
      metadata: null,
    }).eq('user_id', userId),
    'account.delete.db.anonymize_audit',
    false,
  );
  if (audit) return audit;

  const dsar = await apply(
    admin.from('dsar_requests').update({
      user_id: null,
      email: REDACTED_EMAIL,
      notes: null,
    }).eq('user_id', userId),
    'account.delete.db.anonymize_dsar',
    false,
  );
  if (dsar) return dsar;

  const practitionerIds = await selectValues(admin, 'practitioners', 'id', 'user_id', userId);
  if (!Array.isArray(practitionerIds)) return practitionerIds;
  if (practitionerIds.length > 0) {
    const subs = await apply(
      admin.from('practitioner_subscriptions').update({ metadata: null }).in('practitioner_id', practitionerIds),
      'account.delete.db.anonymize_practitioner_subscriptions',
      false,
    );
    if (subs) return subs;
  }

  return null;
}

export async function deleteUserRows(
  admin: AccountAdmin,
  userId: string,
  corpusHash: string | null,
): Promise<{ ok: true } | DataFailure> {
  const anonymized = await anonymizeRetained(admin, userId);
  if (anonymized) return anonymized;

  for (const item of NULL_ACTOR_COLUMNS) {
    const failed = await apply(
      admin.from(item.table).update({ [item.column]: null }).eq(item.column, userId),
      'account.delete.db.null_actor',
      true,
    );
    if (failed) return failed;
  }

  for (const item of CLEAR_SELF_REFERENCE) {
    const failed = await apply(
      admin.from(item.table).update({ [item.column]: null }).eq('user_id', userId),
      'account.delete.db.clear_self',
      true,
    );
    if (failed) return failed;
  }

  for (const table of DELETE_USER_ID_TABLES) {
    const failed = await apply(
      admin.from(table).delete().eq('user_id', userId),
      'account.delete.db.delete_user',
      false,
    );
    if (failed) return failed;
  }

  for (const item of DELETE_BY_COLUMN) {
    const failed = await apply(
      admin.from(item.table).delete().eq(item.column, userId),
      'account.delete.db.delete_column',
      false,
    );
    if (failed) return failed;
  }

  if (corpusHash) {
    const failed = await apply(
      admin.from('user_meal_corpus').delete().eq('user_hash', corpusHash),
      'account.delete.db.corpus',
      false,
    );
    if (failed) return failed;
  }

  const profile = await apply(
    admin.from('profiles').delete().eq('id', userId),
    'account.delete.db.profile',
    false,
  );
  if (profile) return profile;

  return { ok: true };
}
