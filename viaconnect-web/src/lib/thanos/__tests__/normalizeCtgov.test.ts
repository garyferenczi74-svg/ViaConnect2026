import { describe, expect, it } from 'vitest';
import { normalizeCtgovStudy } from '@/lib/thanos/normalizeCtgov';
import { assertNoDoseLexicon } from '@/lib/thanos/doseRedaction';

describe('Prompt 225a CT.gov normalize + redaction', () => {
  it('redacts dose from intervention descriptions before storage fields', () => {
    const study = {
      hasResults: false,
      protocolSection: {
        identificationModule: {
          nctId: 'NCT05891496',
          briefTitle: 'Semaglutide study',
          officialTitle: 'A study of semaglutide',
        },
        statusModule: {
          overallStatus: 'COMPLETED',
          lastUpdatePostDateStruct: { date: '2024-06-01' },
        },
        designModule: {
          studyType: 'INTERVENTIONAL',
          phases: ['PHASE3'],
          designInfo: {
            allocation: 'RANDOMIZED',
            interventionModel: 'PARALLEL',
            maskingInfo: { masking: 'QUADRUPLE' },
          },
          enrollmentInfo: { count: 120, type: 'ACTUAL' },
        },
        armsInterventionsModule: {
          interventions: [
            {
              type: 'DRUG',
              name: 'Semaglutide',
              description:
                'Participants will receive 1.0 mg semaglutide s.c. injections once weekly for 52 weeks',
            },
          ],
          armGroups: [
            {
              label: 'Semaglutide arm',
              type: 'EXPERIMENTAL',
              description: '1.0 mg once weekly subcutaneous',
            },
            {
              label: 'Placebo',
              type: 'PLACEBO_COMPARATOR',
              description: 'Matched placebo once weekly',
            },
          ],
        },
        conditionsModule: { conditions: ['Type 2 Diabetes'] },
        outcomesModule: {
          primaryOutcomes: [{ measure: 'Change in HbA1c' }],
        },
        sponsorCollaboratorsModule: {
          leadSponsor: { name: 'Example Sponsor', class: 'INDUSTRY' },
        },
        contactsLocationsModule: {
          locations: [{ country: 'United States' }],
        },
      },
    };

    const norm = normalizeCtgovStudy(study);
    expect(norm).not.toBeNull();
    expect(norm!.doseRedactionApplied).toBe(true);
    expect(norm!.redactionCount).toBeGreaterThan(0);
    expect(norm!.interventionNames.join(' ')).toMatch(/semaglutide/i);
    expect(norm!.interventionNames.join(' ')).not.toMatch(/\b1\.0\s*mg\b/i);
    expect(norm!.hasComparator).toBe(true);
    expect(norm!.comparatorType).toBe('placebo');
    expect(norm!.armCount).toBe(2);
    expect(norm!.redactionProof?.beforeSample).toMatch(/1\.0\s*mg/i);
    expect(assertNoDoseLexicon(norm!.redactionProof!.afterSample)).toBe(true);
    const stored = [
      ...norm!.interventionNames,
      ...norm!.primaryOutcomeTitles,
    ].join(' ');
    expect(assertNoDoseLexicon(stored)).toBe(true);
  });
});
