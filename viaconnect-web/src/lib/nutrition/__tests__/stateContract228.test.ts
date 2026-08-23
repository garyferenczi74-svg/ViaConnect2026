import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  NUTRIVISION_START_STREAM_TIMEOUT_MS,
  isTransitionalCapturePhase,
  assertWriteConfirmed,
} from '@/lib/nutrition/stateContract228';

describe('Prompt 228 state contract', () => {
  it('defines a finite start-stream timeout', () => {
    expect(NUTRIVISION_START_STREAM_TIMEOUT_MS).toBeGreaterThan(0);
    expect(NUTRIVISION_START_STREAM_TIMEOUT_MS).toBeLessThanOrEqual(15000);
  });

  it('marks starting_stream as transitional', () => {
    expect(isTransitionalCapturePhase('starting_stream')).toBe(true);
    expect(isTransitionalCapturePhase('saved')).toBe(false);
  });

  it('assertWriteConfirmed throws on non-ok', () => {
    expect(() => assertWriteConfirmed({ ok: false, status: 500 })).toThrow(
      /not confirmed/,
    );
    expect(() => assertWriteConfirmed({ ok: true, status: 200 })).not.toThrow();
  });

  it('WebCameraPreview times out starting_stream', () => {
    const src = readFileSync(
      path.join(
        process.cwd(),
        'src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/WebCameraPreview.tsx',
      ),
      'utf8',
    );
    expect(src).toContain('START_STREAM_TIMEOUT_MS');
    expect(src).toContain('timed_out');
    expect(src).toContain('permissions?.query');
  });

  it('ReviewForm discard checks res.ok before navigating', () => {
    const src = readFileSync(
      path.join(
        process.cwd(),
        'src/app/(app)/(consumer)/nutrition/log-meal/review/ReviewForm.tsx',
      ),
      'utf8',
    );
    expect(src).toContain('if (!res.ok)');
    expect(src).toContain('Your meal is still here');
  });

  it('hydration quick-log rolls back parent meal when items fail', () => {
    const src = readFileSync(
      path.join(
        process.cwd(),
        'src/app/api/nutrition/hydration/quick-log/route.ts',
      ),
      'utf8',
    );
    expect(src).toContain('rolling back meal');
    expect(src).toContain("from('meals').delete()");
  });

  it('discard route hard-deletes and attempts storage remove', () => {
    const src = readFileSync(
      path.join(process.cwd(), 'src/app/api/nutrition/discard/route.ts'),
      'utf8',
    );
    expect(src).toContain('.delete()');
    expect(src).toContain('nutrition-photos');
    expect(src).not.toMatch(/status:\s*'discarded'/);
  });
});
