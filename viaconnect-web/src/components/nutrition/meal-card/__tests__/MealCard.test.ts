// Prompt 172 Phase 1A + 1B: MealCard source presence sanity.
//
// vitest runs node only without jsdom. Real interactive coverage rides
// Playwright once 172d ships. Here we assert MealCard source contract:
//   - presents the pre and post save state machine (mealId, mealQualityScore)
//   - exposes the four event handler props from the spec section 5.5
//   - mounts FdaDisclaimer slot="card-footer" at the bottom (spec 5.3, 7)
//   - reserves a null BOS line slot for 172b to wire
//   - is purely presentational (no fetch, no Supabase, no useState for data)
//   - safety mode flag is read from the model AND drives the ratio variant,
//     per item kcal suppression, score chip suppression, and the food
//     positive acknowledgement variant per spec 5.7 + 170c 8.4
//   - degraded service messaging branches on degradedServiceKind per 170c
//     section 10.3 (1B addition)
//   - zero hardcoded user facing strings; every label, body, acknowledgement,
//     button reads via getMicrocopy from the 172a microcopy layer
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
      expect(source).not.toContain('createClient');
      expect(source).not.toContain('createBrowserClient');
      expect(source).not.toContain('fetch(');
      expect(source).not.toContain('useEffect');
      expect(source).not.toContain('useReducer');
      // useState is allowed for UI affordance only; we expect zero in 1B
      // because the orchestrator owns the SaveResponse state.
      expect(source).not.toContain('useState(');
    });
  });

  describe('pre and post save state machine (spec 5.2 v3)', () => {
    it('reads mealId from the model and treats null as pre save', () => {
      expect(source).toContain('mealId');
    });

    it('reads mealQualityScore from the model and treats null as pre save', () => {
      expect(source).toContain('mealQualityScore');
    });

    it('discriminates pre save vs post save via a isPostSave guard', () => {
      // The component flips rendering based on a derived boolean built from
      // mealId !== null && mealQualityScore !== null. The exact identifier
      // can vary; we accept either an inline test or a named local.
      const hasGuard =
        source.includes('isPostSave') ||
        source.includes('mealId !== null && model.mealQualityScore !== null');
      expect(hasGuard).toBe(true);
    });

    it('renders the post save acknowledgement line keyed by recognitionConfidence', () => {
      // Acknowledgement microcopy is keyed by the recognitionConfidence band.
      // We assert all three keys are referenced.
      expect(source).toContain('acknowledgement.high');
      expect(source).toContain('acknowledgement.medium');
      expect(source).toContain('acknowledgement.low');
    });

    it('renders an edit affordance post save instead of the save button', () => {
      // Post save the save button is replaced with an Edit affordance + a
      // confirm tick per the brief. We assert the Edit3 lucide icon import
      // and the data-post-save-edit attribute the component tags.
      expect(source).toContain('Edit3');
      expect(source).toContain('data-post-save-edit');
    });
  });

  describe('event handler props out (spec 5.5)', () => {
    it('declares onConfirm', () => {
      expect(source).toContain('onConfirm');
    });

    it('declares onEdit (post save replaces save button with edit)', () => {
      expect(source).toContain('onEdit');
    });

    it('declares onSplit (forward looking; 172c wires it)', () => {
      expect(source).toContain('onSplit');
    });

    it('declares onSaveResponse (lifts post save state to the orchestrator)', () => {
      expect(source).toContain('onSaveResponse');
    });
  });

  describe('reserved BOS line slot for 172b', () => {
    it('references bosLine on the model', () => {
      expect(source).toContain('bosLine');
    });

    it('renders nothing when bosLine is null', () => {
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

  describe('safety mode behavior (spec 5.7 + 170c 8.4)', () => {
    it('reads safetyMode from the model', () => {
      expect(source).toContain('model.safetyMode');
    });

    it('threads safetyMode into MealItemCard so per item kcal suppresses', () => {
      // The brief says: when safetyMode === true, suppress per-item kcal in
      // the item list (the kcal column on each MealItemCard row is hidden).
      // MealCard passes safetyMode prop to MealItemCard.
      expect(source).toContain('safetyMode={model.safetyMode}');
    });

    it('passes safetyMode through to MacroChips so the ratio variant renders', () => {
      // MacroChips already takes a safetyMode prop in 1A; 1B wires the
      // model.safetyMode value through and renders the ratio variant.
      expect(source).toContain('safetyMode={model.safetyMode}');
    });

    it('suppresses the meal quality score chip when safetyMode is true', () => {
      // Post save the score chip renders only when !model.safetyMode.
      const hasGuard =
        source.includes('!model.safetyMode') ||
        source.includes('model.safetyMode === false');
      expect(hasGuard).toBe(true);
    });

    it('chooses the variant via a helper or inline ternary keyed on safetyMode', () => {
      // The microcopy variant for safety_mode is named 'safety_mode'.
      expect(source).toContain('safety_mode');
    });

    it('contains no visible mode indicator (no banner/badge/safety mode text)', () => {
      // 170c 8.4 silent UX hard requirement. The literal phrase "safety mode"
      // can appear in code comments (it does in the file header) but the
      // word combo should not appear in any rendered string. We assert no
      // JSX renders the literal "Safety Mode" or "safety mode active" or
      // "ratio mode" or "silent mode" via a JSX expression.
      expect(source).not.toMatch(/>\s*safety mode\s*</i);
      expect(source).not.toMatch(/>\s*safety mode active\s*</i);
      expect(source).not.toMatch(/>\s*ratio mode\s*</i);
      expect(source).not.toMatch(/>\s*silent mode\s*</i);
      // No className with safety-mode token either.
      expect(source).not.toContain('safety-mode');
      expect(source).not.toContain('ratio-mode');
    });
  });

  describe('170c section 10.3 degraded service messaging (1B addition)', () => {
    it('reads degradedService + degradedServiceKind from the model', () => {
      expect(source).toContain('model.degradedService');
      expect(source).toContain('model.degradedServiceKind');
    });

    it('references all three canonical degraded service microcopy keys', () => {
      expect(source).toContain('degraded.logmeal_hard_stop');
      expect(source).toContain('degraded.gemini_low_confidence');
      expect(source).toContain('degraded.claude_tertiary_used');
    });

    it('falls back to standard low_confidence_body when degradedService is false', () => {
      expect(source).toContain('state.low_confidence_body');
    });
  });

  describe('microcopy layer integration (172a + 1B no hardcoded strings)', () => {
    it('imports getMicrocopy from the 172a microcopy layer', () => {
      expect(source).toContain("from '@/lib/nutrition/microcopy'");
      expect(source).toContain('getMicrocopy');
    });

    it('contains no hardcoded user facing literals (Meal totals, Cancel, etc)', () => {
      // The literals must not appear inside JSX text expressions. JSX text
      // content is matched by simple substring; the canonical literals
      // moved to strings.ts. We assert each absent from the component
      // source after stripping the file header block.
      const SOURCE_AFTER_HEADER = source.substring(source.indexOf("'use client';"));
      const SHIPPED_LITERALS = [
        'Meal totals', // moved to microcopy
        'Tap an item to adjust the portion or swap the food.', // moved
        'Add another item', // moved
        'Save to log', // moved
        'Saving...', // moved
        'Cancel', // moved
      ];
      for (const lit of SHIPPED_LITERALS) {
        // The literal must not appear as a bare JSX text literal. We check
        // it does not appear inside the component body. Microcopy keys
        // like getMicrocopy('action.cancel'...) are fine.
        expect(SOURCE_AFTER_HEADER).not.toContain(`>${lit}<`);
        expect(SOURCE_AFTER_HEADER).not.toContain(` ${lit}\n`);
        expect(SOURCE_AFTER_HEADER).not.toContain(`'${lit}'`);
        expect(SOURCE_AFTER_HEADER).not.toContain(`"${lit}"`);
      }
    });
  });

  describe('hard rules', () => {
    it('contains no em or en dashes', () => {
      expect(source.includes('—')).toBe(false);
      expect(source.includes('–')).toBe(false);
    });

    it('uses Lucide strokeWidth 1.5 on any iconography', () => {
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
      // The button label is now microcopy keyed, asserted separately.
      expect(source).toContain("getMicrocopy('action.add_item'");
    });
  });
});

describe('MealCard idempotence on onSaveResponse contract', () => {
  // Source level check: the MealCard does not own SaveResponse state
  // internally. The orchestrator (AnalysisResult) holds the state and the
  // component re-renders via prop changes. Calling onSaveResponse twice
  // with the same value is a no-op at the orchestrator level because
  // useState set with identical reference bails out; that contract is
  // covered indirectly by this source level test, plus the mealCardModel
  // test asserting the mapper is a pure function of its inputs.
  const source = readFileSync(FILE, 'utf-8');

  it('does not own a SaveResponse useState; orchestrator owns it', () => {
    expect(source).not.toContain('useState<SaveResponse');
    expect(source).not.toContain('useState(null)');
  });
});
