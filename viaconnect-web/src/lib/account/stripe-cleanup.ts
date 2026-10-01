// Cancels active Stripe subscriptions and deletes the customer.
// Missing customers are a no-op so a retry after a successful delete works.

export interface BillingSubscription {
  id: string;
  status: string;
}

export interface BillingPage {
  data: BillingSubscription[];
  has_more?: boolean;
}

export interface BillingClient {
  subscriptions: {
    list(params: {
      customer: string;
      status: 'all';
      limit: number;
      starting_after?: string;
    }): Promise<BillingPage>;
    cancel(id: string): Promise<unknown>;
  };
  customers: {
    del(id: string): Promise<unknown>;
  };
}

const TERMINAL = new Set(['canceled', 'incomplete_expired']);

function isMissingCustomer(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const code = 'code' in error ? error.code : undefined;
  return code === 'resource_missing';
}

export async function cancelAndDeleteStripeCustomer(
  stripe: BillingClient,
  customerId: string,
): Promise<void> {
  let startingAfter: string | undefined;
  for (;;) {
    const page = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
      starting_after: startingAfter,
    });
    for (const sub of page.data) {
      if (TERMINAL.has(sub.status)) continue;
      try {
        await stripe.subscriptions.cancel(sub.id);
      } catch (error) {
        if (isMissingCustomer(error)) continue;
        throw error;
      }
    }
    if (!page.has_more || page.data.length === 0) break;
    const last = page.data[page.data.length - 1];
    if (!last) break;
    startingAfter = last.id;
  }

  try {
    await stripe.customers.del(customerId);
  } catch (error) {
    if (isMissingCustomer(error)) return;
    throw error;
  }
}
