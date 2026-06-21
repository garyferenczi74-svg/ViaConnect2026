// Prompt 172e Phase B: BeveragePicker types.
//
// Mirrors the shape of GET /api/nutrition/hydration/catalog (route at
// src/app/api/nutrition/hydration/catalog/route.ts). The endpoint returns
// active beverage_catalog rows ordered by category then sort_order. Numeric
// columns come back from Supabase as numbers in JSON; numeric(4,2) and
// numeric(5,1) Postgres types come through as numbers as well, but
// defensively the picker normalizes to number on read.
//
// HydrationSourceKind aliases the canonical 170o enum so the picker can pass
// it straight into the existing useHydrationQuickLog hook without translating
// types at the boundary.

import type { HydrationSourceKind } from '@/lib/nutrition/hydration/types';
import type { UserBeverage, CreateBeverageInput } from '@/components/hydration/useUserBeverages';

export type { HydrationSourceKind };

/**
 * Nine top level UI categories per spec section 4 + section 10. The catalog
 * row category column is text in the schema; this union pins the runtime
 * values the picker recognizes. An unknown category from the server is a
 * Phase B regression and the picker falls back to surfacing the beverage
 * under no category section rather than crashing.
 */
export type BeverageCategory =
  | 'water'
  | 'coffee'
  | 'tea'
  | 'juice'
  | 'pop'
  | 'sports_energy'
  | 'milk'
  | 'functional'
  | 'alcohol';

export const BEVERAGE_CATEGORIES: ReadonlyArray<BeverageCategory> = Object.freeze([
  'water',
  'coffee',
  'tea',
  'juice',
  'pop',
  'sports_energy',
  'milk',
  'functional',
  'alcohol',
]);

export interface BeverageCatalogRow {
  id: string;
  slug: string;
  category: BeverageCategory;
  hydration_source_kind: HydrationSourceKind;
  display_name: string;
  default_volume_ml: number;
  hydration_coefficient: number;
  caffeine_mg_per_serving: number;
  kcal_per_serving: number;
  sugar_g: number;
  sodium_mg: number;
  potassium_mg: number;
  magnesium_mg: number;
  is_alcoholic: boolean;
  abv: number | null;
  evidence_source: string | null;
  requires_claim_review: boolean;
  is_active: boolean;
  sort_order: number;
}

/**
 * Picker view states. The state machine flows:
 *   default -> category -> beverage -> (log) -> default
 *   default -> (search match) -> beverage -> (log) -> default
 * The default view shows favorites, recents, search, and category grid.
 */
export type PickerView = 'default' | 'category' | 'beverage' | 'create_custom';

export interface PickerState {
  view: PickerView;
  selectedCategory: BeverageCategory | null;
  selectedBeverageId: string | null;
  volumeMl: number;
  searchQuery: string;
  /** Last 24h or last session distinct meal beverages, derived from today events. */
  recentSlugs: ReadonlyArray<string>;
  /** Future user_beverage_favorites table or last 30 day frequency derivation. Empty for Phase B v1. */
  favoriteSlugs: ReadonlyArray<string>;
}

/**
 * Telemetry payload emitted on every commit. The parent /wellness-analytics
 * /hydration page wires this to the existing 170o useHydrationQuickLog hook;
 * the picker does not own its own write path.
 */
export interface BeverageLogIntent {
  beverage_kind: HydrationSourceKind;
  volume_ml: number;
  /** Catalog slug. Empty string when logging a custom user beverage (no catalog entry). */
  slug: string;
  /** UUID from user_beverages table. Present only for custom beverages; absent for catalog entries. */
  user_beverage_id?: string;
}

export interface BeveragePickerProps {
  /** Optional volume unit hint per spec 10. Default ml; oz reserved for Phase B+ locale preference. */
  volumeUnit?: 'ml' | 'oz';
  /** Fires when the user taps Log. Parent commits via /api/nutrition/hydration/quick-log. */
  onLogged?: (intent: BeverageLogIntent) => Promise<void> | void;
  /**
   * Prompt 207a Task 6: custom beverages from useUserBeverages.
   * Rendered in the My Beverages shelf (gated behind isCustomBeveragesEnabled).
   * Omit to hide the shelf (flag OFF or not yet loaded).
   */
  userBeverages?: ReadonlyArray<UserBeverage>;
  /**
   * Prompt 207a Task 6: create a new custom beverage.
   * Called from CreateBeverageForm on submit. Null return means the server
   * rejected the input; the form surfaces the error without navigating away.
   */
  onCreateCustom?: (input: CreateBeverageInput) => Promise<UserBeverage | null>;
}

// Re-export so callers can import UserBeverage from this barrel without a
// separate import from the hook module.
export type { UserBeverage, CreateBeverageInput };
