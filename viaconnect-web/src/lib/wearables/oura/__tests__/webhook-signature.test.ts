import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import { validateOuraWebhookSignature } from '../webhook-signature';

describe('Oura webhook signature', () => {
  it('accepts a valid hmac hex signature', () => {
    const secret = 'test_oura_secret';
    const body = JSON.stringify({ data_type: 'daily_sleep', object_id: 'abc' });
    const sig = createHmac('sha256', secret).update(body).digest('hex');
    const headers = new Headers({ 'x-oura-signature': sig });
    expect(validateOuraWebhookSignature(body, headers, secret)).toBe(true);
  });

  it('rejects a bad signature', () => {
    const headers = new Headers({ 'x-oura-signature': 'nope' });
    expect(validateOuraWebhookSignature('{}', headers, 'secret')).toBe(false);
  });
});
