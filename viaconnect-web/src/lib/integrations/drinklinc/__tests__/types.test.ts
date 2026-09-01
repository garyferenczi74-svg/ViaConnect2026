import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import type {
  DrinkLincAdherenceSummary,
  DrinkLincDailyDoseEvent,
  DrinkLincIngestPayload,
  DrinkLincRegimenMetadata,
} from '../types';

const typesSrc = readFileSync(join(process.cwd(), 'src/lib/integrations/drinklinc/types.ts'), 'utf8');

describe('DrinkLinc provisional types', () => {
  it('marks shapes as provisional and maps toward nutrients and regimen', () => {
    expect(typesSrc).toMatch(/Provisional/i);
    expect(typesSrc).toContain('nutrients');
    expect(typesSrc).toContain('regimen');
    expect(typesSrc).toContain('DrinkLincDailyDoseEvent');
    expect(typesSrc).toContain('DrinkLincCartridgeIngredient');
    expect(typesSrc).toContain('DrinkLincAdherenceSummary');
    expect(typesSrc).not.toContain('\u2014');
    expect(typesSrc).not.toContain('\u2013');
    expect(typesSrc).not.toMatch(/Semaglutide/i);

    const event: DrinkLincDailyDoseEvent = {
      id: 'evt-1',
      occurredAt: '2026-09-01T12:00:00.000Z',
      localDate: '2026-09-01',
      status: 'dispensed',
      cartridgeId: 'cart-1',
      ingredients: [{ name: 'Magnesium', amount: 200, unit: 'mg', class: 'mineral' }],
    };
    const adherence: DrinkLincAdherenceSummary = {
      localDate: '2026-09-01',
      plannedDoses: 2,
      completedDoses: 1,
      adherenceRatio: 0.5,
    };
    const regimen: DrinkLincRegimenMetadata = {
      regimenId: 'reg-1',
      label: 'Daily minerals',
      targetDimensions: ['nutrients', 'regimen'],
    };
    const payload: DrinkLincIngestPayload = {
      userId: 'user-1',
      sourceSlug: 'drinklinc',
      events: [event],
      adherence: [adherence],
      regimen,
    };
    expect(payload.sourceSlug).toBe('drinklinc');
    expect(payload.events[0]?.status).toBe('dispensed');
  });
});
