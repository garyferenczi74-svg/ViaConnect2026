// Prompt #125 P2: Composite decision orchestrator.
//
// Input: SchedulerDraft + deps (receipt lookup, precheck runner, vision
// runner). Output: CompositeDecision following the §7.5 table:
//
//   Text clean + media authentic/none  -> PASS
//   Text clean + counterfeit suspected -> BLOCK (vision critical)
//   Text findings P0-P2                -> BLOCK
//   Text findings remediable           -> SURFACE
//   Pipeline error                     -> FAIL_CLOSED
//
// FAIL_CLOSED invariant: no code path returns decision='clean' without
// both text and (when media present) vision completing successfully.

import type {
  CompositeDecision,
  FindingsSummary,
  SchedulerDraft,
} from './types';
import { schedulerLogger } from './logging';

export type PrecheckOutcome =
  | { kind: 'clean'; sessionId: string; ruleRegistryVersion: string }
  | { kind: 'findings'; sessionId: string; ruleRegistryVersion: string; summary: FindingsSummary; remediable: boolean }
  | { kind: 'error'; error: string };

export type VisionOutcome =
  | { kind: 'authentic'; determinationId: string }
  | { kind: 'counterfeit_suspected'; determinationId: string; severity: 'critical' | 'elevated' }
  | { kind: 'not_product_photo' }
  | { kind: 'error'; error: string };

export interface OrchestratorDeps {
  runPrecheck(draft: SchedulerDraft): Promise<PrecheckOutcome>;
  runVision(draft: SchedulerDraft): Promise<VisionOutcome>;
  lookupReceipt(draft: SchedulerDraft): Promise<
    | { hit: false }
    | { hit: true; receiptId: string; ruleRegistryVersion: string }
  >;
  issueReceipt(draft: SchedulerDraft, precheckSessionId: string): Promise<{ receiptId: string }>;
  currentRegistryVersion(): string;
}

/**
 * Orchestrate the composite decision for a scheduler draft. Pure over
 * the injected deps; all I/O goes through the deps so tests never touch
 * the network.
 */
