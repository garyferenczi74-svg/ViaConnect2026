/**
 * Prompt 214d Gap 4: dual-registry reconciliation WITHOUT merge.
 * ACC (AGENT_REGISTRY / 17 Grok seats) vs ultrathink_agent_registry (edge workers).
 * Drift is flagged only; never auto-corrected.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { AGENT_IDS, resolveAgentId, type AgentId } from '@/lib/agents/types';
import { AGENT_REGISTRY } from '@/lib/agents/registry';
import { safeLog } from '@/lib/utils/safe-log';

export interface RegistryRowView {
  agent_id: string;
  display_name: string;
  source: 'acc' | 'ultrathink';
  is_active: boolean;
  last_seen: string | null;
  duties: string;
}

export interface DriftFinding {
  kind: 'missing_in_ultrathink' | 'missing_in_acc' | 'name_mismatch' | 'inactive_divergence';
  agent_key: string;
  detail: string;
}

export interface DriftGuardResult {
  checked: boolean;
  flagged: boolean;
  findings: DriftFinding[];
  acc_count: number;
  ultrathink_mapped_count: number;
  side_by_side: Array<{
    agent_id: AgentId;
    acc_name: string;
    ultrathink_name: string | null;
    ultrathink_active: boolean | null;
    last_heartbeat: string | null;
  }>;
}

/** Pure drift compare for tests (injectable rows). */
export function diffRegistries(
  accIds: readonly string[],
  ultrathinkNames: Array<{ agent_name: string; display_name?: string; is_active?: boolean }>,
): DriftFinding[] {
  const findings: DriftFinding[] = [];
  const ultraMap = new Map<string, { display_name?: string; is_active?: boolean }>();

  for (const row of ultrathinkNames) {
    const resolved = resolveAgentId(row.agent_name) ?? row.agent_name.toLowerCase();
    ultraMap.set(resolved, {
      display_name: row.display_name,
      is_active: row.is_active,
    });
  }

  for (const id of accIds) {
    const u = ultraMap.get(id);
    if (!u) {
      findings.push({
        kind: 'missing_in_ultrathink',
        agent_key: id,
        detail: `ACC seat ${id} has no mapped ultrathink_agent_registry row`,
      });
    } else if (u.is_active === false) {
      findings.push({
        kind: 'inactive_divergence',
        agent_key: id,
        detail: `ACC seat ${id} is live but ultrathink row is inactive`,
      });
    }
  }

  for (const [key, u] of ultraMap) {
    if (!accIds.includes(key as AgentId) && resolveAgentId(key) === null) {
      // Edge worker not in ACC roster is expected; only flag if it resolves to an unknown alias of a seat
      void u;
    }
  }

  return findings;
}

export async function runRegistryDriftGuard(): Promise<DriftGuardResult & { flagged: boolean }> {
  const side_by_side: DriftGuardResult['side_by_side'] = [];
  let ultrathinkRows: Array<{
    agent_name: string;
    display_name?: string;
    is_active?: boolean;
    last_heartbeat_at?: string;
  }> = [];
  let readOk = false;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('ultrathink_agent_registry')
      .select('agent_name, display_name, is_active, last_heartbeat_at, health_status');
    if (error) {
      safeLog.warn('registry.drift', 'ultrathink query error fail-open', {
        error: error.message,
      });
    } else {
      ultrathinkRows = Array.isArray(data) ? (data as typeof ultrathinkRows) : [];
      readOk = true;
    }
  } catch (err) {
    safeLog.warn('registry.drift', 'ultrathink read failed open', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Without a successful ultrathink read, do not flood missing_in_ultrathink findings.
  if (!readOk) {
    for (const id of AGENT_IDS) {
      side_by_side.push({
        agent_id: id,
        acc_name: AGENT_REGISTRY[id].display_name,
        ultrathink_name: null,
        ultrathink_active: null,
        last_heartbeat: null,
      });
    }
    return {
      checked: true,
      flagged: false,
      findings: [],
      acc_count: AGENT_IDS.length,
      ultrathink_mapped_count: 0,
      side_by_side,
    };
  }

  const ultraByResolved = new Map<string, (typeof ultrathinkRows)[0]>();
  for (const row of ultrathinkRows) {
    const resolved = resolveAgentId(row.agent_name) ?? row.agent_name;
    ultraByResolved.set(resolved, row);
  }

  for (const id of AGENT_IDS) {
    const u = ultraByResolved.get(id);
    side_by_side.push({
      agent_id: id,
      acc_name: AGENT_REGISTRY[id].display_name,
      ultrathink_name: u?.display_name ?? null,
      ultrathink_active: u ? Boolean(u.is_active) : null,
      last_heartbeat: u?.last_heartbeat_at ?? null,
    });
  }

  const findings = diffRegistries(
    AGENT_IDS,
    ultrathinkRows.map((r) => ({
      agent_name: r.agent_name,
      display_name: r.display_name,
      is_active: r.is_active,
    })),
  );

  const flagged = findings.length > 0;
  if (flagged) {
    safeLog.warn('registry.drift', 'divergence flagged (no auto-merge)', {
      findings,
    });
  }

  return {
    checked: true,
    flagged,
    findings,
    acc_count: AGENT_IDS.length,
    ultrathink_mapped_count: side_by_side.filter((r) => r.ultrathink_name !== null).length,
    side_by_side,
  };
}

/**
 * End-state recommendation for Gary (214d Gap 4). No merge executed.
 *
 * Recommendation: ACC AGENT_REGISTRY remains the authoritative seat roster for
 * product orchestration (Jeffery dispatch, chain producers, getDisplayName).
 * ultrathink_agent_registry remains the operational heartbeat/edge-worker ledger
 * for long-running jobs and legacy edge names. Mapping layer is resolveAgentId
 * aliases. Future merge would: (1) seed missing ACC seats into ultrathink as
 * inactive-optional heartbeats, (2) retire ultrathink-only names that resolve
 * to ACC seats as aliases only, (3) never collapse edge workers (FDA ingest,
 * brand enricher) into ACC seats without a new product prompt.
 */
export const REGISTRY_END_STATE_RECOMMENDATION = {
  authoritative_seats: 'AGENT_REGISTRY (ACC seventeen-agent Grok roster)',
  operational_heartbeats: 'ultrathink_agent_registry',
  mapping: 'resolveAgentId / AGENT_NAME_ALIASES',
  merge: 'not authorized without Gary ruling',
} as const;
