// Prompt 207a Task 6: custom beverage form + My Beverages shelf tests.
//
// Three test axes:
//   1. Pure picker-state transitions for create_custom view.
//   2. Source-as-text assertions for flag gating in BeveragePicker.tsx.
//   3. Source-as-text assertions for custom log intent in HydrationFullSection.tsx.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  buildInitialState,
  openCreateCustom,
  backToDefault,
} from '../picker-state';
import type { PickerState } from '../BeveragePicker.types';

// ---------------------------------------------------------------------------
// 1. Pure state machine: create_custom view transitions
// ---------------------------------------------------------------------------

describe('openCreateCustom', () => {
  it('transitions from default to create_custom', () => {
    const s0 = buildInitialState();
    const s1 = openCreateCustom(s0);
    expect(s1.view).toBe('create_custom');
  });

  it('preserves all other state fields unchanged', () => {
    const s0: PickerState = {
      ...buildInitialState(),
      recentSlugs: ['water_still'],
      favoriteSlugs: ['coffee_drip'],
    };
    const s1 = openCreateCustom(s0);
    expect(s1.recentSlugs).toEqual(['water_still']);
    expect(s1.favoriteSlugs).toEqual(['coffee_drip']);
    expect(s1.selectedCategory).toBeNull();
    expect(s1.selectedBeverageId).toBeNull();
  });

  it('returns a new object (immutable)', () => {
    const s0 = buildInitialState();
    const s1 = openCreateCustom(s0);
    expect(s1).not.toBe(s0);
  });
});

describe('backToDefault from create_custom', () => {
  it('returns view to default from create_custom', () => {
    const s0 = buildInitialState();
    const s1 = openCreateCustom(s0);
    expect(s1.view).toBe('create_custom');
    const s2 = backToDefault(s1);
    expect(s2.view).toBe('default');
  });
});

// ---------------------------------------------------------------------------
// 2. Source-as-text: BeveragePicker.tsx flag gating
// ---------------------------------------------------------------------------

const PICKER_SRC = readFileSync(
  path.resolve(__dirname, '..', 'BeveragePicker.tsx'),
  'utf8',
);

