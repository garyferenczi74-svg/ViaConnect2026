// Tests for src/lib/scoring/sources/labs-source.ts.
//
// Labs has no backing table in the live schema (see phase_b_preflight.md
// §Labs source). The helper returns a hardcoded empty shape, no Supabase
// call.

import { describe, it, expect, vi } from 'vitest';
import { getLabsSource } from '../../sources/labs-source';

describe('labs-source', () => {
  it('returns the hardcoded empty shape', async () => {
    const client = { from: vi.fn() };
    const result = await getLabsSource('u-1', client as never);
    expect(result.present).toBe(false);
    expect(result.uploaded_at).toBeNull();
    expect(result.panel_count).toBe(0);
  });

  it('does NOT issue any Supabase query', async () => {
    const fromSpy = vi.fn();
    const client = { from: fromSpy };
    await getLabsSource('u-1', client as never);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('returns identical shape regardless of userId', async () => {
    const client = { from: vi.fn() };
    const r1 = await getLabsSource('u-1', client as never);
    const r2 = await getLabsSource('u-2', client as never);
    expect(r1).toEqual(r2);
  });
});
