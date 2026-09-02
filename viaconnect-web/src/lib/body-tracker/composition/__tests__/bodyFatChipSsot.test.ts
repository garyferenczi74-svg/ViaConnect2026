import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Body-fat chip SSOT after a FormaVision scan', () => {
  it('hub chip reads segmental_fat (scan write) and skips placeholder weight rows', () => {
    const hub = src('src/components/body-tracker/hub/useHubMetrics.ts');
    expect(hub).toMatch(/body_tracker_segmental_fat/);
    expect(hub).toMatch(/total_body_fat_pct/);
    expect(hub).toMatch(/resolveLatestBodyFat/);
    expect(hub).toMatch(/not\('weight_lbs',\s*'is',\s*null\)/);
  });

  it('dashboard Body Composition tile reads the same segmental fat source', () => {
    const dash = src('src/components/body-tracker/dashboard/DashboardBento.tsx');
    expect(dash).toMatch(/body_tracker_segmental_fat/);
    expect(dash).toMatch(/total_body_fat_pct/);
    expect(dash).toMatch(/resolveLatestBodyFat/);
    expect(dash).toMatch(/not\('weight_lbs',\s*'is',\s*null\)/);
  });

  it('FormaVision refreshes composition, circumference, and scan history after persist-ok Analyze', () => {
    const page = src('src/app/(app)/(consumer)/body-tracker/formavision/page.tsx');
    const uploader = src('src/components/body-tracker/BodyScanUploader.tsx');
    expect(page).toMatch(/refresh:\s*refreshCirc/);
    expect(page).toMatch(/refreshCirc\(\)/);
    expect(page).toMatch(/composHistory\.refresh\(\)/);
    expect(page).toMatch(/circHistory\.refresh\(\)/);
    expect(page).toMatch(/setScanHistoryKey/);
    expect(page).toMatch(/snapshotFromScanResult/);
    expect(page).toMatch(/estimateCircumferencesFromComposition/);
    expect(page).toMatch(/resolveAvatarCircumferences/);
    expect(page).toMatch(/historySnapshot:\s*composHistory\.latest/);
    expect(page).toMatch(/refreshKey=\{scanHistoryKey\}/);
    expect(uploader).toMatch(/if \(!persistRes\.ok\)/);
    expect(uploader).toMatch(/return;/);
    expect(uploader).toMatch(/onComplete\(spine\.result\)/);
  });

  it('uploader awaits the circumference write before onComplete', () => {
    const uploader = src('src/components/body-tracker/BodyScanUploader.tsx');
    expect(uploader).toMatch(/await circWritePromiseRef\.current/);
  });
});
