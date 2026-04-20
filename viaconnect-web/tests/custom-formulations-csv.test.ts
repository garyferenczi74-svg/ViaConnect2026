// Prompt #97 Phase 2.4: pure CSV parsing tests.

import { describe, it, expect } from 'vitest';
import { parseIngredientCsv } from '@/lib/custom-formulations/ingredient-csv';

const HEADER =
  'id,common_name,scientific_name,category,regulatory_status,dose_unit,typical_dose_mg,tolerable_upper_limit_adult_mg,pregnancy_category,fda_warning_letter_issued,fda_safety_concern_listed,structure_function_claim_allowed';

describe('parseIngredientCsv — happy path', () => {
  it('parses a single valid row', () => {
    const csv = [
      HEADER,
      'coq10,Coenzyme Q10,Ubiquinone,nutraceutical,pre_1994_dietary_ingredient,mg,100,,safe,false,false,true',
    ].join('\n');
    const r = parseIngredientCsv(csv);
    expect(r.valid).toHaveLength(1);
    expect(r.invalid).toHaveLength(0);
    expect(r.valid[0].id).toBe('coq10');
    expect(r.valid[0].category).toBe('nutraceutical');
    expect(r.valid[0].typical_dose_mg).toBe(100);
    expect(r.valid[0].is_available_for_custom_formulation).toBe(false);
  });

  it('forces is_available_for_custom_formulation = false regardless of input', () => {
    const csvWithTrue = [
      HEADER + ',is_available_for_custom_formulation',
      'test_ing,Test,Test sci,vitamin,gras_affirmed,mg,50,,safe,false,false,true,true',
    ].join('\n');
    const r = parseIngredientCsv(csvWithTrue);
    expect(r.valid[0].is_available_for_custom_formulation).toBe(false);
  });

  it('parses multiple rows', () => {
    const csv = [
      HEADER,
      'a,A,,vitamin,pre_1994_dietary_ingredient,mg,10,,safe,false,false,true',
      'b,B,,mineral,gras_affirmed,mg,20,,safe,false,false,false',
      'c,C,,amino_acid,pre_1994_dietary_ingredient,g,5,,safe,false,false,true',
    ].join('\n');
    const r = parseIngredientCsv(csv);
    expect(r.valid).toHaveLength(3);
  });
});

describe('parseIngredientCsv — validation', () => {
  it('rejects missing required fields', () => {
    const csv = [
      HEADER,
      ',Missing Id,,vitamin,pre_1994_dietary_ingredient,mg,,,,false,false,true',
    ].join('\n');
    const r = parseIngredientCsv(csv);
    expect(r.invalid).toHaveLength(1);
    expect(r.invalid[0].errors.some((e) => e.field === 'id')).toBe(true);
  });

  it('rejects invalid category', () => {
    const csv = [
      HEADER,
      'x,X,,invalidcat,pre_1994_dietary_ingredient,mg,10,,safe,false,false,true',
    ].join('\n');
    const r = parseIngredientCsv(csv);
    expect(r.invalid).toHaveLength(1);
    expect(r.invalid[0].errors.some((e) => e.field === 'category')).toBe(true);
  });

  it('rejects invalid regulatory_status', () => {
    const csv = [
      HEADER,
      'x,X,,vitamin,made_up_status,mg,10,,safe,false,false,true',
    ].join('\n');
    const r = parseIngredientCsv(csv);
    expect(r.invalid).toHaveLength(1);
    expect(r.invalid[0].errors.some((e) => e.field === 'regulatory_status')).toBe(true);
  });

  it('rejects Q1-disallowed regulatory_status (under_review)', () => {
    const csv = [
      HEADER,
      'x,X,,vitamin,under_review,mg,10,,safe,false,false,true',
    ].join('\n');
    const r = parseIngredientCsv(csv);
    expect(r.invalid).toHaveLength(1);
    expect(
      r.invalid[0].errors.some(
        (e) => e.field === 'regulatory_status' && e.message.includes('Q1'),
      ),
    ).toBe(true);
  });

  it('rejects invalid dose_unit', () => {
    const csv = [
      HEADER,
      'x,X,,vitamin,pre_1994_dietary_ingredient,liters,10,,safe,false,false,true',
    ].join('\n');
    const r = parseIngredientCsv(csv);
    expect(r.invalid).toHaveLength(1);
    expect(r.invalid[0].errors.some((e) => e.field === 'dose_unit')).toBe(true);
  });

  it('rejects non-numeric dose', () => {
    const csv = [
      HEADER,
      'x,X,,vitamin,pre_1994_dietary_ingredient,mg,notanumber,,safe,false,false,true',
    ].join('\n');
    const r = parseIngredientCsv(csv);
    expect(r.invalid).toHaveLength(1);
    expect(r.invalid[0].errors.some((e) => e.field === 'typical_dose_mg')).toBe(true);
  });

  it('rejects invalid pregnancy_category', () => {
    const csv = [
      HEADER,
      'x,X,,vitamin,pre_1994_dietary_ingredient,mg,10,,notavalue,false,false,true',
    ].join('\n');
    const r = parseIngredientCsv(csv);
    expect(r.invalid).toHaveLength(1);
    expect(r.invalid[0].errors.some((e) => e.field === 'pregnancy_category')).toBe(true);
  });

  it('empty CSV returns empty', () => {
    const r = parseIngredientCsv('');
    expect(r.valid).toEqual([]);
    expect(r.invalid).toEqual([]);
  });

  it('header-only CSV returns empty', () => {
    const r = parseIngredientCsv(HEADER);
    expect(r.valid).toEqual([]);
    expect(r.invalid).toEqual([]);
  });

  it('parses boolean true/1/yes variants', () => {
    const csv = [
      HEADER,
      'a,A,,vitamin,pre_1994_dietary_ingredient,mg,10,,safe,true,true,true',
      'b,B,,vitamin,pre_1994_dietary_ingredient,mg,10,,safe,1,yes,t',
    ].join('\n');
    const r = parseIngredientCsv(csv);
    expect(r.valid).toHaveLength(2);
    expect(r.valid[0].fda_warning_letter_issued).toBe(true);
    expect(r.valid[1].fda_safety_concern_listed).toBe(true);
  });

  it('handles quoted cells with embedded commas', () => {
    const csv = [
      HEADER,
      '"quoted_id","Name, with comma",,vitamin,pre_1994_dietary_ingredient,mg,10,,safe,false,false,true',
    ].join('\n');
    const r = parseIngredientCsv(csv);
    expect(r.valid).toHaveLength(1);
    expect(r.valid[0].common_name).toBe('Name, with comma');
  });

  it('mixed valid + invalid rows splits correctly', () => {
    const csv = [
      HEADER,
      'good,Good,,vitamin,pre_1994_dietary_ingredient,mg,10,,safe,false,false,true',
      'bad,Bad,,junk_category,pre_1994_dietary_ingredient,mg,20,,safe,false,false,true',
      'also_good,Also Good,,mineral,gras_affirmed,mg,30,,safe,false,false,true',
    ].join('\n');
    const r = parseIngredientCsv(csv);
    expect(r.valid).toHaveLength(2);
    expect(r.invalid).toHaveLength(1);
    expect(r.invalid[0].raw.id).toBe('bad');
  });
});
