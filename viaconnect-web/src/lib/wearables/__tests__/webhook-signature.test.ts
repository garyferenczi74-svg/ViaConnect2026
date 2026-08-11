import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import { validateWhoopWebhookSignature } from '../whoop/webhook-signature';

describe('WHOOP webhook signature', () => {
  it('accepts valid hmac base64 signature', () => {
    const secret = 'test_client_secret';
    const body = JSON.stringify({ type: 'sleep.updated', id: 'abc' });
    const sig = createHmac('sha256', secret).update(body).digest('base64');
    const headers = new Headers({ 'x-whoop-signature': sig });
    expect(validateWhoopWebhookSignature(body, headers, secret)).toBe(true);
  });

  it('rejects bad signature', () => {
    const headers = new Headers({ 'x-whoop-signature': 'nope' });
    expect(validateWhoopWebhookSignature('{}', headers, 'secret')).toBe(false);
  });

  it('rejects empty signature', () => {
    expect(validateWhoopWebhookSignature('{}', new Headers(), 'secret')).toBe(false);
  });
});
