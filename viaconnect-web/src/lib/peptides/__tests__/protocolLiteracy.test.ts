import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  PROTOCOL_LITERACY_LESSONS,
  assertLiteracyCorpusClean,
  literacyLexiconHits,
} from '../protocolLiteracy';

describe('Prompt 226 Module C Protocol Literacy', () => {
  it('ships exactly twelve lessons', () => {
    expect(PROTOCOL_LITERACY_LESSONS.length).toBe(12);
    expect(PROTOCOL_LITERACY_LESSONS.map((l) => l.number)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
  });

  it('passes dose/frequency lexicon scan at 100 percent', () => {
    const failures = assertLiteracyCorpusClean();
    expect(failures, failures.join(' | ')).toEqual([]);
  });

  it('includes lessons 10 and 12 as anti-guessing anchors', () => {
    const ten = PROTOCOL_LITERACY_LESSONS.find((l) => l.number === 10);
    const twelve = PROTOCOL_LITERACY_LESSONS.find((l) => l.number === 12);
    expect(ten?.title.toLowerCase()).toContain('no established dose');
    expect(twelve?.title.toLowerCase()).toContain('clinician');
  });

  it('lesson 2 may point at converter illustration without embedding platform doses', () => {
    const two = PROTOCOL_LITERACY_LESSONS.find((l) => l.number === 2);
    expect(two?.converterIllustration).toBe(true);
    const blob = [two?.title, two?.summary, ...(two?.body ?? [])].join('\n');
    expect(literacyLexiconHits(blob)).toEqual([]);
  });

  it('UI wires literacy page and enables the tab', () => {
    const page = readFileSync(
      path.join(
        process.cwd(),
        'src/app/(app)/(consumer)/peptide-protocol/literacy/page.tsx',
      ),
      'utf8',
    );
    expect(page).toContain('ProtocolLiteracyClient');

    const tabs = readFileSync(
      path.join(
        process.cwd(),
        'src/components/peptide-protocol/converter/PeptideEducationTabs.tsx',
      ),
      'utf8',
    );
    expect(tabs).toContain('/peptide-protocol/literacy');
    expect(tabs).not.toContain('soon: true');
  });
});
