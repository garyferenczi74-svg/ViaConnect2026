// Prompt 172e Phase D Workstream 1: kill switch source-level gate proof
// for BeverageBreakdown.
//
// Same posture as Phase B BeveragePicker kill switch test: reads the
// source file and asserts that BEVERAGE_CATALOG_RENDERING_ENABLED is
// honored as a silent unmount with no user facing copy. A single env
// flip during a 170c section 9 incident must remove the entire Phase D
// surface alongside the picker.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const BREAKDOWN_SOURCE = readFileSync(
  path.resolve(__dirname, '..', 'BeverageBreakdown.tsx'),
  'utf8',
);

const ELECTROLYTE_SOURCE = readFileSync(
  path.resolve(__dirname, '..', '..', 'ElectrolyteSummary', 'ElectrolyteSummary.tsx'),
  'utf8',
);

const OVERLAY_SOURCE = readFileSync(
  path.resolve(__dirname, '..', '..', 'CaffeineOverlay', 'CaffeineOverlay.tsx'),
  'utf8',
);

describe('BEVERAGE_CATALOG_RENDERING_ENABLED kill switch gate in BeverageBreakdown', () => {
  it('imports the compliance helper', () => {
    expect(BREAKDOWN_SOURCE).toMatch(
      /import \{ isKillSwitchEnabled \} from '@\/lib\/compliance\/kill-switches';/,
    );
  });

  it('reads the switch at render time', () => {
    expect(BREAKDOWN_SOURCE).toMatch(
      /isKillSwitchEnabled\('BEVERAGE_CATALOG_RENDERING_ENABLED'\)/,
    );
  });

  it('returns null on kill path (silent unmount)', () => {
    expect(BREAKDOWN_SOURCE).toMatch(/if \(!enabled\) return null;/);
  });

  it('declares return type JSX.Element | null', () => {
    expect(BREAKDOWN_SOURCE).toMatch(
      /export function BeverageBreakdown\(\): JSX\.Element \| null/,
    );
  });

  it('does not emit any "disabled" or "unavailable" copy on the kill path', () => {
    const disallowed = /enabled[\s\S]{0,200}?(disabled|unavailable|turned off)/i;
    expect(BREAKDOWN_SOURCE).not.toMatch(disallowed);
  });
});

describe('BEVERAGE_CATALOG_RENDERING_ENABLED kill switch gate in ElectrolyteSummary', () => {
  it('imports the compliance helper + reads the switch + silent unmounts', () => {
    expect(ELECTROLYTE_SOURCE).toMatch(
      /import \{ isKillSwitchEnabled \} from '@\/lib\/compliance\/kill-switches';/,
    );
    expect(ELECTROLYTE_SOURCE).toMatch(
      /isKillSwitchEnabled\('BEVERAGE_CATALOG_RENDERING_ENABLED'\)/,
    );
    expect(ELECTROLYTE_SOURCE).toMatch(/if \(!enabled\) return null;/);
  });
});

describe('BEVERAGE_CATALOG_RENDERING_ENABLED kill switch gate in CaffeineOverlay', () => {
  it('imports the compliance helper + reads the switch + silent unmounts', () => {
    expect(OVERLAY_SOURCE).toMatch(
      /import \{ isKillSwitchEnabled \} from '@\/lib\/compliance\/kill-switches';/,
    );
    expect(OVERLAY_SOURCE).toMatch(
      /isKillSwitchEnabled\('BEVERAGE_CATALOG_RENDERING_ENABLED'\)/,
    );
    expect(OVERLAY_SOURCE).toMatch(/if \(!enabled\) return null;/);
  });

  it('also silently unmounts on safety mode (overlay surfaces caffeine_mg graphically per spec section 8)', () => {
    expect(OVERLAY_SOURCE).toMatch(/if \(safety\.enabled\) return null;/);
  });
});
