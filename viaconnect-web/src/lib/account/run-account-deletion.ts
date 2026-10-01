import type { AccountAdmin } from '@/lib/account/admin-port';
import { revokeAppleSignIn, type AppleIdentityInput } from '@/lib/account/apple-revoke';
import { deleteUserRows, loadStripeCustomerIds } from '@/lib/account/delete-user-data';
import { deleteUserStorage } from '@/lib/account/storage-delete';
import { cancelAndDeleteStripeCustomer, type BillingClient } from '@/lib/account/stripe-cleanup';
import { getCircuitBreaker, isCircuitBreakerError } from '@/lib/utils/circuit-breaker';
import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout } from '@/lib/utils/with-timeout';

export const DELETION_STEPS = ['stripe', 'storage', 'database', 'apple', 'auth'] as const;
export type DeletionStepName = (typeof DELETION_STEPS)[number];

export interface DeletionStepRecord {
  step: DeletionStepName;
  status: 'ok' | 'skipped';
  note?: string;
}

export type DeletionResult =
  | { ok: true; steps: DeletionStepRecord[] }
  | { ok: false; failedStep: DeletionStepName; errorCode: string; steps: DeletionStepRecord[] };

const STRIPE_TIMEOUT_MS = 15000;
const APPLE_TIMEOUT_MS = 10000;
const AUTH_TIMEOUT_MS = 15000;

function fail(
  failedStep: DeletionStepName,
  errorCode: string,
  steps: DeletionStepRecord[],
): DeletionResult {
  safeLog.error('account.delete', 'step failed', { failedStep, errorCode });
  return { ok: false, failedStep, errorCode, steps };
}

function userAlreadyGone(error: { message: string; code?: string }): boolean {
  if (error.code === '404') return true;
  return /user not found/i.test(error.message);
}

export async function runAccountDeletion(args: {
  userId: string;
  identities: readonly AppleIdentityInput[];
  admin: AccountAdmin;
  stripe: BillingClient | null;
}): Promise<DeletionResult> {
  const steps: DeletionStepRecord[] = [];

  const stripe = args.stripe;
  if (!stripe) {
    steps.push({ step: 'stripe', status: 'skipped', note: 'stripe_unconfigured' });
    safeLog.info('account.delete', 'stripe skipped', { note: 'stripe_unconfigured' });
  } else {
    const customerIds = await loadStripeCustomerIds(args.admin, args.userId);
    if (!Array.isArray(customerIds)) {
      return fail('stripe', customerIds.errorCode, steps);
    }
    if (customerIds.length === 0) {
      steps.push({ step: 'stripe', status: 'ok', note: 'no_customer' });
    } else {
      try {
        const breaker = getCircuitBreaker('account-delete-stripe');
        await breaker.execute(async () => {
          for (const customerId of customerIds) {
            await withTimeout(
              cancelAndDeleteStripeCustomer(stripe, customerId),
              STRIPE_TIMEOUT_MS,
              'account.delete.stripe',
            );
          }
        });
        steps.push({ step: 'stripe', status: 'ok' });
      } catch (error) {
        const errorCode = isCircuitBreakerError(error) ? 'stripe_circuit_open' : 'stripe_failed';
        return fail('stripe', errorCode, steps);
      }
    }
  }

  const storage = await deleteUserStorage(args.admin, args.userId);
  if (!storage.ok) return fail('storage', storage.errorCode, steps);
  steps.push({ step: 'storage', status: 'ok' });

  const database = await deleteUserRows(args.admin, args.userId, storage.corpusHash);
  if (!database.ok) return fail('database', database.errorCode, steps);
  steps.push({ step: 'database', status: 'ok' });

  let apple: Awaited<ReturnType<typeof revokeAppleSignIn>>;
  try {
    const breaker = getCircuitBreaker('account-delete-apple');
    apple = await breaker.execute(() => withTimeout(
      revokeAppleSignIn({ identities: args.identities }),
      APPLE_TIMEOUT_MS,
      'account.delete.apple',
    ));
  } catch (error) {
    const errorCode = isCircuitBreakerError(error) ? 'apple_circuit_open' : 'apple_failed';
    return fail('apple', errorCode, steps);
  }
  if (apple.status === 'failed') return fail('apple', apple.note, steps);
  steps.push({
    step: 'apple',
    status: apple.status === 'revoked' ? 'ok' : 'skipped',
    note: apple.status === 'revoked' ? undefined : apple.note,
  });

  try {
    const removed = await withTimeout(
      args.admin.auth.admin.deleteUser(args.userId),
      AUTH_TIMEOUT_MS,
      'account.delete.auth',
    );
    if (removed.error && !userAlreadyGone(removed.error)) {
      return fail('auth', 'auth_failed', steps);
    }
  } catch {
    return fail('auth', 'auth_failed', steps);
  }
  steps.push({ step: 'auth', status: 'ok' });
  safeLog.info('account.delete', 'account deleted', { stepCount: steps.length });
  return { ok: true, steps };
}
