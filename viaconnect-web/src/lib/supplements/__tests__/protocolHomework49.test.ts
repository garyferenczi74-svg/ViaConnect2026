/**
 * Brief 49: homework line uses real form / source / existing copy only.
 * No invented CAQ, lab, or gene chips. time_source=hannah is not a chip.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  PROTOCOL_HOMEWORK_OMISSION,
  PROTOCOL_MOLECULE_PROVIDER_NOTE,
  buildProtocolHomework,
  chipForProtocolSource,
  deliveryFormLabel,
  formatHomeworkText,
} from '../protocolHomework';

const root = process.cwd();

describe('Brief 49 protocol homework (honest fields)', () => {
  it('maps only locked input chips from a real source field', () => {
    expect(chipForProtocolSource('manual')).toBe('from profile');
    expect(chipForProtocolSource('profile')).toBe('from profile');
    expect(chipForProtocolSource('caq')).toBe('from CAQ');
    expect(chipForProtocolSource('caq_backfill')).toBe('from CAQ');
    expect(chipForProtocolSource('lab')).toBe('from lab');
    expect(chipForProtocolSource('rythm_health')).toBe('from lab');
    expect(chipForProtocolSource('lab_biomarkers')).toBe('from lab');
    expect(chipForProtocolSource('GENEX360', { hasGenex360Row: true })).toBe(
      'from GENEX360',
    );
    expect(chipForProtocolSource('GeneXM', { hasGenexmRow: true })).toBe('from GeneXM');
    expect(chipForProtocolSource('GENEX360')).toBeNull();
    expect(chipForProtocolSource('GeneXM')).toBeNull();
    expect(chipForProtocolSource('genex_m', { hasGenexmRow: true })).toBe('from GeneXM');
    expect(chipForProtocolSource('genex_m', { hasGenexmRow: false })).toBeNull();
  });

  it('does not invent CAQ, lab, or gene from live-looking sources', () => {
    expect(chipForProtocolSource('farmceutica')).toBeNull();
    expect(chipForProtocolSource('photo_ai')).toBeNull();
    expect(chipForProtocolSource('ai_search')).toBeNull();
    expect(chipForProtocolSource('hannah')).toBeNull();
    expect(chipForProtocolSource('user_caq')).toBeNull();
    expect(chipForProtocolSource('')).toBeNull();
    expect(chipForProtocolSource(null)).toBeNull();
  });

  it('treats standard_actives as unknown delivery, not capsule', () => {
    expect(
      deliveryFormLabel({ name: 'Creatine HCl', dosageForm: 'standard_actives' }),
    ).toBeNull();
    expect(
      deliveryFormLabel({ name: 'Organika Glycine', dosageForm: 'methylated_vitamins' }),
    ).toBeNull();
  });

  it('uses liposomal / injectable only from the real form or product name', () => {
    expect(
      deliveryFormLabel({
        name: 'BioB Fusion Methylated and Liposomal B Complex',
        dosageForm: 'liposomal_delivery',
      }),
    ).toBe('liposomal');
    expect(
      deliveryFormLabel({
        name: 'Liposomal Vitamin D3 + K2 (MK-7)',
        dosageForm: 'standard_actives',
      }),
    ).toBe('liposomal');
    expect(
      deliveryFormLabel({
        name: 'Retatrutide',
        dosageForm: 'injectable',
      }),
    ).toBe('injectable');
    expect(
      deliveryFormLabel({
        name: 'Retatrutide',
        dosageForm: 'standard_actives',
      }),
    ).toBeNull();
  });

  it('Creatine HCl farmceutica + standard_actives is an honest omission', () => {
    const hw = buildProtocolHomework({
      name: 'Creatine HCl',
      dosageForm: 'standard_actives',
      source: 'farmceutica',
    });
    expect(hw.moleculeWhy).toBeNull();
    expect(hw.deliveryWhy).toBeNull();
    expect(hw.inputChip).toBeNull();
    expect(hw.omission).toBe(PROTOCOL_HOMEWORK_OMISSION);
    expect(formatHomeworkText(hw)).toBe(PROTOCOL_HOMEWORK_OMISSION);
    expect(formatHomeworkText(hw)).not.toMatch(/from CAQ|from lab|from GENEX|from GeneXM/);
    expect(formatHomeworkText(hw)).not.toMatch(/capsule|Semaglutide|add to stack/i);
  });

  it('manual source becomes from profile without inventing a molecule why', () => {
    const hw = buildProtocolHomework({
      name: 'Organika Glycine',
      dosageForm: 'standard_actives',
      source: 'manual',
    });
    expect(hw.omission).toBeNull();
    expect(hw.inputChip).toBe('from profile');
    expect(hw.moleculeWhy).toBeNull();
    expect(hw.deliveryWhy).toBeNull();
  });

  it('keeps existing educational copy and adds the provider note', () => {
    const hw = buildProtocolHomework({
      name: 'Magnesium glycinate',
      dosageForm: 'capsule',
      source: 'caq',
      moleculeWhy: 'Magnesium is a mineral used in many wellness routines.',
    });
    expect(hw.moleculeWhy).toContain('Magnesium is a mineral used in many wellness routines.');
    expect(hw.moleculeWhy).toContain(PROTOCOL_MOLECULE_PROVIDER_NOTE);
    expect(hw.deliveryWhy).toBe('Capsule is the recorded delivery form.');
    expect(hw.inputChip).toBe('from CAQ');
    expect(hw.omission).toBeNull();
  });

  it('never emits Semaglutide or add-to-stack copy', () => {
    const hw = buildProtocolHomework({
      name: 'Semaglutide',
      dosageForm: 'injectable',
      source: 'manual',
      moleculeWhy: 'Add to stack for weight.',
    });
    expect(hw.moleculeWhy).toBeNull();
    expect(JSON.stringify(hw)).not.toMatch(/Semaglutide/i);
    expect(JSON.stringify(hw)).not.toMatch(/add to stack/i);
  });

  it('schedule select now includes dosage_form and source; hero CTA does not grow a homework essay', () => {
    const assign = readFileSync(
      join(root, 'src/lib/caq/supplements/timing/assignTiming.ts'),
      'utf8',
    );
    const card = readFileSync(
      join(root, 'src/components/supplements/ScheduleSupplementCard.tsx'),
      'utf8',
    );
    const hero = readFileSync(
      join(root, 'src/components/dashboard/morning-card/MorningProtocolCta.tsx'),
      'utf8',
    );
    const dash = readFileSync(
      join(root, 'src/components/dashboard/TodaysProtocol.tsx'),
      'utf8',
    );

    expect(assign).toMatch(
      /select\('id, supplement_name, dosage, dosage_form, source, formulation, key_ingredients, frequency'\)/,
    );
    expect(card).toContain('data-testid="schedule-row-homework"');
    expect(card).toContain('buildProtocolHomework');
    expect(card).toMatch(/break-words \[overflow-wrap:break-word\] \[word-break:normal\]/);
    expect(hero).not.toContain('schedule-row-homework');
    expect(hero).not.toContain('buildProtocolHomework');
    expect(hero).not.toContain(PROTOCOL_HOMEWORK_OMISSION);
    expect(dash).toContain('buildProtocolHomework');
    expect(dash).toContain('homeworkLine');
  });
});
