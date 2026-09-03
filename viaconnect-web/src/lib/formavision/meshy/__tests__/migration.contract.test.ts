import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

describe('formavision meshy_visual migration', () => {
  const dir = join(process.cwd(), 'supabase/migrations');
  const file = readdirSync(dir).find((f) => f.endsWith('_formavision_meshy_visual.sql'));

  it('uses a real timestamped filename, not pending', () => {
    expect(file).toBeDefined();
    expect(file).toMatch(/^20260903200000_formavision_meshy_visual\.sql$/);
  });

  it('adds only meshy_visual jsonb and forbids measurements in the comment', () => {
    const sql = readFileSync(join(dir, file ?? ''), 'utf8');
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS meshy_visual jsonb/i);
    expect(sql.toLowerCase()).toContain('never measurements');
    expect(sql).not.toMatch(/CREATE TABLE/i);
    expect(sql).not.toMatch(/ADD COLUMN IF NOT EXISTS (waist|body_fat|girth)/i);
  });
});
