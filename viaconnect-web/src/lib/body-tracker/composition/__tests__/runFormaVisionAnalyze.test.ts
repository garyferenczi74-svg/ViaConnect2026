import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { presentPhotoPositions } from '../runFormaVisionAnalyze';
import type { FormaVisionPhotoMap } from '../runFormaVisionAnalyze';

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const dummy = { file: new File([new Uint8Array([1])], 'x.jpg', { type: 'image/jpeg' }), base64: 'abc' };

describe('runFormaVisionAnalyze shared spine', () => {
  it('skips missing views and does not invent slots', () => {
    const photos: FormaVisionPhotoMap = { front: dummy, back: dummy };
    expect(presentPhotoPositions(photos)).toEqual(['front', 'back']);
    expect(presentPhotoPositions({})).toEqual([]);
  });

  it('is the single analyzer for upload and live post-submit', () => {
    const uploader = src('src/components/body-tracker/BodyScanUploader.tsx');
    const live = src('src/components/scan/ScanExperience.tsx');
    const helper = src('src/lib/body-tracker/composition/convergeLiveScanToFormaVisionSpine.ts');
    const shared = src('src/lib/body-tracker/composition/runFormaVisionAnalyze.ts');
    expect(uploader).toMatch(/runFormaVisionAnalyzeSpine/);
    expect(uploader).toMatch(/normalizeScanPhotoUpright/);
    expect(uploader).toMatch(/source:\s*'upload'/);
    expect(live).toMatch(/convergeLiveScanToFormaVisionSpine/);
    expect(live).not.toMatch(/runFormaVisionAnalyzeSpine\(/);
    expect(helper).toMatch(/liveFramesToFormaVisionPhotos/);
    expect(helper).toMatch(/source:\s*'live'/);
    expect(helper).toMatch(/runFormaVisionAnalyzeSpine/);
    expect(shared).toMatch(/body-scan-analyze/);
    expect(shared).toMatch(/sanitizeAnalyzeUserError/);
    expect(shared).toMatch(/persistScanFn/);
    expect(shared).toMatch(/normalizeScanPhotoUpright/);
    expect(shared).not.toMatch(/navyBodyFat/);
    expect(shared).not.toMatch(/arnold-vision-analyze/);
  });

  it('does not orphan the 209/210l persist + 3D avatar route', () => {
    const page = src('src/app/(app)/(consumer)/body-tracker/formavision/page.tsx');
    const persist = src('src/lib/body-tracker/composition/buildScanWrite.ts');
    const avatar = src('src/components/formavision/FormaVision3DAvatar.tsx');
    expect(page).toMatch(/BodyScanUploader/);
    expect(page).toMatch(/scanToParamVector/);
    expect(page).toMatch(/BodyCompositionAvatar/);
    expect(page).toMatch(/formavisionLiveScanHref/);
    expect(persist).toMatch(/device_name:\s*'FormaVision'/);
    expect(persist).toMatch(/source:\s*'scan'/);
    expect(persist).toMatch(/scan_id:\s*null/);
    expect(avatar).toMatch(/scanToParamVector/);
  });
});
