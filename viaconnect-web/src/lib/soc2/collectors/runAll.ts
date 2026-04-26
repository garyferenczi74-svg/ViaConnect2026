// Prompt #122 P3: Collector orchestrator.
//
// Enumerates all DB-sourced collectors, invokes each against the provided
// fetcher + context, collects outputs + attestations. P5 consumes this
// output to assemble the final packet.

import type { Period } from '../types';
import type { CollectorRunCtx, SOC2Collector } from './types';

// ─── P3 DB-sourced collectors ──────────────────────────────────────────────
import { marshallFindingsCollector } from './marshall-findings';
import { marshallIncidentsCollector } from './marshall-incidents';
import { marshallAuditChainCollector } from './marshall-audit-chain';
import { hounddogSignalsCollector } from './hounddog-signals';
import { hounddogFindingsCollector } from './hounddog-findings';
import { precheckSessionsCollector } from './precheck-sessions';
import { precheckReceiptsCollector } from './precheck-receipts';
import { consentLedgerCollector } from './consent-ledger';
import { dsarCollector } from './dsar';
import { vendorBaasCollector } from './vendor-baas';
import { rlsPoliciesCollector } from './rls-policies';
import { migrationsCollector } from './migrations';
import { usersRolesCollector } from './users-roles';
import { privilegedActionsCollector } from './privileged-actions';

// ─── P4 external-API + DB-only collectors ──────────────────────────────────
import { githubPrsCollector } from './github-prs';
import { vercelDeploymentsCollector } from './vercel-deployments';
import { anthropicUsageCollector } from './anthropic-usage';
import { supabaseAdvisorCollector } from './supabase-advisor';
import { dependabotCollector } from './dependabot';
import { uptimeCollector } from './uptime';
import { certExpiryCollector } from './cert-expiry';
import { mfaEnforcementCollector } from './mfa-enforcement';
import { keyRotationCollector } from './key-rotation';
import { npiReverifyCollector } from './npi-reverify';

// ─── Prompt #124 collector ─────────────────────────────────────────────────
import { counterfeitDeterminationsCollector } from './counterfeit-determinations';

// ─── Prompt #125 collector ─────────────────────────────────────────────────
import { schedulerBridgeCollector } from './scheduler-bridge';

// ─── Prompt #138a collector ────────────────────────────────────────────────
import { marketingCopyActivityCollector } from './marketing-copy-activity';

/** All 27 collectors (14 P3 + 10 P4 + 1 from #124 Marshall Vision + 1 from #125 scheduler bridge + 1 from #138a marketing copy). */
export const DB_COLLECTORS: readonly SOC2Collector[] = [
  // P3
  marshallFindingsCollector,
  marshallIncidentsCollector,
  marshallAuditChainCollector,
  hounddogSignalsCollector,
  hounddogFindingsCollector,
  precheckSessionsCollector,
  precheckReceiptsCollector,
  consentLedgerCollector,
  dsarCollector,
  vendorBaasCollector,
  rlsPoliciesCollector,
  migrationsCollector,
  usersRolesCollector,
  privilegedActionsCollector,
  // P4
  githubPrsCollector,
  vercelDeploymentsCollector,
  anthropicUsageCollector,
  supabaseAdvisorCollector,
  dependabotCollector,
  uptimeCollector,
  certExpiryCollector,
  mfaEnforcementCollector,
  keyRotationCollector,
  npiReverifyCollector,
  // #124 Marshall Vision
  counterfeitDeterminationsCollector,
  // #125 Scheduler Bridge
  schedulerBridgeCollector,
  // #138a Marketing-Copy Activity
  marketingCopyActivityCollector,
];

export interface RunAllResult {
  files: Array<{ relativePath: string; bytes: Uint8Array; contentType: string; collectorId: string; controls: readonly string[] }>;
  attestations: Array<Awaited<ReturnType<SOC2Collector['collect']>>['attestation']>;
  errors: Array<{ collectorId: string; error: string }>;
}

export async function runAllCollectors(
  period: Period,
  ctx: CollectorRunCtx,
): Promise<RunAllResult> {
  const out: RunAllResult = { files: [], attestations: [], errors: [] };

  for (const collector of DB_COLLECTORS) {
    try {
      const result = await collector.collect(period, ctx);
      for (const file of result.files) {
        out.files.push({
          relativePath: file.relativePath,
          bytes: file.bytes,
          contentType: file.contentType,
          collectorId: collector.id,
          controls: collector.controls,
        });
      }
      out.attestations.push(result.attestation);
    } catch (err) {
      out.errors.push({ collectorId: collector.id, error: (err as Error).message });
    }
  }

  return out;
}
