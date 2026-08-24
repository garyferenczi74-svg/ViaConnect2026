import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  formatProtocolAttribution,
  PROTOCOL_ATTRIBUTION_VERSION,
} from '../protocolAttribution';

describe('Prompt 226 Module B de-identified', () => {
  it('formats Lex attribution without platform clinical judgement claim', () => {
    const text = formatProtocolAttribution({
      practitionerName: 'Dr Example',
      licenseNumber: '12345',
      jurisdiction: 'AB',
    });
    expect(PROTOCOL_ATTRIBUTION_VERSION).toBe('226-b-v1');
    expect(text).toContain('Dr Example');
    expect(text).toContain('12345');
    expect(text).toContain('AB');
    expect(text.toLowerCase()).toContain('unit conversion only');
    expect(text.toLowerCase()).not.toContain('viaConnect recommends');
  });

  it('schema stores opaque patient_ref and never requires legal name', () => {
    const sql = readFileSync(
      path.join(
        process.cwd(),
        'supabase/migrations/20260820170000_prompt_226_module_b_deidentified.sql',
      ),
      'utf8',
    );
    expect(sql).toContain('patient_ref text NOT NULL');
    expect(sql).toContain('Do not store patient legal name');
    expect(sql).toContain("jurisdiction IN ('AB', 'NY')");
    expect(sql).toContain('practitioner_peptide_protocols');
    expect(sql.toLowerCase()).not.toContain('patient_legal_name');
    expect(sql.toLowerCase()).not.toContain('date_of_birth');
  });

  it('builder UI rejects name-like patient refs in copy and wires verification', () => {
    const ui = readFileSync(
      path.join(
        process.cwd(),
        'src/components/practitioner/peptide-protocols/PeptideProtocolBuilderClient.tsx',
      ),
      'utf8',
    );
    expect(ui).toContain('Opaque patient reference');
    expect(ui).toContain('module-b-verification');
    expect(ui).toMatch(/Do not\s+type a legal name/);
    expect(ui).toContain('/api/practitioner/peptide-protocols/verification');
  });
});
