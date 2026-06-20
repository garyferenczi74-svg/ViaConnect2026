// Prompt 172e Phase B: BeveragePicker pure state + selector helpers.
//
// All view logic (filtering by category, search, recents derivation, volume
// step bounds, safety mode suppression of numeric fields) lives in this
// module as pure functions so the picker can be tested without a DOM. The
// React component layer (BeveragePicker.tsx, CategoryGrid.tsx, etc.) is a
// thin presentational shell over these helpers.
//
// 170c section 8 silent UX contract: shouldShowFor*(safetyMode) returns false
// for every per beverage absolute number (kcal, sugar, caffeine, ABV, drink
// count) when safetyMode is true. The picker chrome (category labels, search,
// volume number itself, log button) stays identical across modes so the DOM
// renders the same affordances and the safety mode user gets no visible
// indicator per 170c section 8.4.

import type {
  BeverageCatalogRow,
  BeverageCategory,
  PickerState,
  PickerView,
} from './BeveragePicker.types';

/** Spec section 10: 30 ml floor, 1000 ml ceiling, 50 ml step (or 1 oz). */
export const VOLUME_MIN_ML = 30;
export const VOLUME_MAX_ML = 1000;
export const VOLUME_STEP_ML = 50;
/** 1 oz = ~29.5735 ml. Step rounded to 30 ml when the unit is oz so the */
/* user feels 1 oz increments without fractional ml drift across many taps. */
export const VOLUME_STEP_OZ_AS_ML = 30;

export interface BuildInitialStateArgs {
  recentSlugs?: ReadonlyArray<string>;
  favoriteSlugs?: ReadonlyArray<string>;
}

export function buildInitialState(args: BuildInitialStateArgs = {}): PickerState {
  return {
    view: 'default',
    selectedCategory: null,
    selectedBeverageId: null,
    volumeMl: 0,
    searchQuery: '',
    recentSlugs: args.recentSlugs ?? [],
    favoriteSlugs: args.favoriteSlugs ?? [],
  };
}

/**
 * Transition to category view. Selecting a category resets the beverage
 * selection because the next tap lives one level deeper.
 */
export function openCategory(state: PickerState, category: BeverageCategory): PickerState {
  return {
    ...state,
    view: 'category',
    selectedCategory: category,
    selectedBeverageId: null,
    volumeMl: 0,
  };
}

/**
 * Transition to beverage view. Volume defaults to the catalog row's
 * default_volume_ml so the VolumePicker shows a sensible starting number
 * the user can adjust with the step controls.
 */
export function openBeverage(state: PickerState, row: BeverageCatalogRow): PickerState {
  return {
    ...state,
    view: 'beverage',
    selectedCategory: row.category,
    selectedBeverageId: row.id,
    volumeMl: row.default_volume_ml,
  };
}

/**
 * Transition to the create_custom view so the user can define a personal
 * beverage. Cancel from that view calls backToDefault; on success the
 * component fires onLogged with the new beverage_id and returns to default.
 */
export function openCreateCustom(state: PickerState): PickerState {
  return { ...state, view: 'create_custom' };
}

export function backToDefault(state: PickerState): PickerState {
  return {
    ...state,
    view: 'default',
    selectedCategory: null,
    selectedBeverageId: null,
    volumeMl: 0,
    searchQuery: '',
  };
}

export function backToCategory(state: PickerState): PickerState {
  return {
    ...state,
    view: state.selectedCategory ? 'category' : 'default',
    selectedBeverageId: null,
    volumeMl: 0,
  };
}

export function setSearchQuery(state: PickerState, query: string): PickerState {
  return { ...state, searchQuery: query };
}

export function setVolume(state: PickerState, volumeMl: number): PickerState {
  return { ...state, volumeMl: clampVolume(volumeMl) };
}

export function clampVolume(volumeMl: number): number {
  if (!Number.isFinite(volumeMl)) return VOLUME_MIN_ML;
  return Math.max(VOLUME_MIN_ML, Math.min(VOLUME_MAX_ML, Math.round(volumeMl)));
}

export interface IncrementArgs {
  step?: number;
}

export function incrementVolume(
  state: PickerState,
  args: IncrementArgs = {},
): PickerState {
  const step = args.step ?? VOLUME_STEP_ML;
  return setVolume(state, state.volumeMl + step);
}

export function decrementVolume(
  state: PickerState,
  args: IncrementArgs = {},
): PickerState {
  const step = args.step ?? VOLUME_STEP_ML;
  return setVolume(state, state.volumeMl - step);
}

/**
 * Filter the catalog for the active category. Server returns rows sorted by
 * (category, sort_order) so we preserve order via stable filter.
 */
export function filterByCategory(
  catalog: ReadonlyArray<BeverageCatalogRow>,
  category: BeverageCategory,
): ReadonlyArray<BeverageCatalogRow> {
  return catalog.filter((row) => row.category === category);
}

/**
 * Case insensitive ranked search over display_name, category, and slug.
 * Mirrors the search_beverages RPC shape from prompt 177n so a typed
 * "cof" surfaces the coffee family by matching on category, and "wat"
 * surfaces the water family the same way. Up to 20 matches per spec
 * section 10.
 *
 * Ranking (matches the RPC shape):
 *   100  display_name prefix
 *    70  display_name substring
 *    50  category substring
 *    40  slug substring
 *
 * Ties resolve by the catalog's sort_order then display_name so the
 * canonical ordering the server sends is preserved within a tier.
 */
export const SEARCH_RESULT_LIMIT = 20;

interface RankedRow {
  row: BeverageCatalogRow;
  score: number;
}

