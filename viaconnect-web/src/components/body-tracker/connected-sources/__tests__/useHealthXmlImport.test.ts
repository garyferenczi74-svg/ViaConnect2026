import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
const src = (r: string) => readFileSync(join(process.cwd(), r), 'utf8');
describe('useHealthXmlImport extraction', () => {
  it('the hook owns the parse gate and timeout, and the modal delegates to it', () => {
    const hook = src('src/components/body-tracker/connected-sources/useHealthXmlImport.ts');
    expect(hook).toContain('isImportComplete');
    expect(hook).toContain('withAbortTimeout');
    expect(hook).toContain('parseImportSummary');
    const modal = src('src/components/body-tracker/connected-sources/AppleHealthImportModal.tsx');
    expect(modal).toContain('useHealthXmlImport');
  });
});
