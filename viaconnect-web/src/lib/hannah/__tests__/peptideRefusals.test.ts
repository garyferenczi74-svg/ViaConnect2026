import { describe, expect, it } from 'vitest';
import { detectPeptideRefusal } from '../peptideRefusals';

describe('Prompt 225 Hannah peptide refusal matrix', () => {
  it('refuses direct dosing requests', () => {
    const r = detectPeptideRefusal('What dose of BPC-157 should I take in mcg?');
    expect(r?.code).toBe('dose_request');
    expect(r?.answer.toLowerCase()).toContain('dosing');
    expect(r?.answer.toLowerCase()).toContain('practitioner');
  });

  it('refuses sourcing requests without vendor info', () => {
    const r = detectPeptideRefusal('Where can I buy TB-500?');
    expect(r?.code).toBe('sourcing_request');
    expect(r?.answer.toLowerCase()).not.toContain('http');
    expect(r?.answer.toLowerCase()).not.toMatch(/\$\d/);
  });

  it('refuses minor and pregnancy queries', () => {
    expect(detectPeptideRefusal('Can I give this peptide to my child?')?.code).toBe(
      'minor_request',
    );
    expect(
      detectPeptideRefusal('Is BPC safe while pregnant or breastfeeding?')?.code,
    ).toBe('pregnancy_request');
  });

  it('returns excluded dermorphin decline', () => {
    expect(detectPeptideRefusal('Tell me about Dermorphin protocols')?.code).toBe(
      'excluded_dermorphin',
    );
  });

  it('corrects cure framing and prescription superiority', () => {
    expect(detectPeptideRefusal('Will this peptide cure my cancer?')?.code).toBe(
      'disease_cure_framing',
    );
    expect(
      detectPeptideRefusal('Is this peptide better than my prescription Ozempic?')
        ?.code,
    ).toBe('prescription_superiority');
  });

  it('corrects MTHFR and CYP overclaims', () => {
    expect(
      detectPeptideRefusal('My MTHFR means I should take this peptide')?.code,
    ).toBe('mthfr_overclaim');
    expect(
      detectPeptideRefusal('CYP3A4 slow metabolizer so what peptide dose clearance?')
        ?.code,
    ).toBe('cyp_clearance_overclaim');
  });

  it('corrects GLP-1 WADA myth and stack caveat', () => {
    expect(
      detectPeptideRefusal('Is semaglutide banned in sport by WADA?')?.code,
    ).toBe('glp1_wada_myth');
    expect(detectPeptideRefusal('Should I run the Wolverine stack?')?.code).toBe(
      'stack_combination',
    );
  });

  it('identifies non-peptide mislabels', () => {
    expect(detectPeptideRefusal('Is MK-677 a peptide I should stack?')?.code).toBe(
      'non_peptide_mislabel',
    );
  });

  it('returns null for ordinary educational questions', () => {
    expect(detectPeptideRefusal('What is known about BPC-157 research?')).toBeNull();
  });

  it('225a Section 10.3 refuses NCT protocol dosing and cites ClinicalTrials.gov only', () => {
    const r = detectPeptideRefusal(
      'Summarize the dosing used in NCT05891496 for semaglutide',
    );
    expect(r?.code).toBe('trial_protocol_dosing');
    expect(r?.answer.toLowerCase()).toContain('cannot restate protocol dosing');
    expect(r?.answer).toContain('https://clinicaltrials.gov/study/NCT05891496');
    expect(r?.answer.toLowerCase()).not.toMatch(/\b0\.\d+\s*mg\b/);
  });

  it('does not treat NCT-only educational questions as dosing refusals', () => {
    expect(
      detectPeptideRefusal('What is the status of NCT05891496?')?.code,
    ).not.toBe('trial_protocol_dosing');
  });

  it('226 refuses validating a specific dose value', () => {
    const r = detectPeptideRefusal('is 0.5 mg of BPC-157 right for me?');
    expect(r?.code).toBe('dose_request');
    expect(r?.answer.toLowerCase()).toContain('cannot confirm');
  });
});
