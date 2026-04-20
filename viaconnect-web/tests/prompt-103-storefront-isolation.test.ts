// Prompt #103 Phase 4: Storefront brand isolation tests.
//
// Asserts the red-flag hard-stop conditions from spec §13:
//   - Sproutables storefront must NOT render the all-caps VIACURA
//     wordmark anywhere on its main page.
//   - SNP storefront must use the SNP tagline, not the ViaCura master.
//
// We read the source file text and grep, because the full rendering
// path depends on live Supabase data. These invariants live in the
// static JSX.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readSource(relative: string): string {
  return readFileSync(join(process.cwd(), relative), 'utf-8');
}

// Strip // line comments + /* block comments */ so assertions run
// against the rendered JSX, not the documentation at the top of the
// file. The spec rule is "wordmark in the rendered page", not
// "wordmark in the source file".
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');
}

describe('Sproutables storefront brand isolation', () => {
  const main = stripComments(readSource('src/app/(app)/(consumer)/shop/sproutables/page.tsx'));

  it('never renders the all-caps VIACURA wordmark', () => {
    expect(/VIACURA/.test(main)).toBe(false);
  });

  it('uses the Sproutables tagline Peak Growth and Wellness', () => {
    expect(main).toMatch(/Peak Growth and Wellness/);
  });

  it('does not use the ViaCura master tagline', () => {
    expect(main).not.toMatch(/Built For Your Biology/);
  });
});

describe('Sproutables about page brand isolation', () => {
  const about = stripComments(readSource('src/app/(app)/(consumer)/shop/sproutables/about/page.tsx'));

  it('never renders the all-caps VIACURA wordmark', () => {
    expect(/VIACURA/.test(about)).toBe(false);
  });

  it('mentions ViaCura only in lowercase legal footer disclosure', () => {
    // Mixed-case "ViaCura family brand" is the permitted legal disclosure
    expect(about).toMatch(/ViaCura family brand/);
  });
});

describe('SNP Line storefront', () => {
  const snp = stripComments(readSource('src/app/(app)/(consumer)/shop/snp/page.tsx'));

  it('renders the SNP tagline Your Genetics Your Protocol', () => {
    expect(snp).toMatch(/Your Genetics \| Your Protocol/);
  });

  it('does not use the ViaCura master tagline', () => {
    expect(snp).not.toMatch(/Built For Your Biology/);
  });

  it('does not use the Sproutables tagline', () => {
    expect(snp).not.toMatch(/Peak Growth and Wellness/);
  });

  it('includes the all-caps VIACURA wordmark (SNP Line does render it)', () => {
    expect(/VIACURA/.test(snp)).toBe(true);
  });
});