export function searchCatalog(
  catalog: ReadonlyArray<BeverageCatalogRow>,
  query: string,
): ReadonlyArray<BeverageCatalogRow> {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) return [];
  const ranked: RankedRow[] = [];
  for (const row of catalog) {
    const name = row.display_name.toLowerCase();
    const category = (row.category as string | null | undefined)?.toLowerCase() ?? '';
    const slug = row.slug.toLowerCase();
    let score = 0;
    if (name.startsWith(trimmed)) score = 100;
    else if (name.includes(trimmed)) score = 70;
    else if (category.includes(trimmed)) score = 50;
    else if (slug.includes(trimmed)) score = 40;
    if (score > 0) ranked.push({ row, score });
  }
  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.row.sort_order !== b.row.sort_order) return a.row.sort_order - b.row.sort_order;
    return a.row.display_name.localeCompare(b.row.display_name);
  });
  return ranked.slice(0, SEARCH_RESULT_LIMIT).map((r) => r.row);
}

/**
 * Resolve the recent and favorite slug arrays into ordered catalog rows.
 * Unknown slugs (catalog row removed since last log) silently drop. Capped
 * at 6 entries per row per spec section 10.
 */
export const RECENTS_ROW_LIMIT = 6;
export const FAVORITES_ROW_LIMIT = 6;

export function resolveRecents(
  catalog: ReadonlyArray<BeverageCatalogRow>,
  recentSlugs: ReadonlyArray<string>,
): ReadonlyArray<BeverageCatalogRow> {
  const bySlug = new Map(catalog.map((r) => [r.slug, r]));
  const out: BeverageCatalogRow[] = [];
  for (const slug of recentSlugs) {
    const row = bySlug.get(slug);
    if (row) out.push(row);
    if (out.length >= RECENTS_ROW_LIMIT) break;
  }
  return out;
}

export function resolveFavorites(
  catalog: ReadonlyArray<BeverageCatalogRow>,
  favoriteSlugs: ReadonlyArray<string>,
): ReadonlyArray<BeverageCatalogRow> {
  const bySlug = new Map(catalog.map((r) => [r.slug, r]));
  const out: BeverageCatalogRow[] = [];
  for (const slug of favoriteSlugs) {
    const row = bySlug.get(slug);
    if (row) out.push(row);
    if (out.length >= FAVORITES_ROW_LIMIT) break;
  }
  return out;
}

/**
 * Find a row by id. Returns null if the catalog has not loaded yet or the
 * id was cleared.
 */
export function findRowById(
  catalog: ReadonlyArray<BeverageCatalogRow>,
  id: string | null,
): BeverageCatalogRow | null {
  if (!id) return null;
  return catalog.find((r) => r.id === id) ?? null;
}

// 170c section 8 silent UX: every per beverage numeric is hidden in safety
// mode. The picker chrome stays identical so there is no visible mode flag.

export function shouldShowKcal(safetyMode: boolean): boolean {
  return !safetyMode;
}

export function shouldShowSugar(safetyMode: boolean): boolean {
  return !safetyMode;
}

export function shouldShowCaffeine(safetyMode: boolean): boolean {
  return !safetyMode;
}

export function shouldShowAbv(safetyMode: boolean): boolean {
  return !safetyMode;
}

/**
 * Alcohol drink count summaries (e.g. "2 drinks today") are suppressed in
 * safety mode per spec section 8. The category card itself stays visible.
 */
export function shouldShowAlcoholDrinkCount(safetyMode: boolean): boolean {
  return !safetyMode;
}

/**
 * Diuretic threshold copy on alcohol entries is suppressed in safety mode.
 */
export function shouldShowDiureticCopy(safetyMode: boolean): boolean {
  return !safetyMode;
}

/**
 * Volume number itself stays visible in safety mode because hydration volume
 * is an affordance, not an evaluative number. Spec section 8.4 carve out.
 */
export function shouldShowVolumeNumber(_safetyMode: boolean): boolean {
  return true;
}

/**
 * Default vs Yours comparison line in the VolumePicker stays visible in both
 * modes. It is a volume scaffold, not a calorie or sugar tally.
 */
export function shouldShowDefaultComparison(_safetyMode: boolean): boolean {
  return true;
}

/**
 * Convenience: derive the next view label for the back affordance. Pure
 * function so the React component can render without computing inline.
 */
export function backDestination(view: PickerView): 'default' | 'category' {
  if (view === 'beverage') return 'category';
  return 'default';
}

export interface RecentEvent {
  beverage_kind: string;
  food_name: string;
}

/**
 * Derive recent slugs from the existing 170o today events list. We do not
 * have direct slugs on the meal_items rows yet (170o stores
 * hydration_source_kind, not the catalog slug), so the picker matches by
 * display_name against the catalog. Order is preserved from the input array.
 * Duplicates are dropped so the recents row shows distinct beverages.
 *
 * v1 limitation: meals logged via the legacy 170o quick log buttons have
 * generic food_name values like "Water" so they match the catalog row
 * water_still. Meals logged through this picker pass the catalog row's
 * display_name through so they map back cleanly.
 */
export function deriveRecentSlugsFromEvents(
  events: ReadonlyArray<RecentEvent>,
  catalog: ReadonlyArray<BeverageCatalogRow>,
): ReadonlyArray<string> {
  const byName = new Map<string, string>();
  for (const row of catalog) {
    byName.set(row.display_name.toLowerCase(), row.slug);
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const ev of events) {
    const slug = byName.get(ev.food_name.toLowerCase());
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
    if (out.length >= RECENTS_ROW_LIMIT) break;
  }
  return out;
}