describe('BeveragePicker flag gating (source-as-text)', () => {
  it('imports isCustomBeveragesEnabled from the flag module', () => {
    expect(PICKER_SRC).toContain(
      "isCustomBeveragesEnabled",
    );
    expect(PICKER_SRC).toContain(
      "custom-beverages-flag",
    );
  });

  it('gates My Beverages shelf and create affordance behind isCustomBeveragesEnabled()', () => {
    expect(PICKER_SRC).toContain('isCustomBeveragesEnabled()');
  });

  it('renders MyBeveragesRow in the default view', () => {
    expect(PICKER_SRC).toContain('MyBeveragesRow');
  });

  it('renders CreateBeverageForm for create_custom view', () => {
    expect(PICKER_SRC).toContain('CreateBeverageForm');
    expect(PICKER_SRC).toContain("'create_custom'");
  });

  it('contains a Create my own button using Lucide Plus icon', () => {
    expect(PICKER_SRC).toContain('Plus');
    expect(PICKER_SRC).toContain('Create my own');
  });

  it('calls openCreateCustom when Create my own is tapped', () => {
    expect(PICKER_SRC).toContain('openCreateCustom');
  });

  it('passes userBeverages and onCreateCustom through to children', () => {
    expect(PICKER_SRC).toContain('userBeverages');
    expect(PICKER_SRC).toContain('onCreateCustom');
  });

  it('has no em-dashes or en-dashes', () => {
    const enDash = String.fromCharCode(0x2013);
    const emDash = String.fromCharCode(0x2014);
    expect(PICKER_SRC.includes(enDash)).toBe(false);
    expect(PICKER_SRC.includes(emDash)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Source-as-text: HydrationFullSection.tsx custom log intent
// ---------------------------------------------------------------------------

const SECTION_SRC = readFileSync(
  path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    'hydration',
    'HydrationFullSection.tsx',
  ),
  'utf8',
);

describe('HydrationFullSection custom log intent (source-as-text)', () => {
  it('imports useUserBeverages', () => {
    expect(SECTION_SRC).toContain('useUserBeverages');
  });

  it('passes userBeverages to BeveragePicker', () => {
    expect(SECTION_SRC).toContain('userBeverages=');
  });

  it('passes onCreateCustom to BeveragePicker', () => {
    expect(SECTION_SRC).toContain('onCreateCustom=');
  });

  it('passes user_beverage_id to logBeverage when present', () => {
    expect(SECTION_SRC).toContain('user_beverage_id');
    expect(SECTION_SRC).toContain('intent.user_beverage_id');
  });

  it('only passes beverage_slug when intent.slug is non-empty', () => {
    // The slug guard must check for non-empty string before forwarding.
    expect(SECTION_SRC).toContain('intent.slug');
  });

  it('has no em-dashes or en-dashes', () => {
    const enDash = String.fromCharCode(0x2013);
    const emDash = String.fromCharCode(0x2014);
    expect(SECTION_SRC.includes(enDash)).toBe(false);
    expect(SECTION_SRC.includes(emDash)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Source-as-text: BeveragePicker.types.ts shape
// ---------------------------------------------------------------------------

const TYPES_SRC = readFileSync(
  path.resolve(__dirname, '..', 'BeveragePicker.types.ts'),
  'utf8',
);

describe('BeveragePicker.types.ts shape (source-as-text)', () => {
  it('BeverageLogIntent includes optional user_beverage_id', () => {
    expect(TYPES_SRC).toContain('user_beverage_id');
    expect(TYPES_SRC).toContain('user_beverage_id?: string');
  });

  it('PickerView union includes create_custom', () => {
    expect(TYPES_SRC).toContain("'create_custom'");
  });

  it('BeveragePickerProps includes userBeverages', () => {
    expect(TYPES_SRC).toContain('userBeverages');
  });

  it('BeveragePickerProps includes onCreateCustom', () => {
    expect(TYPES_SRC).toContain('onCreateCustom');
  });
});

// ---------------------------------------------------------------------------
// 5. Source-as-text: CreateBeverageForm.tsx exists and has key affordances
// ---------------------------------------------------------------------------

const FORM_SRC = readFileSync(
  path.resolve(__dirname, '..', 'CreateBeverageForm.tsx'),
  'utf8',
);

describe('CreateBeverageForm.tsx (source-as-text)', () => {
  it('has a display_name input', () => {
    expect(FORM_SRC).toContain('display_name');
  });

  it('has a category select over BEVERAGE_CATEGORIES', () => {
    expect(FORM_SRC).toContain('BEVERAGE_CATEGORIES');
    expect(FORM_SRC).toContain('category');
  });

  it('has a default_volume_ml number input', () => {
    expect(FORM_SRC).toContain('default_volume_ml');
  });

  it('shows caffeine field only for CAFFEINE_CATEGORIES', () => {
    expect(FORM_SRC).toContain('CAFFEINE_CATEGORIES');
    expect(FORM_SRC).toContain('caffeine_mg');
  });

  it('calls onCreateCustom on submit', () => {
    expect(FORM_SRC).toContain('onCreateCustom');
  });

  it('calls onLogged after successful create', () => {
    expect(FORM_SRC).toContain('onLogged');
  });

  it('uses Lucide icons with strokeWidth 1.5', () => {
    expect(FORM_SRC).toContain('strokeWidth={1.5}');
  });

  it('has no em-dashes or en-dashes', () => {
    const enDash = String.fromCharCode(0x2013);
    const emDash = String.fromCharCode(0x2014);
    expect(FORM_SRC.includes(enDash)).toBe(false);
    expect(FORM_SRC.includes(emDash)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. Source-as-text: MyBeveragesRow.tsx exists and fires correct intent
// ---------------------------------------------------------------------------

const MY_BEV_SRC = readFileSync(
  path.resolve(__dirname, '..', 'MyBeveragesRow.tsx'),
  'utf8',
);

describe('MyBeveragesRow.tsx (source-as-text)', () => {
  it('renders chips for custom beverages', () => {
    expect(MY_BEV_SRC).toContain('UserBeverage');
  });

  it('fires onLogged with user_beverage_id and empty slug', () => {
    expect(MY_BEV_SRC).toContain('user_beverage_id');
    expect(MY_BEV_SRC).toContain("slug: ''");
  });

  it('uses Lucide icon with strokeWidth 1.5', () => {
    expect(MY_BEV_SRC).toContain('strokeWidth={1.5}');
  });

  it('has no em-dashes or en-dashes', () => {
    const enDash = String.fromCharCode(0x2013);
    const emDash = String.fromCharCode(0x2014);
    expect(MY_BEV_SRC.includes(enDash)).toBe(false);
    expect(MY_BEV_SRC.includes(emDash)).toBe(false);
  });
});
