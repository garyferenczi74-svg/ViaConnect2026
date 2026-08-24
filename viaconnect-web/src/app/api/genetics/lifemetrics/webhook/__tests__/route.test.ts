/**
 * Source guards for POST /api/genetics/lifemetrics/webhook.
 * Behavior tests live on the Next-free handler.
 * No em or en dashes.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('webhook route source guards', () => {
  const source = readFileSync(path.resolve(__dirname, '..', 'route.ts'), 'utf8');

  it('documents how to set the webhook URL once keys exist', () => {
    expect(source).toContain('https://www.viaconnectapp.com/api/genetics/lifemetrics/webhook');
    expect(source).toContain('farmceutica-wellness.labs.y0urbrand.com/admin/tenants/355');
    expect(source).toContain('LIFEMETRICS_WEBHOOK_SECRET');
  });

  it('delegates to the signed handler and does not log genetics fields', () => {
    expect(source).toContain("import { handleLifemetricsWebhook } from '@/lib/genetics/lifemetricsWebhookHandler'");
    expect(source).not.toContain('rsid');
    expect(source).not.toContain('genotype');
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });

  it('never mentions a hardcoded destination member', () => {
    expect(source.toLowerCase()).not.toContain('gary');
  });

  it('leaves the GeneMetrics outbound poll in place', () => {
    const genemetrics = readFileSync(
      path.resolve(__dirname, '../../../../genex/genemetrics/route.ts'),
      'utf8',
    );
    expect(genemetrics).toContain('action === "check"');
    expect(genemetrics).toContain('action === "import"');
  });
});
