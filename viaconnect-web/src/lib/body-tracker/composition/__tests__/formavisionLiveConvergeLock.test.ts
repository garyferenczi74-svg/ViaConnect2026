/**
 * Arnold converge lock: live camera finalize MUST share the upload analyzer.
 * This suite fails if live DONE becomes "Analysis coming soon", if
 * ScanExperience drops the dedicated helper, or if upload is removed.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('FormaVision live converge lock (REQUIRED)', () => {
  const scanExp = src('src/components/scan/ScanExperience.tsx');
  const helper = src('src/lib/body-tracker/composition/convergeLiveScanToFormaVisionSpine.ts');
  const shared = src('src/lib/body-tracker/composition/runFormaVisionAnalyze.ts');
  const uploader = src('src/components/body-tracker/BodyScanUploader.tsx');
  const page = src('src/app/(app)/(consumer)/body-tracker/formavision/page.tsx');
  const scanIdPage = src('src/app/(app)/(consumer)/body-tracker/formavision/scan/[id]/page.tsx');
  const persist = src('src/lib/body-tracker/composition/buildScanWrite.ts');

  it('ScanExperience post-submit goes through the dedicated live converge helper', () => {
    expect(scanExp).toMatch(/convergeLiveScanToFormaVisionSpine/);
    expect(scanExp).toMatch(/from '@\/lib\/body-tracker\/composition\/convergeLiveScanToFormaVisionSpine'/);
    expect(scanExp).toMatch(/submitResult\.ok && submitResult\.sessionId/);
    expect(scanExp).toMatch(/convergeLiveScanToFormaVisionSpine\(\{/);
    expect(scanExp).not.toMatch(/from '@\/lib\/body-tracker\/composition\/runFormaVisionAnalyze'/);
    expect(scanExp).not.toMatch(/runFormaVisionAnalyzeSpine\(/);
  });

  it('live DONE and scan/[id] are not "Analysis coming soon" dead-ends', () => {
    expect(scanExp).not.toMatch(/Analysis coming soon/i);
    expect(scanIdPage).not.toMatch(/Analysis coming soon/i);
    expect(scanIdPage).toMatch(/redirect\(FORMAVISION_PATH\)/);
    expect(scanExp).toMatch(/formavisionAfterScanHref/);
    expect(scanExp).toMatch(/compositionPhase === 'ok'/);
    expect(scanExp).toMatch(/scan-done-retry-composition/);
    expect(scanExp).toMatch(/analyzeLiveFramesOnFormaVisionSpine/);
  });

  it('one analyzer, two inputs — upload stays; persist is scan / FormaVision', () => {
    expect(page).toMatch(/BodyScanUploader/);
    expect(page).toMatch(/formavisionLiveScanHref/);
    expect(scanExp).toMatch(/BodyScanUploader/);
    expect(scanExp).toMatch(/scan-setup-mode/);
    expect(scanExp).toMatch(/Upload images/);
    expect(uploader).toMatch(/runFormaVisionAnalyzeSpine/);
    expect(uploader).toMatch(/source:\s*'upload'/);
    expect(helper).toMatch(/runFormaVisionAnalyzeSpine/);
    expect(helper).toMatch(/source:\s*'live'/);
    expect(helper).toMatch(/liveFramesToFormaVisionPhotos/);
    expect(shared).toMatch(/body-scan-analyze/);
    expect(shared).toMatch(/persistScanFn/);
    expect(shared).not.toMatch(/navyBodyFat/);
    expect(shared).not.toMatch(/arnold-vision-analyze/);
    expect(persist).toMatch(/device_name:\s*'FormaVision'/);
    expect(persist).toMatch(/source:\s*'scan'/);
  });

  it('upload inverted gallery fixtures are auto-uprighted before the shared analyzer', () => {
    const normalize = src('src/lib/body-tracker/composition/normalizeScanPhotoOrientation.ts');
    const golden = src('src/lib/body-tracker/composition/goldenUploadFixtures.ts');
    expect(normalize).toMatch(/detectAPoseInversionFromBandLuma/);
    expect(normalize).toMatch(/imageOrientation:\s*'none'/);
    expect(golden).toMatch(/01-front\.jpg/);
    expect(golden).toMatch(/02-right\.jpg/);
    expect(golden).toMatch(/03-back\.jpg/);
    expect(golden).toMatch(/04-left\.jpg/);
    expect(golden).toMatch(/FORMAVISION_GOLDEN_UPRIGHT_DIR/);
    expect(golden).toMatch(/upload-test-2026-09-01\/upright/);
    expect(uploader).toMatch(/normalizeScanPhotoUpright\(stored, 'upload'\)/);
  });
});
