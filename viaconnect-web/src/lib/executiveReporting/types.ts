// Prompt #105 executive reporting — types.

export type AggregationSnapshotState =
  | 'draft'
  | 'computing'
  | 'computed'
  | 'cfo_review'
  | 'cfo_approved'
  | 'locked'
  | 'failed';

export type AggregationPeriodType =
  | 'monthly'
  | 'quarterly'
  | 'annual'
  | 'trailing_12_months'
  | 'ytd'
  | 'ad_hoc';

export type PackState =
  | 'draft'
  | 'mdna_pending'
  | 'mdna_drafted'
  | 'cfo_review'
  | 'cfo_approved'
  | 'pending_ceo_approval'
  | 'issued'
  | 'erratum_issued'
  | 'archived';

export type BoardMemberRole = 'director' | 'advisor' | 'observer' | 'executive' | 'auditor';

export type NDAStatus =
  | 'not_submitted'
  | 'submitted'
  | 'under_review'
  | 'on_file'
  | 'expired';

export type ArtifactFormat = 'pdf' | 'xlsx' | 'pptx';

export type CommentarySource =
  | 'system'
  | 'ai_drafted'
  | 'human_authored'
  | 'ai_drafted_human_edited';

export type KPIComputationType = 'sum' | 'avg' | 'median' | 'ratio' | 'count' | 'custom';

export type DirectionOfGood = 'higher_is_better' | 'lower_is_better' | 'context_dependent';

export interface KPIDefinition {
  kpiId: string;
  version: number;
  displayName: string;
  definitionMd: string;
  sourcePrompt: string;
  sourceTable: string;
  sourceQuerySha256: string;
  computationType: KPIComputationType;
  unit: string;
  displayFormat: string;
  directionOfGood: DirectionOfGood;
  comparisonKpiIds: string[];
  ownerRole: string;
  status: 'active' | 'retired';
}

export interface KPISnapshot {
  snapshotId: string;
  aggregationSnapshotId: string;
  kpiId: string;
  kpiVersion: number;
  computedValueNumeric: number | null;
  computedValueInteger: number | null;
  computedValueJson: Record<string, unknown> | null;
  unit: string;
  priorPeriodValue: number | null;
  comparisonDeltaPct: number | null;
  provenanceJson: {
    sourceTableVersion?: string;
    rowCount?: number;
    queryHash?: string;
    computationDurationMs?: number;
    [k: string]: unknown;
  };
  computedAt: string;
}
