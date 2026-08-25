// Brief 33 P0: NutriVision camera fail path.
//
// A failed snap must still let the user log the meal. Source-presence
// assertions lock the fail-state markup and wiring. Runtime mapping is
// covered in camera-capture.test.ts.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { NUTRIVISION_START_STREAM_TIMEOUT_MS } from '@/lib/nutrition/stateContract228';

const PREVIEW = path.join(process.cwd(), 'src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/WebCameraPreview.tsx');
const INDEX = path.join(process.cwd(), 'src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/index.tsx');
const CAPTURE = path.join(process.cwd(), 'src/lib/capacitor/camera-capture.ts');

function read(file: string): string {
  return readFileSync(file, 'utf8');
}

describe('Brief 33 camera fail-state markup', () => {
  const preview = read(PREVIEW);

  it('fail-state markup contains Upload a photo and Log manually as the two obvious actions', () => {
    expect(preview).toContain('data-camera-fail-actions="true"');
    const failBlockStart = preview.indexOf('data-camera-fail-actions');
    expect(failBlockStart).toBeGreaterThan(0);
    const failBlock = preview.slice(failBlockStart, preview.indexOf('</footer>'));
    const uploadAt = failBlock.indexOf('Upload a photo');
    const logAt = failBlock.indexOf('Log manually');
    const nativeAt = failBlock.indexOf('Use device camera');
    expect(uploadAt).toBeGreaterThan(0);
    expect(logAt).toBeGreaterThan(0);
    expect(uploadAt).toBeLessThan(logAt);
    expect(nativeAt).toBeGreaterThan(logAt);
    expect(failBlock).toContain('backgroundColor: TEAL');
    expect(failBlock).toContain("border: `1.5px solid ${TEAL}`");
  });

  it('Use device camera is optional and tertiary, never the only path', () => {
    expect(preview).toContain('onNativeFallback?: () => void');
    expect(preview).toContain('{onNativeFallback && (');
    expect(preview).toContain('tertiary retry only');
    const failBlock = preview.slice(preview.indexOf('data-camera-fail-actions'));
    const nativeStart = failBlock.indexOf('{onNativeFallback && (');
    const nativeEnd = failBlock.indexOf('Use device camera');
    const nativeBtn = failBlock.slice(nativeStart, nativeEnd);
    expect(nativeBtn).not.toContain('backgroundColor: TEAL');
    expect(nativeBtn).toContain('onNativeFallback &&');
  });

  it('Close is present on the fail modal and during initializing', () => {
    expect(preview).toContain('Starting camera...');
    const initBlock = preview.slice(
      preview.indexOf("state === 'initializing'"),
      preview.indexOf("state === 'permission_denied'"),
    );
    expect(initBlock).toContain('Close');
    expect(initBlock).toContain('handleCancel');
    const failBlock = preview.slice(preview.indexOf('data-camera-fail-actions'));
    expect(failBlock).toContain('Close');
  });

  it('never leaks raw DOMException.message or Requested device not found', () => {
    expect(preview).not.toContain('Requested device not found');
    expect(preview).not.toContain('err.message');
    expect(preview).toContain('CAMERA_UNAVAILABLE_USER_COPY');
    expect(preview).toContain('CAMERA_PERMISSION_USER_COPY');
    const capture = read(CAPTURE);
    expect(capture).toContain('userFacingCameraFailure');
    expect(capture).not.toMatch(/throw new CaptureUnsupportedError\(\s*err instanceof Error \? err\.message/);
  });

  it('fail modal times out starting_stream in about 3 seconds', () => {
    expect(NUTRIVISION_START_STREAM_TIMEOUT_MS).toBe(3000);
    expect(preview).toContain('START_STREAM_TIMEOUT_MS');
    expect(preview).toContain('NUTRIVISION_START_STREAM_TIMEOUT_MS');
    expect(preview).not.toContain('= 8000');
  });

  it('Voice stays off the fail modal', () => {
    const failBlock = preview.slice(preview.indexOf('data-camera-fail-actions'));
    expect(failBlock).not.toContain('Voice');
    expect(failBlock).not.toContain('<Mic');
    expect(preview).not.toMatch(/from 'lucide-react'[^;]*Mic/);
  });

  it('uses Lucide strokeWidth 1.5 and contains no TypeScript any or banned dashes', () => {
    expect(preview).toContain('strokeWidth={1.5}');
    expect(preview).not.toMatch(/:\s*any\b/);
    expect(preview).not.toContain('—');
    expect(preview).not.toContain('–');
  });
});

describe('Brief 33 parent wiring', () => {
  const index = read(INDEX);

  it('Upload a photo uses existing gallery onCapture with no capture attribute', () => {
    expect(index).toContain('handleWebCameraUploadPhoto');
    expect(index).toContain("onCapture('gallery')");
    expect(index).toContain('onUploadPhoto={handleWebCameraUploadPhoto}');
    expect(index).not.toMatch(/onCapture\('gallery'\).*capture/);
    const capture = read(CAPTURE);
    expect(capture).toContain('pickWebImageFile({ withCaptureAttribute: false })');
  });

  it('Log manually opens Log a Full Meal / MealCard without requiring a blob', () => {
    expect(index).toContain('handleWebCameraLogManually');
    expect(index).toContain("router.push('/nutrition/log-meal')");
    expect(index).toContain('onLogManually={handleWebCameraLogManually}');
    expect(index).toContain('No photo blob is required before capture');
  });

  it('Close returns to the photo-ai hub without navigating away', () => {
    expect(index).toContain('handleWebCameraCancel');
    const cancel = index.slice(
      index.indexOf('const handleWebCameraCancel'),
      index.indexOf('handleWebCameraUploadPhoto'),
    );
    expect(cancel).toContain('setShowWebCameraPreview(false)');
    expect(cancel).not.toContain('router.push');
    expect(cancel).not.toContain('router.replace');
  });

  it('Use device camera remains a tertiary retry, never the only fail CTA', () => {
    expect(index).toContain('onNativeFallback={handleWebCameraNativeFallback}');
    expect(index).toContain('tertiary retry only');
    expect(index).toContain('handleWebCameraUploadPhoto');
    expect(index).toContain('handleWebCameraLogManually');
  });
});
