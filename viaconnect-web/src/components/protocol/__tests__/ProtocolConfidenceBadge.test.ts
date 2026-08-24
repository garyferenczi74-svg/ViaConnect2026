import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const BADGE = path.resolve(__dirname, '..', 'ProtocolConfidenceBadge.tsx');
const SUPPLEMENTS = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'app',
  '(app)',
  '(consumer)',
  'supplements',
  'SupplementsPageContent.tsx',
);

describe('ProtocolConfidenceBadge genetics-uploaded flag', () => {
  const source = readFileSync(BADGE, 'utf-8');
  const supplements = readFileSync(SUPPLEMENTS, 'utf-8');

  it('hides GENEX360 missing copy when geneticsUploaded is true', () => {
    expect(source).toContain('geneticsUploaded');
    expect(source).toContain('/genex360|genetic/i');
  });

  it('is wired from the supplements page flag', () => {
    expect(supplements).toContain('geneticsUploaded={geneticsUploaded}');
    expect(supplements).toContain('RecommendedProtocolPanel');
  });
});
