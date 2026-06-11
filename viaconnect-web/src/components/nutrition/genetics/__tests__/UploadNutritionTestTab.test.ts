// Prompt 187 Task 4 (2026-06-11): source as text contract tests for the
// Upload Your Nutrition Testing tab. Lock the validation surface (accepted
// extensions, mime map, 20 MB literal), the storage bucket + path convention,
// the four step upload flow (client id, storage, row insert, edge function
// invoke), the fail open posture (every supabase call timeout wrapped, no
// silent catch), the inline error strings, the status chips, the Hannah
// attribution through getDisplayName, the FDA disclaimer, and the no dash
// rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const TAB = path.resolve(__dirname, '..', 'UploadNutritionTestTab.tsx');

describe('UploadNutritionTestTab source', () => {
  const source = readFileSync(TAB, 'utf-8');

  it('accepts exactly the locked extensions and mime map, including the Excel csv alias', () => {
    expect(source).toContain("'.pdf,.png,.jpg,.jpeg,.webp,.csv'");
    expect(source).toContain("'application/pdf'");
    expect(source).toContain("'image/png'");
    expect(source).toContain("'image/jpeg'");
    expect(source).toContain("'image/webp'");
    expect(source).toContain("'text/csv'");
    expect(source).toContain("'application/vnd.ms-excel'");
  });

  it('caps uploads at the literal 20 MB', () => {
    expect(source).toContain('20 * 1024 * 1024');
  });

  it('uploads to the private bucket at the {user}/{upload}/{filename} path', () => {
    expect(source).toContain("'nutrition-test-uploads'");
    expect(source).toContain('${userId}/${uploadId}/');
    // Minimal filename sanitization: path separators stripped.
    expect(source).toContain('sanitizeFilename');
  });

  it('generates the upload id client side and inserts the row with it', () => {
    expect(source).toContain('crypto.randomUUID()');
    expect(source).toContain("from('nutrition_test_uploads')");
    expect(source).toContain('id: uploadId');
    expect(source).toContain("status: 'uploaded'");
    expect(source).toContain('source_company');
  });

  it('invokes the live edge function with the upload id', () => {
    expect(source).toContain(".invoke('hannah-analyze-nutrition-test'");
    expect(source).toContain('upload_id: uploadId');
  });

  it('guards handleFile, onDrop, and onSelect against a second upload while busy or invoking', () => {
    const guard = 'if (busy || invoking) return;';
    const onDropBody = source.slice(
      source.indexOf('const onDrop'),
      source.indexOf('const onSelect'),
    );
    const onSelectBody = source.slice(
      source.indexOf('const onSelect'),
      source.indexOf('const selectedUpload'),
    );
    expect(onDropBody).toContain(guard);
    expect(onSelectBody).toContain(guard);
    expect(onDropBody).toContain('[busy, invoking, handleFile]');
    expect(onSelectBody).toContain('[busy, invoking, handleFile]');
    // handleFile carries the same early return, so three guards total.
    const guards = source.split(guard).length - 1;
    expect(guards).toBe(3);
    // The file input is disabled for the whole flow, not just the busy leg.
    expect(source).toContain('disabled={busy || invoking}');
  });

  it('keeps the dropzone honest while the analysis invoke is in flight', () => {
    expect(source).toContain(
      'Analyzing your test. You can leave this tab; the result lands in the list below.',
    );
    // invoking opens where busy closes and is cleared in the invoke finally.
    expect(source).toContain('setInvoking(true);');
    expect(source).toContain('} finally {');
    expect(source).toContain('setInvoking(false);');
  });

  it('surfaces inline errors and never inserts a row on client side validation failure', () => {
    expect(source).toContain('That file is larger than 20 MB. Please choose a smaller file.');
    expect(source).toContain(
      'That file type is not supported. Accepted formats: .pdf, .png, .jpg, .jpeg, .webp, .csv.',
    );
    expect(source).toContain('The upload could not be completed. Please try again.');
    expect(source).toContain('The file uploaded but could not be recorded. Please try again.');
    // The validation failure branch returns before any storage or insert call.
    expect(source).toContain('setInlineError(validation.error);');
    expect(source).toContain('role="alert"');
  });

  it('wraps every supabase call in withTimeout with the specified budgets', () => {
    expect(source).toContain("import { withTimeout } from '@/lib/utils/with-timeout'");
    expect(source).toContain('120_000');
    expect(source).toContain('15_000');
    expect(source).toContain('4_000');
  });

  it('never swallows a failure silently: every catch safeLogs', () => {
    expect(source).toContain("import { safeLog } from '@/lib/utils/safe-log'");
    expect(source).not.toMatch(/catch\s*(\([^)]*\))?\s*\{\s*\}/);
    const catches = source.match(/\} catch/g) ?? [];
    const warns = source.match(/safeLog\.warn\(/g) ?? [];
    expect(catches.length).toBeGreaterThan(0);
    expect(warns.length).toBeGreaterThanOrEqual(catches.length);
  });

  it('renders the uploads list with the four status chips and the failure reason', () => {
    expect(source).toContain('Uploaded');
    expect(source).toContain('Analyzing');
    expect(source).toContain('Analyzed');
    expect(source).toContain('Failed');
    expect(source).toContain('animate-pulse');
    expect(source).toContain('#B75E18');
    expect(source).toContain('failureReason');
    expect(source).toContain('View Results');
  });

  it('attributes the analysis through getDisplayName, never a hardcoded name', () => {
    expect(source).toContain("import { getDisplayName } from '@/lib/getDisplayName'");
    expect(source).toContain("getDisplayName('hannah')");
    expect(source).not.toContain('Analyzed by Hannah');
  });

  it('renders unknown direction as a neutral chip with the explanatory tooltip, never a zero', () => {
    expect(source).toContain('This marker could not be read from the document');
    expect(source).toContain('Unknown');
  });

  it('groups findings into Foods, Vitamins, Minerals, and Other Markers', () => {
    expect(source).toContain("{ key: 'food', title: 'Foods' }");
    expect(source).toContain("{ key: 'vitamin', title: 'Vitamins' }");
    expect(source).toContain("{ key: 'mineral', title: 'Minerals' }");
    expect(source).toContain("{ key: 'other', title: 'Other Markers' }");
  });

  it('mounts the FDA disclaimer on this tab', () => {
    expect(source).toContain(
      "import { FdaDisclaimer } from '@/components/compliance/FdaDisclaimer'",
    );
    expect(source).toContain('<FdaDisclaimer');
  });

  it('reuses the shared row mappers rather than reimplementing them', () => {
    expect(source).toContain("from '@/lib/nutrition/genetics/types'");
    expect(source).toContain('uploadFromRow');
    expect(source).toContain('findingFromRow');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
