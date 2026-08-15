/**
 * Prompt 219b: product photo capture flow contracts.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('Prompt 219b supplement label photo flow', () => {
  it('has private label-photo upload API and client helper', () => {
    const route = join(
      root,
      'src/app/api/supplements/label-photo/upload/route.ts',
    );
    const helper = join(
      root,
      'src/lib/caq/supplement-photo/uploadLabelPhoto.ts',
    );
    expect(existsSync(route)).toBe(true);
    expect(existsSync(helper)).toBe(true);
    const src = readFileSync(route, 'utf8');
    expect(src).toMatch(/user-supplement-label-photos/);
    expect(src).toMatch(/createSignedUrl/);
    expect(src).toMatch(/retryable/);
    expect(src).toMatch(/UPLOAD_TIMEOUT|timeout/i);
    // Never log base64 image content
    expect(src).not.toMatch(/imageBase64|base64\.slice/);
  });

  it('migration creates private bucket and path columns', () => {
    const mig = join(
      root,
      'supabase/migrations/20260815120000_prompt_219b_user_supplement_label_photos.sql',
    );
    expect(existsSync(mig)).toBe(true);
    const sql = readFileSync(mig, 'utf8');
    expect(sql).toMatch(/user-supplement-label-photos/);
    expect(sql).toMatch(/public\s*=\s*false|public\)\s*VALUES[^;]*false/i);
    expect(sql).toMatch(/label_photo_path/);
    expect(sql).toMatch(/auth\.uid/);
  });

  it('SupplementPhotoUpload has camera, gallery, drag-drop, and failure states', () => {
    const src = readFileSync(
      join(root, 'src/components/caq/phase6/SupplementPhotoUpload.tsx'),
      'utf8',
    );
    expect(src).toMatch(/Add a photo of your product/);
    expect(src).toMatch(/Tap to take a picture of the front label/);
    expect(src).toMatch(/capture="environment"/);
    expect(src).toMatch(/label-photo-gallery|Choose from gallery/);
    expect(src).toMatch(/onDrop|drag and drop/i);
    expect(src).toMatch(/upload_retry/);
    expect(src).toMatch(/We could not read this label/);
    expect(src).toMatch(/Enter manually/);
    expect(src).toMatch(/uploadLabelPhoto/);
    expect(src).toMatch(/2000/);
    // No verbose client console of image payloads
    expect(src).not.toMatch(/console\.info\('\[caq\.photo-upload\]/);
  });

  it('confirm draft does not fabricate dose unit when amount missing', () => {
    const src = readFileSync(
      join(root, 'src/components/caq/phase6/SupplementPhotoUpload.tsx'),
      'utf8',
    );
    expect(src).toMatch(/UNKNOWN discipline|unknown amount|Blank when/i);
    // unit only when dosage present
    expect(src).toMatch(/dosage && primary\?\.unit/);
  });

  it('BarcodeConfirmRecord carries label photo path and empty unit option', () => {
    const src = readFileSync(
      join(root, 'src/components/caq/phase6/SupplementBarcodeConfirm.tsx'),
      'utf8',
    );
    expect(src).toMatch(/label_photo_path/);
    expect(src).toMatch(/label_photo_bucket/);
    expect(src).toMatch(/<option value="">Unit<\/option>/);
    expect(src).toMatch(/never invent a dose/i);
  });

  it('persist path stores label photo when present', () => {
    const src = readFileSync(
      join(
        root,
        'src/app/(app)/(consumer)/supplements/SupplementsPageContent.tsx',
      ),
      'utf8',
    );
    expect(src).toMatch(/label_photo_path/);
    expect(src).toMatch(/label_photo_bucket/);
  });
});
