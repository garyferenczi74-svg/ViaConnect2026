// Prompt #127 P7: Cross-framework consistency checker.
//
// Runs the 5 P7 rules, upserts the flag set into framework_registry_flags.
// Design notes:
//   - Upsert semantics: if a flag with the same (framework_id, control_ref,
//     flag_kind, related_framework_id, related_control_ref) exists and is
//     still open, bump last_seen_at. If it was resolved but the issue
//     reappears, reopen it by nulling resolved_by/at.
//   - Flags that existed on the previous scan but are not produced by this
//     scan are NOT deleted: they auto-resolve so the operator can see that
//     the issue disappeared. This matches the #122 advisor-flag lifecycle
//     pattern.
//
// The checker does not write packet_id; that is the packet-centric
// framework_consistency_flags table (P1 schema), used at packet-sign time.

import type { SupabaseClient } from '@supabase/supabase-js';
import { loadRegistry } from '@/lib/compliance/frameworks/registry';
import { DB_COLLECTORS } from '@/lib/soc2/collectors/runAll';
import { HIPAA_COLLECTORS } from '@/lib/hipaa/collectors/runAll';
import { ISO_COLLECTORS } from '@/lib/iso/collectors/runAll';
import {
  checkBrokenCrossReferences,
  checkEvidenceSourceCollectors,
  checkSoaExcludesMandatedControl,
  checkAddressableImplementedDrift,
  checkCoverageGap,
} from './rules';
import type { CheckerInput, RegistryFlag } from './types';

export interface ScanOutcome {
  registryVersion: string;
  inserted: number;
  reopened: number;
  refreshed: number;
  autoResolved: number;
  flags: RegistryFlag[];
}

/** Collect the set of known collector IDs across all three framework registries. */
export function buildKnownCollectorIds(): Set<string> {
  return new Set<string>([
    ...DB_COLLECTORS.map((c) => c.id),
    ...HIPAA_COLLECTORS.map((c) => c.id),
    ...ISO_COLLECTORS.map((c) => c.id),
  ]);
}

/** Load the currently-effective SoA per Annex A control_ref (highest version). */
export async function loadEffectiveSoaMap(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
): Promise<Map<string, { applicability: 'applicable' | 'excluded'; implementationStatus: string }>> {
  const { data, error } = await sb
    .from('iso_statements_of_applicability')
    .select('control_ref, version, applicability, implementation_status')
    .order('control_ref', { ascending: true })
    .order('version', { ascending: false });
  if (error) throw new Error(`soa_load_failed: ${error.message}`);
  const out = new Map<string, { applicability: 'applicable' | 'excluded'; implementationStatus: string }>();
  for (const row of (data as Array<{ control_ref: string; applicability: string; implementation_status: string }> | null) ?? []) {
    if (out.has(row.control_ref)) continue;
    out.set(row.control_ref, {
      applicability: row.applicability as 'applicable' | 'excluded',
      implementationStatus: row.implementation_status,
    });
  }
  return out;
}

/** Pure runAll: compose the 5 rules against the input state. */
export function runAllRules(input: CheckerInput): RegistryFlag[] {
  return [
    ...checkBrokenCrossReferences(),
    ...checkEvidenceSourceCollectors(input),
    ...checkSoaExcludesMandatedControl(input),
    ...checkAddressableImplementedDrift(input),
    ...checkCoverageGap(),
  ];
}

interface ExistingFlag {
  id: string;
  framework_id: string;
  control_ref: string;
  flag_kind: string;
  related_framework_id: string | null;
  related_control_ref: string | null;
  resolved_at: string | null;
}

function flagKey(f: { frameworkId: string; controlRef: string; flagKind: string; relatedFrameworkId: string | null; relatedControlRef: string | null }): string {
  return [f.frameworkId, f.controlRef, f.flagKind, f.relatedFrameworkId ?? '', f.relatedControlRef ?? ''].join('|');
}

/**
 * Run the checker and persist results to framework_registry_flags. Uses
 * service-role client (caller must pass in createAdminClient()) because
 * INSERT into the flags table is policy-gated to compliance-admin, and
 * the checker's initial insert is a system action.
 */
