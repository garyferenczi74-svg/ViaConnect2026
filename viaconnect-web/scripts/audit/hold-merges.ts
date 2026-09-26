// HOLD check for the 29 autoheal merges.
// A table is held (no ALTER POLICY emitted) when a merged policy's normalized
// expression is not the OR of its originals, or when migration history is
// complete and disagrees. The known WITH CHECK bug (ALL/UPDATE original with
// no WITH CHECK, merged with one that had a WITH CHECK) is always a hold.

import {
  branchesEqual,
  canonicalOrBranches,
  effectiveWithCheck,
  migrationCompareKey,
  migrationKeysEqual,
  orMergeClause,
  type OriginalClause,
} from './policy-expr-compare.ts';

export interface BackupPolicyRow {
  readonly schemaname: string;
  readonly tablename: string;
  readonly policyname: string;
  readonly permissive: string;
  readonly cmd: string;
  readonly roles: readonly string[];
  readonly old_qual: string | null;
  readonly old_with_check: string | null;
  readonly first_backed_up_mt: string;
}

export interface LivePolicyRef {
  readonly schemaname: string;
  readonly tablename: string;
  readonly policyname: string;
  readonly cmd: string;
  readonly qual: string | null;
  readonly with_check: string | null;
}

export interface HistoryPolicyRef {
  readonly file: string;
  readonly cmd: string;
  readonly qual: string | null;
  readonly withCheck: string | null;
}

export interface MergeRecord {
  readonly merged_at_mt: string;
  readonly table: string;
  readonly cmd: string;
  readonly original_policies: readonly string[];
  readonly merged_policy: string;
}

export interface MergeAssessment {
  readonly table: string;
  readonly tablename: string;
  readonly schemaname: string;
  readonly cmd: string;
  readonly mergedPolicy: string;
  readonly mergedAtMt: string;
  readonly originals: readonly string[];
  readonly backupQualMatch: boolean;
  readonly backupCheckMatch: boolean;
  readonly implicitCheckDiffers: boolean;
  readonly migrationStatus: 'match' | 'differ' | 'incomplete';
  readonly migrationMissing: readonly string[];
  readonly migrationFiles: readonly string[];
  readonly hold: boolean;
  readonly reasons: readonly string[];
}

function splitTable(table: string): { schemaname: string; tablename: string } {
  const dot = table.indexOf('.');
  if (dot === -1) return { schemaname: 'public', tablename: table };
  return { schemaname: table.slice(0, dot), tablename: table.slice(dot + 1) };
}

function sortedOriginals(names: readonly string[]): string[] {
  return [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

export function assessMerge(
  merge: MergeRecord,
  backupByKey: ReadonlyMap<string, BackupPolicyRow>,
  liveByKey: ReadonlyMap<string, LivePolicyRef>,
  historyByKey: ReadonlyMap<string, HistoryPolicyRef>,
): MergeAssessment {
  const { schemaname, tablename } = splitTable(merge.table);
  const reasons: string[] = [];
  const originals = sortedOriginals(merge.original_policies);
  const backupRows: BackupPolicyRow[] = [];
  for (const name of originals) {
    const row = backupByKey.get(`${schemaname}.${tablename}.${name}`);
    if (row === undefined) {
      reasons.push(`backup missing original ${name}`);
    } else {
      backupRows.push(row);
    }
  }
  const live = liveByKey.get(`${schemaname}.${tablename}.${merge.merged_policy}`);
  if (live === undefined) reasons.push(`snapshot missing merged policy ${merge.merged_policy}`);

  const backupClauses: OriginalClause[] = backupRows.map((row) => ({
    policyname: row.policyname,
    cmd: row.cmd,
    qual: row.old_qual,
    withCheck: row.old_with_check,
  }));
  const expectedQual = orMergeClause(backupClauses.map((row) => row.qual));
  const explicitCheck = orMergeClause(backupClauses.map((row) => row.withCheck));
  const semanticCheck = orMergeClause(backupClauses.map((row) => effectiveWithCheck(row)));
  const implicitCheckDiffers = !branchesEqual(
    canonicalOrBranches(explicitCheck),
    canonicalOrBranches(semanticCheck),
  );
  if (implicitCheckDiffers) {
    reasons.push(
      'WITH CHECK semantics differ from USING: an ALL or UPDATE original has no WITH CHECK, so Postgres would use USING, but the autoheal ORs only explicit WITH CHECK clauses',
    );
  }
  const backupQualMatch =
    live !== undefined &&
    backupRows.length === originals.length &&
    branchesEqual(canonicalOrBranches(live.qual), canonicalOrBranches(expectedQual));
  const backupCheckMatch =
    live !== undefined &&
    backupRows.length === originals.length &&
    branchesEqual(canonicalOrBranches(live.with_check), canonicalOrBranches(explicitCheck));
  if (!backupQualMatch) reasons.push('normalized current USING is not the OR of the normalized backup originals');
  if (!backupCheckMatch) reasons.push('normalized current WITH CHECK is not the OR of the normalized backup originals');

  const migrationMissing: string[] = [];
  const migrationFiles: string[] = [];
  const historyClauses: OriginalClause[] = [];
  for (const name of originals) {
    const hist = historyByKey.get(`${schemaname}.${tablename}.${name}`);
    if (hist === undefined) {
      migrationMissing.push(name);
    } else {
      migrationFiles.push(`${name} @ ${hist.file}`);
      historyClauses.push({
        policyname: name,
        cmd: hist.cmd,
        qual: hist.qual,
        withCheck: hist.withCheck,
      });
    }
  }
  let migrationStatus: 'match' | 'differ' | 'incomplete' = 'incomplete';
  if (migrationMissing.length > 0) {
    migrationStatus = 'incomplete';
    reasons.push(`migration history missing ${migrationMissing.join(', ')}`);
  } else if (live === undefined) {
    migrationStatus = 'differ';
  } else {
    const histQual = orMergeClause(historyClauses.map((row) => row.qual));
    const histCheck = orMergeClause(historyClauses.map((row) => effectiveWithCheck(row)));
    const qualMatch = migrationKeysEqual(migrationCompareKey(live.qual), migrationCompareKey(histQual));
    const checkMatch = migrationKeysEqual(migrationCompareKey(live.with_check), migrationCompareKey(histCheck));
    if (qualMatch && checkMatch) {
      migrationStatus = 'match';
    } else {
      migrationStatus = 'differ';
      if (!qualMatch) reasons.push('normalized current USING differs from the OR of the last migration definitions');
      if (!checkMatch) reasons.push('normalized current WITH CHECK differs from migration history (USING fills a missing ALL/UPDATE WITH CHECK)');
    }
  }

  const hold =
    implicitCheckDiffers ||
    !backupQualMatch ||
    !backupCheckMatch ||
    migrationStatus === 'differ';

  return {
    table: merge.table,
    tablename,
    schemaname,
    cmd: merge.cmd,
    mergedPolicy: merge.merged_policy,
    mergedAtMt: merge.merged_at_mt,
    originals,
    backupQualMatch,
    backupCheckMatch,
    implicitCheckDiffers,
    migrationStatus,
    migrationMissing,
    migrationFiles,
    hold,
    reasons,
  };
}

export function heldTables(assessments: readonly MergeAssessment[]): Set<string> {
  const held = new Set<string>();
  for (const assessment of assessments) {
    if (assessment.hold) held.add(`${assessment.schemaname}.${assessment.tablename}`);
  }
  return held;
}
