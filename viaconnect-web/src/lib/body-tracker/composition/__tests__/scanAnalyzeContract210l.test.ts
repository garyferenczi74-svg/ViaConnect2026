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
    expect(src).toMatch(/sanitizeAnalyzeUserError\(e instanceof Error \? e\.message/);
    expect(src).toMatch(/from '@\/lib\/body-tracker\/composition\/visionModel'/);
    expect(src).toMatch(/takeScanSlotFile/);
    expect(src).toMatch(/SCAN_SLOT_ACCEPT/);
    expect(src).toMatch(/scan-slot-preview-/);
    expect(src).not.toMatch(/accept="image\/jpeg,image\/png,image\/webp"/);
    expect(src).not.toMatch(/MAX_PHOTO_BYTES = 5_000_000/);
  });

  it('body-scan-analyze writes photo_scans plus the linked spine and logs key presence', () => {
    const src = read('supabase/functions/body-scan-analyze/index.ts');
    expect(src).toMatch(/body_tracker_photo_scans/);
    expect(src).toMatch(/body_tracker_entries/);
    expect(src).toMatch(/body_tracker_segmental_fat/);
    expect(src).toMatch(/body_tracker_weight/);
    expect(src).toMatch(/anthropic_key_present/);
    expect(src).toMatch(/anthropic_preview/);
    expect(src).toMatch(/VISION_MODEL_CONFIG_USER_ERROR/);
    expect(src).toMatch(/resolveVisionModel/);
    expect(src).not.toMatch(/invalid vision model: \$\{VISION_MODEL\}/);
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
    expect(src).toMatch(/FormaVisionScanModeBar/);
    expect(src).toMatch(/Upload saved images/);
    expect(src).toMatch(/formavisionLiveScanHref/);
    expect(src).toMatch(/scanToParamVector/);
    expect(src).toMatch(/BodyCompositionAvatar/);
    expect(src).toMatch(/const \[scanOpen, setScanOpen\] = useState\(true\)/);
    expect(src).toMatch(/formavision-open-scan/);
    expect(src).toMatch(/Scan My Body/);
  });

  it('FRBL upload slots are portrait frames, not landscape strips', () => {
    const src = read('src/components/body-tracker/BodyScanUploader.tsx');
    expect(src).toMatch(/aspect-\[3\/4\]/);
    expect(src).toMatch(/object-cover object-center/);
    expect(src).toMatch(/scan-slot-frame-/);
    expect(src).toMatch(/grid-cols-2 gap-3 sm:grid-cols-4/);
    expect(src).not.toMatch(/flex h-32 cursor-pointer/);
    expect(src).not.toMatch(/aspect-video/);
    expect(src).not.toMatch(/aspect-\[16\/9\]/);
  });

  it('FRBL upload slots use one label and an opacity-0 inset overlay input (no capture, no sr-only, no hidden)', () => {
    const src = read('src/components/body-tracker/BodyScanUploader.tsx');
    expect(src).toMatch(/scan-\$\{pos\.key\}-upload/);
    expect(src).toMatch(/SCAN_SLOT_FILE_INPUT_CLASS/);
    expect(src).toMatch(/scan-slot-input-/);
    expect(src).toMatch(/scan-slot-upload-/);
    expect(src).toMatch(/type="file"/);
    expect(src).toMatch(/accept=\{SCAN_SLOT_ACCEPT\}/);
    expect(src).toMatch(/takeScanSlotFile/);
    expect(src).not.toMatch(/capture=["']environment["']/);
    expect(src).not.toMatch(/className="hidden"/);
    expect(src).not.toMatch(/className="sr-only"/);
    expect(src).not.toMatch(/h-px w-px/);
    expect(src).not.toMatch(/cameraRefs/);
    expect(src).not.toMatch(/galleryRefs/);
    expect(src).toMatch(/sanitizeAnalyzeUserError/);
    const htmlForHits = src.match(/htmlFor=\{inputId\}/g) ?? [];
    expect(htmlForHits.length).toBeLessThanOrEqual(1);
    expect((src.match(/<label/g) ?? []).length).toBe(1);
  });

  it('slot preview uses the post-normalize ObjectURL only (Attaching until bake)', () => {
    const uploader = read('src/components/body-tracker/BodyScanUploader.tsx');
    expect(uploader).toMatch(/normalizeScanPhotoUpright\(stored, 'upload'\)/);
    expect(uploader).toMatch(/URL\.createObjectURL\(stored\)/);
    expect(uploader).not.toMatch(/URL\.createObjectURL\(file\)/);
    expect(uploader).toMatch(/previewUrl:\s*null/);
    expect(uploader).toMatch(/\{filled \? 'Captured' : 'Attaching'\}/);
    expect(uploader).toMatch(/alreadyNormalized:\s*true/);
    const processPhoto = read('src/components/body-tracker/photos/photoProcessing.ts');
    expect(processPhoto).toMatch(/createScanPhotoBitmap/);
    expect(processPhoto).not.toMatch(/createImageBitmap\(file\)/);
  });

  it('upload path uprights inverted gallery shots before analyze', () => {
    const uploader = read('src/components/body-tracker/BodyScanUploader.tsx');
    expect(uploader).toMatch(/normalizeScanPhotoUpright/);
    expect(uploader).toMatch(/FORMAVISION_SLOT_ORDER/);
    expect(uploader).toMatch(/anyFilled/);
    const edge = read('supabase/functions/body-scan-analyze/index.ts');
    expect(edge).toMatch(/at least one photo required/);
    expect(edge).not.toMatch(/all 4 photos required/);
    expect(edge).toMatch(/Skip missing views/);
  });

  it('heatmap omits UNKNOWN segments instead of painting No Change yellow', () => {
    const colors = read('src/lib/body-tracker/heatmap-colors.ts');
    expect(colors).toMatch(/ovalStatusesFromExistingChange/);
    const composition = read('src/app/(app)/(consumer)/body-tracker/composition/page.tsx');
    expect(composition).toMatch(/ovalStatusesFromExistingChange/);
    expect(composition).not.toMatch(/getOvalColorFromChange\(fatChange\.data/);
  });
});
