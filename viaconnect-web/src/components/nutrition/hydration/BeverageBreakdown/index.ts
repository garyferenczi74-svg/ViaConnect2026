// Prompt 172e Phase D Workstream 1: BeverageBreakdown public surface.
//
// Single named export so the 170o detail view at
// /wellness-analytics/hydration can mount the breakdown without
// reaching into the component tree.

export { BeverageBreakdown } from './BeverageBreakdown';
export type { BreakdownData, BreakdownCategorySegment } from './breakdown-aggregator';