export async function orchestrateDecision(
  draft: SchedulerDraft,
  deps: OrchestratorDeps,
): Promise<CompositeDecision> {
  // 1. Receipt reuse path.
  try {
    const hit = await deps.lookupReceipt(draft);
    if (hit.hit) {
      return {
        decision: 'clean',
        receiptReusedId: hit.receiptId,
        receiptIssuedId: null,
        visionDeterminationId: null,
        precheckSessionId: null,
        ruleRegistryVersion: hit.ruleRegistryVersion,
        interceptionAttempted: false,
      };
    }
  } catch (err) {
    schedulerLogger.warn('[orchestrator] receipt lookup failed; proceeding to full scan', {
      platform: draft.source,
      externalId: draft.externalId,
      error: (err as Error).message,
    });
  }

  // 2. Run text pre-check and (if media present) vision in parallel.
  const hasProductMedia = draft.mediaAttachments.some((m) => m.kind === 'image');
  const [precheck, vision]: [PrecheckOutcome, VisionOutcome] = await Promise.all([
    safePrecheck(draft, deps),
    hasProductMedia ? safeVision(draft, deps) : Promise.resolve<VisionOutcome>({ kind: 'not_product_photo' }),
  ]);

  const registryVersion = precheck.kind === 'error'
    ? deps.currentRegistryVersion()
    : precheck.ruleRegistryVersion;

  // 3. Pipeline error on either leg -> FAIL_CLOSED (no receipt, intercept).
  if (precheck.kind === 'error' || vision.kind === 'error') {
    return {
      decision: 'fail_closed',
      reason: precheck.kind === 'error' ? `precheck_error:${precheck.error}` : `vision_error:${(vision as { kind: 'error'; error: string }).error}`,
      visionDeterminationId: vision.kind === 'authentic' || vision.kind === 'counterfeit_suspected' ? vision.determinationId : null,
      precheckSessionId: precheck.kind === 'error' ? null : precheck.sessionId,
      ruleRegistryVersion: registryVersion,
      interceptionAttempted: true,
    };
  }

  // 4. Vision override: counterfeit suspected on any product image -> BLOCK.
  if (vision.kind === 'counterfeit_suspected') {
    return {
      decision: 'blocked',
      reason: `counterfeit_suspected:${vision.severity}`,
      findingsSummary: precheck.kind === 'findings' ? precheck.summary : undefined,
      visionDeterminationId: vision.determinationId,
      precheckSessionId: precheck.kind === 'findings' ? precheck.sessionId : precheck.sessionId,
      ruleRegistryVersion: registryVersion,
      interceptionAttempted: true,
    };
  }

  // 5. Text findings path.
  if (precheck.kind === 'findings') {
    const highSeverity = precheck.summary.bySeverity.P0 + precheck.summary.bySeverity.P1 + precheck.summary.bySeverity.P2;
    if (highSeverity > 0 && !precheck.remediable) {
      return {
        decision: 'blocked',
        reason: 'text_findings_high_severity',
        findingsSummary: precheck.summary,
        visionDeterminationId: vision.kind === 'authentic' ? vision.determinationId : null,
        precheckSessionId: precheck.sessionId,
        ruleRegistryVersion: registryVersion,
        interceptionAttempted: true,
      };
    }
    return {
      decision: 'findings_surfaced',
      reason: 'text_findings_remediable',
      findingsSummary: precheck.summary,
      visionDeterminationId: vision.kind === 'authentic' ? vision.determinationId : null,
      precheckSessionId: precheck.sessionId,
      ruleRegistryVersion: registryVersion,
      interceptionAttempted: false,
    };
  }

  // 6. Clean path: issue receipt.
  try {
    const { receiptId } = await deps.issueReceipt(draft, precheck.sessionId);
    return {
      decision: 'clean',
      receiptReusedId: null,
      receiptIssuedId: receiptId,
      visionDeterminationId: vision.kind === 'authentic' ? vision.determinationId : null,
      precheckSessionId: precheck.sessionId,
      ruleRegistryVersion: registryVersion,
      interceptionAttempted: false,
    };
  } catch (err) {
    // Receipt issuance failure: fail closed so we don't allow a publish
    // without an auditable receipt.
    schedulerLogger.error('[orchestrator] receipt issuance failed', {
      platform: draft.source,
      externalId: draft.externalId,
      error: (err as Error).message,
    });
    return {
      decision: 'fail_closed',
      reason: 'receipt_issuance_failed',
      visionDeterminationId: vision.kind === 'authentic' ? vision.determinationId : null,
      precheckSessionId: precheck.sessionId,
      ruleRegistryVersion: registryVersion,
      interceptionAttempted: true,
    };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

async function safePrecheck(draft: SchedulerDraft, deps: OrchestratorDeps): Promise<PrecheckOutcome> {
  try {
    return await deps.runPrecheck(draft);
  } catch (err) {
    return { kind: 'error', error: (err as Error).message };
  }
}

async function safeVision(draft: SchedulerDraft, deps: OrchestratorDeps): Promise<VisionOutcome> {
  try {
    return await deps.runVision(draft);
  } catch (err) {
    return { kind: 'error', error: (err as Error).message };
  }
}

export function buildFindingsSummary(
  findings: Array<{ ruleId: string; severity: 'P0' | 'P1' | 'P2' | 'P3' | 'P4' }>,
): FindingsSummary {
  const bySeverity: FindingsSummary['bySeverity'] = { P0: 0, P1: 0, P2: 0, P3: 0, P4: 0 };
  for (const f of findings) bySeverity[f.severity] += 1;
  return {
    total: findings.length,
    bySeverity,
    ruleIds: Array.from(new Set(findings.map((f) => f.ruleId))).sort(),
  };
}
