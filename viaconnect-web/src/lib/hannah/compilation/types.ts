/**
 * Prompt 213a: Hannah daily insight compilation contracts.
 * Hannah is the COMPOSER; suppliers expose digests only.
 */

export type SourceHub =
  | 'CAQ'
  | 'Genetics'
  | 'Labs'
  | 'Biology'
  | 'Nutrition'
  | 'Supplements';

export type SupplierAgent =
  | 'gordon'
  | 'arnold'
  | 'jeffery'
  | 'sherlock'
  | 'hounddog'
  | 'user_input'
  | 'hannah'
  | 'thanos'
  | 'elysium';

export interface DigestItem {
  id: string;
  hub: SourceHub;
  summary: string;
  /** When null/UNKNOWN, never coerce to 0 in composition. */
  metricLabel?: string;
  metricValue?: string | null;
  refs?: string[];
}

export interface SupplierDigest {
  supplier: SupplierAgent;
  ok: boolean;
  skipped?: boolean;
  skipReason?: string;
  durationMs: number;
  items: DigestItem[];
}

export interface ComposedInsight {
  insightKey: string;
  title: string;
  description: string;
  category: string;
  sourceHub: SourceHub;
  supplierAgent: SupplierAgent;
  sourceRefs: string[];
  estimatedImpact: number;
  priority: number;
}

/** Prompt 216d: personal Hannah note produced with each compile. */
export interface ComposedHannahNoteResult {
  noteText: string;
  noteKind: 'compiled' | 'welcome';
  sourceRefs: string[];
  supplierAgents: string[];
  readTodaySnapshot: string;
  generatedAt: string;
}

export interface CompilationResult {
  runId: string;
  userId: string;
  runDate: string;
  status: 'ok' | 'partial' | 'failed';
  digests: SupplierDigest[];
  insights: ComposedInsight[];
  personalized: {
    greeting: string;
    analysis: string;
    recommendation: string;
    focusArea: string;
    estimatedImpact: number;
  };
  /** Prompt 216d daily personal note (always set on successful compose path). */
  hannahNote: ComposedHannahNoteResult;
  startedAt: string;
  endedAt: string;
}

export type DigestFn = (
  userId: string,
  sinceIso: string,
) => Promise<SupplierDigest>;