export async function runConsistencyScan(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
): Promise<ScanOutcome> {
  const reg = loadRegistry();
  const soaByControlRef = await loadEffectiveSoaMap(admin);
  const knownCollectorIds = buildKnownCollectorIds();

  const flags = runAllRules({ knownCollectorIds, soaByControlRef });

  // Index existing flags
  const { data: existing, error: selErr } = await admin
    .from('framework_registry_flags')
    .select('id, framework_id, control_ref, flag_kind, related_framework_id, related_control_ref, resolved_at');
  if (selErr) throw new Error(`registry_flags_select_failed: ${selErr.message}`);
  const existingRows: ExistingFlag[] = (existing as ExistingFlag[] | null) ?? [];
  const existingByKey = new Map<string, ExistingFlag>();
  for (const row of existingRows) {
    existingByKey.set(flagKey({
      frameworkId: row.framework_id, controlRef: row.control_ref, flagKind: row.flag_kind,
      relatedFrameworkId: row.related_framework_id, relatedControlRef: row.related_control_ref,
    }), row);
  }

  const producedKeys = new Set<string>(flags.map((f) => flagKey(f)));
  const nowIso = new Date().toISOString();
  let inserted = 0;
  let reopened = 0;
  let refreshed = 0;

  for (const f of flags) {
    const key = flagKey(f);
    const prior = existingByKey.get(key);
    if (!prior) {
      const { error } = await admin.from('framework_registry_flags').insert({
        framework_id: f.frameworkId,
        control_ref: f.controlRef,
        related_framework_id: f.relatedFrameworkId,
        related_control_ref: f.relatedControlRef,
        flag_kind: f.flagKind,
        severity: f.severity,
        description: f.description,
        registry_version: f.registryVersion,
      });
      if (error) {
        // eslint-disable-next-line no-console
        console.error('[consistency] insert flag failed', { key, message: error.message });
        continue;
      }
      inserted += 1;
    } else if (prior.resolved_at !== null) {
      // Previously resolved, reappearing: reopen + bump last_seen_at + keep description fresh.
      const { error } = await admin
        .from('framework_registry_flags')
        .update({
          resolved_at: null,
          resolved_by: null,
          resolution_note: null,
          last_seen_at: nowIso,
          severity: f.severity,
          description: f.description,
          registry_version: f.registryVersion,
        })
        .eq('id', prior.id);
      if (error) {
        // eslint-disable-next-line no-console
        console.error('[consistency] reopen flag failed', { id: prior.id, message: error.message });
        continue;
      }
      reopened += 1;
    } else {
      const { error } = await admin
        .from('framework_registry_flags')
        .update({
          last_seen_at: nowIso,
          severity: f.severity,
          description: f.description,
          registry_version: f.registryVersion,
        })
        .eq('id', prior.id);
      if (error) {
        // eslint-disable-next-line no-console
        console.error('[consistency] refresh flag failed', { id: prior.id, message: error.message });
        continue;
      }
      refreshed += 1;
    }
  }

  // Auto-resolve: existing open flags NOT produced by this scan are assumed fixed.
  let autoResolved = 0;
  for (const row of existingRows) {
    if (row.resolved_at !== null) continue;
    const key = flagKey({
      frameworkId: row.framework_id, controlRef: row.control_ref, flagKind: row.flag_kind,
      relatedFrameworkId: row.related_framework_id, relatedControlRef: row.related_control_ref,
    });
    if (producedKeys.has(key)) continue;
    const { error } = await admin
      .from('framework_registry_flags')
      .update({
        resolved_at: nowIso,
        resolution_note: 'Auto-resolved: no longer produced by the consistency checker.',
      })
      .eq('id', row.id);
    if (error) {
      // eslint-disable-next-line no-console
      console.error('[consistency] auto-resolve failed', { id: row.id, message: error.message });
      continue;
    }
    autoResolved += 1;
  }

  return {
    registryVersion: reg.registryVersion,
    inserted,
    reopened,
    refreshed,
    autoResolved,
    flags,
  };
}
