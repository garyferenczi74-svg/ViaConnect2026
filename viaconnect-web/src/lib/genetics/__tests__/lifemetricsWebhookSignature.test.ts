/**
 * LifeMetrics webhook HMAC-SHA256 tests.
 * Fail closed on a bad or missing signature. Accept either documented header.
 * No genetics in fixtures. No em or en dashes.
 */

import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyLifemetricsWebhookSignature } from '../lifemetricsWebhookSignature';

const SECRET = 'test_lifemetrics_webhook_secret';
const BODY = JSON.stringify({ event_id: 'evt_test_1', event: 'genetics_result.uploaded' });

function signHex(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

function signBase64(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('base64');
}

describe('verifyLifemetricsWebhookSignature', () => {
  it('accepts a valid hex HMAC on X-LifeMetrics-Signature', () => {
    const headers = new Headers({
      'X-LifeMetrics-Signature': signHex(BODY, SECRET),
    });
    expect(verifyLifemetricsWebhookSignature(BODY, headers, SECRET)).toBe(true);
  });

  it('accepts a sha256= hex HMAC on X-Webhook-Signature', () => {
    const headers = new Headers({
      'X-Webhook-Signature': `sha256=${signHex(BODY, SECRET)}`,
    });
    expect(verifyLifemetricsWebhookSignature(BODY, headers, SECRET)).toBe(true);
  });

  it('accepts a valid base64 HMAC', () => {
    const headers = new Headers({
      'x-lifemetrics-signature': signBase64(BODY, SECRET),
    });
    expect(verifyLifemetricsWebhookSignature(BODY, headers, SECRET)).toBe(true);
  });

  it('accepts either header when both appear and one is valid', () => {
    const headers = new Headers({
      'X-LifeMetrics-Signature': 'not-a-real-signature',
      'X-Webhook-Signature': signHex(BODY, SECRET),
    });
    expect(verifyLifemetricsWebhookSignature(BODY, headers, SECRET)).toBe(true);
  });

  it('rejects a bad HMAC', () => {
    const headers = new Headers({
      'X-LifeMetrics-Signature': 'deadbeef',
    });
    expect(verifyLifemetricsWebhookSignature(BODY, headers, SECRET)).toBe(false);
  });

  it('rejects a valid HMAC computed with the wrong secret', () => {
    const headers = new Headers({
      'X-LifeMetrics-Signature': signHex(BODY, 'other-secret'),
    });
    expect(verifyLifemetricsWebhookSignature(BODY, headers, SECRET)).toBe(false);
  });

  it('fails closed when the signature header is missing', () => {
    expect(verifyLifemetricsWebhookSignature(BODY, new Headers(), SECRET)).toBe(false);
  });

  it('fails closed when the webhook secret is empty', () => {
    const headers = new Headers({
      'X-LifeMetrics-Signature': signHex(BODY, SECRET),
    });
    expect(verifyLifemetricsWebhookSignature(BODY, headers, '')).toBe(false);
  });
});
