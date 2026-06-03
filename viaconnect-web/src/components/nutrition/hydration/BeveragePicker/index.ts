// Prompt 172e Phase B: BeveragePicker public surface.
//
// Single named export so the 170o detail view at
// /wellness-analytics/hydration can mount the catalog driven picker without
// reaching into the component tree.

export { BeveragePicker } from './BeveragePicker';
export type {
  BeveragePickerProps,
  BeverageCatalogRow,
  BeverageCategory,
  BeverageLogIntent,
} from './BeveragePicker.types';
