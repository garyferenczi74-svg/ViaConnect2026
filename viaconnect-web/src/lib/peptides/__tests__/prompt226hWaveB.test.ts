/**
 * Prompt 226h Wave B: shared evidence surfaces + Science registry wiring.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { evidenceRecordIds } from '@/lib/kb/unifiedEvidence226h';
import type { PeptideEvidenceBundle } from '@/lib/kb/unifiedEvidence226h';

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('226h Wave B shared surfaces', () => {
  it('Science page mounts SourceRegistryPanel', () => {
    const page = read('src/app/(app)/(consumer)/science/page.tsx');
    const panel = read('src/components/science/SourceRegistryPanel.tsx');
    expect(page).toContain('SourceRegistryPanel');
    expect(panel).toContain('science-source-registry');
    expect(page.toLowerCase()).not.toMatch(/\brecommendation\b/);
  });

  it('Research Hub has Evidence tab beside Media', () => {
    const page = read('src/app/(app)/(consumer)/media-sources/page.tsx');
    expect(page).toContain('PeptideEvidencePanel');
    expect(page).toContain('research-hub-evidence-tab');
    expect(page).toContain("hubMode === 'evidence'");
  });

  it('API routes exist for registry and evidence', () => {
    expect(
      read('src/app/api/kb/source-registry/route.ts'),
    ).toContain('loadSourceRegistry');
    expect(
      read('src/app/api/kb/peptide-evidence/route.ts'),
    ).toContain('loadPeptideEvidenceBundle');
    expect(
      read('src/app/api/kb/peptide-evidence/route.ts'),
    ).toContain('evidenceRecordIds');
  });

  it('evidenceRecordIds are stable sorted unique keys', () => {
    const bundle: PeptideEvidenceBundle = {
      query: 'epitalon',
      peptides: [],
      records: [
        {
          recordId: 'b',
          recordType: 'publication',
          title: 'B',
          sourceUrl: '',
          peptideSlug: 'epitalon',
          peptideDisplayName: 'Epitalon',
          relevance: 'direct_intervention',
          sourceTier: 2,
          preparationClass: 'synthetic_defined',
          provenanceDisclosure: 'x',
          freshnessLabel: 'Updated 1h ago',
        },
        {
          recordId: 'a',
          recordType: 'trial',
          title: 'A',
          sourceUrl: '',
          peptideSlug: 'epitalon',
          peptideDisplayName: 'Epitalon',
          relevance: 'direct_intervention',
          sourceTier: 1,
          preparationClass: 'synthetic_defined',
          provenanceDisclosure: 'x',
          freshnessLabel: 'Updated 1h ago',
        },
        {
          recordId: 'b',
          recordType: 'publication',
          title: 'B dup',
          sourceUrl: '',
          peptideSlug: 'epitalon',
          peptideDisplayName: 'Epitalon',
          relevance: 'direct_intervention',
          sourceTier: 2,
          preparationClass: 'synthetic_defined',
          provenanceDisclosure: 'x',
          freshnessLabel: 'Updated 1h ago',
        },
      ],
      ingestStatus: [],
      provenanceSummary: null,
    };
    expect(evidenceRecordIds(bundle)).toEqual([
      'publication:b',
      'trial:a',
    ]);
  });

  it('Hannah honesty context loads preparation_class and disclosure', () => {
    const src = read('src/lib/hannah/peptideHonestyContext.ts');
    expect(src).toContain('preparation_class');
    expect(src).toContain('provenance_disclosure');
    expect(src).toContain('provenance_disclosure:');
  });

  it('suggestion cards can render preparation class and disclosure', () => {
    const ui = read(
      'src/components/peptide-protocol/PeptideSuggestionsClient.tsx',
    );
    expect(ui).toContain('preparationClass');
    expect(ui).toContain('provenanceDisclosure');
  });
});
