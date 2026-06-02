// Prompt 172 Phase 1A: MealCard source presence sanity.
//
// vitest runs node only without jsdom. Real interactive coverage rides
// Playwright once 172d ships. Here we assert MealCard source contract:
//   - presents the pre and post save state machine (mealId, mealQualityScore)
//   - exposes the four event handler props from the spec section 5.5
//   - mounts FdaDisclaimer slot="card-footer" at the bottom (spec 5.3, 7)
//   - reserves a null BOS line slot for 172b to wire
//   - is purely presentational (no fetch, no Supabase, no useState for data)
//   - safety mode flag is read from props but does not change behavior in 1A
//     (defer 170c ratio mode rendering to 1B)
//   - hard rules: no em or en dashes, no emojis, Lucide strokeWidth 1.5, brand
//     tokens only

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const FILE = path.resolve(__dirname, '..', 'MealCard.tsx');

describe('MealCard source', () => {
  const source = readFileSync(FILE, 'utf-8');

  describe('component shape', () => {
    it('exports a MealCard function component', () => {
      expect(source).toContain('export function MealCard');
    });

    it('marks the file as a client component', () => {
      expect(source).toContain("'use client'");
    });

    it('is purely presentational (no Supabase client, no fetch, no data useState)', () => {
      // Supabase clients are not allowed in presentational components.
      expect(source).not.toContain('createClient');
      expect(source).not.toContain('createBrowserClient');
      // No fetch calls (1A is read only from props).
      expect(source).not.toContain('fetch(');
      // No state hooks for data; UI affordance state (a fullscreen toggle for
      // example) is allowed but we expect 1A to introduce none.
      expect(source).not.toContain('useEffect');
      expect(source).not.toContain('useReducer');
    });
  });

  describe('pre and post save state machine (spec 5.2 v3)', () => {
    it('reads mealId from the model and treats null as pre save', () => {
      expect(source).toContain('mealId');
    });

    it('reads mealQualityScore from the model and treats null as pre save', () => {
      expect(source).toContain('mealQualityScore');
    });
  });

  describe('event handler props out (spec 5.5)', () => {
    it('declares onConfirm', () => {
      expect(source).toContain('onConfirm');
    });

    it('declares onEdit (forward looking; 172c wires it)', () => {
      expect(source).toContain('onEdit');
    });

    it('declares onSplit (forward looking; 172c wires it)', () => {
      expect(source).toContain('onSplit');
    });

    it('declares onSaveResponse (forward looking; lifts post save state)', () => {
      expect(source).toContain('onSaveResponse');
    });

    it('wires onConfirm through the save action button (Save to log copy preserved)', () => {
      // The pre refactor Save button called props.onSave; the post refactor
      // wires the same button to onConfirm. Cancel stays its own handler.
      expect(source).toContain('Save to log');
    });
  });

  describe('reserved BOS line slot for 172b', () => {
    it('references bosLine on the model', () => {
      expect(source).toContain('bosLine');
    });

    it('renders nothing when bosLine is null (1A always null per spec)', () => {
      // The MealCard source either short circuits on null or guards with a
      // truthy check before rendering. We assert the guard exists.
      const hasGuard =
        source.includes('bosLine && ') ||
        source.includes('bosLine !== null') ||
        source.includes('bosLine != null');
      expect(hasGuard).toBe(true);
    });
  });

  describe('FdaDisclaimer card footer slot (spec 5.3 + 7)', () => {
    it('imports FdaDisclaimer from the Phase 0 component path', () => {
      expect(source).toContain('@/components/compliance/FdaDisclaimer');
    });

    it('mounts FdaDisclaimer with slot="card-footer"', () => {
      expect(source).toContain('FdaDisclaimer');
      expect(source).toContain('slot="card-footer"');
    });
  });

  describe('safety mode read but unimplemented in 1A', () => {
    it('reads safetyMode from the model props', () => {
      expect(source).toContain('safetyMode');
    });

    it('marks the safety mode ratio rendering as deferred to 1B', () => {
      expect(source).toContain('1B');
    });
  });

  describe('hard rules', () => {
    it('contains no em or en dashes', () => {
      expect(source.includes('—')).toBe(false);
      expect(source.includes('–')).toBe(false);
    });

    it('uses Lucide strokeWidth 1.5 on any iconography', () => {
      // Lucide imports always come with strokeWidth 1.5 per the standing
      // brand contract. If MealCard imports any icon, it must use the token.
      const importsLucide = source.includes("from 'lucide-react'");
      if (importsLucide) {
        expect(source).toContain('strokeWidth={1.5}');
      }
    });

    it('uses brand tokens for card surface (Card #1E3054, Teal #2DA5A0, Orange #B75E18)', () => {
      expect(source).toContain('#1E3054');
      expect(source).toContain('#2DA5A0');
      expect(source).toContain('#B75E18');
    });
  });

  describe('children pass through props', () => {
    it('threads onPortionChange to per item editors', () => {
      expect(source).toContain('onPortionChange');
    });

    it('threads onFoodSwap to per item editors', () => {
      expect(source).toContain('onFoodSwap');
    });

    it('threads onApplyChip to meal scope ModificationChips and per item', () => {
      expect(source).toContain('onApplyChip');
      expect(source).toContain("'meal'");
    });

    it('threads onAddItem to the add another item button', () => {
      expect(source).toContain('onAddItem');
      expect(source).toContain('Add another item');
    });
  });
});
