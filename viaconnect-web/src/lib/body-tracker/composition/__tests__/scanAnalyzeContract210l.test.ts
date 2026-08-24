/**
 * Prompt 210l: source-level contracts for the FormaVision analyze path.
 * Verifies code — does not invent a production root cause.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ANALYZE_CLIENT_TIMEOUT_MS } from '../scanMediaTypes';
import { SCAN_PERSIST_CLIENT_TIMEOUT_MS } from '../persistScanClient';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Prompt 210l analyze-chain source contracts', () => {
  it('client analyze budget is at least the 60s vision timeout', () => {
    expect(ANALYZE_CLIENT_TIMEOUT_MS).toBeGreaterThanOrEqual(60_000);
    expect(SCAN_PERSIST_CLIENT_TIMEOUT_MS).toBeGreaterThanOrEqual(30_000);
  });

  it('BodyScanUploader does not default PNG to image/jpeg or race-abort under 60s', () => {
    const src = read('src/components/body-tracker/BodyScanUploader.tsx');
    expect(src).not.toMatch(/startsWith\('image\/png'\) \? 'image\/png' : 'image\/jpeg'/);
    expect(src).toMatch(/buildAnalyzeRequestMediaFields/);
    expect(src).toMatch(/ANALYZE_CLIENT_TIMEOUT_MS/);
    expect(src).toMatch(/body-scan-progress/);
    expect(src).not.toMatch(/Promise\.race/);
    expect(src).toMatch(/setError\(e instanceof Error \? e\.message/);
  });

  it('body-scan-analyze writes photo_scans plus the linked spine and logs key presence', () => {
    const src = read('supabase/functions/body-scan-analyze/index.ts');
    expect(src).toMatch(/body_tracker_photo_scans/);
    expect(src).toMatch(/body_tracker_entries/);
    expect(src).toMatch(/body_tracker_segmental_fat/);
    expect(src).toMatch(/body_tracker_weight/);
    expect(src).toMatch(/anthropic_key_present/);
    expect(src).toMatch(/anthropic_preview/);
    expect(src).toMatch(/invalid vision model/);
    expect(src).toMatch(/media_types/);
    expect(src).not.toMatch(/mediaType = body\.media_type \?\? 'image\/jpeg'/);
    expect(src).toMatch(/Never reference Semaglutide/);
    expect(src).toMatch(/10x to 28x/);
    expect(src).not.toMatch(/from ['"].*arnold-vision-analyze/);
  });

  it('FormaVision tab hosts the four-photo scan panel', () => {
    const src = read('src/app/(app)/(consumer)/body-tracker/formavision/page.tsx');
    expect(src).toMatch(/formavision-scan-panel/);
    expect(src).toMatch(/BodyScanUploader/);
    expect(src).toMatch(/isJourneyCompositionPoint/);
  });

  it('heatmap omits UNKNOWN segments instead of painting No Change yellow', () => {
    const colors = read('src/lib/body-tracker/heatmap-colors.ts');
    expect(colors).toMatch(/ovalStatusesFromExistingChange/);
    const composition = read('src/app/(app)/(consumer)/body-tracker/composition/page.tsx');
    expect(composition).toMatch(/ovalStatusesFromExistingChange/);
    expect(composition).not.toMatch(/getOvalColorFromChange\(fatChange\.data/);
  });
});
