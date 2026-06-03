// Prompt 172e Phase B review revisions 2026-06-03: BEVERAGE_CATALOG_RENDERING_ENABLED
// kill switch source-level gate proof.
//
// The picker reads isKillSwitchEnabled('BEVERAGE_CATALOG_RENDERING_ENABLED') at
// render time and silently returns null when the switch is off. The silent
// unmount matches the Phase 2 BOS line silent-on-kill pattern: no error UI,
// no "feature disabled" copy, the section just disappears from the page.
//
// This test mirrors the source-level assertion pattern in
// safety-mode-suppression.test.ts: it introspects the BeveragePicker.tsx
// source file to pin the gate, rather than spinning up a React renderer
// that would re instantiate all the picker hooks for a contract that lives
// at one conditional point.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const BEVERAGE_PICKER_SOURCE = readFileSync(
  path.resolve(__dirname, '..', 'BeveragePicker.tsx'),
  'utf8',
);

describe('BEVERAGE_CATALOG_RENDERING_ENABLED kill switch gate in BeveragePicker', () => {
  it('silently returns null when the kill switch is off, no user facing copy on the kill path', () => {
    // 1. The compliance helper is imported.
    expect(BEVERAGE_PICKER_SOURCE).toMatch(
      /import \{ isKillSwitchEnabled \} from '@\/lib\/compliance\/kill-switches';/,
    );
    // 2. The switch flag is read at render time.
    expect(BEVERAGE_PICKER_SOURCE).toMatch(
      /isKillSwitchEnabled\('BEVERAGE_CATALOG_RENDERING_ENABLED'\)/,
    );
    // 3. The off path emits a bare return null (silent unmount).
    expect(BEVERAGE_PICKER_SOURCE).toMatch(
      /if \(!catalogRenderingEnabled\) \{\s*return null;\s*\}/,
    );
    // 4. The component return type reflects the silent unmount.
    expect(BEVERAGE_PICKER_SOURCE).toMatch(
      /export function BeveragePicker\([^)]+\): JSX\.Element \| null/,
    );
    // 5. No "disabled" or "unavailable" copy is wired to the kill path,
    //    per the Phase 2 BOS line silent precedent.
    const disallowed = /catalogRenderingEnabled[\s\S]{0,200}?(disabled|unavailable|turned off)/i;
    expect(BEVERAGE_PICKER_SOURCE).not.toMatch(disallowed);
  });
});
