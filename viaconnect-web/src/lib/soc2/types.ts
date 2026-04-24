// Prompt #122 P1: SOC 2 Evidence Auto-Exporter shared types.
//
// Pure TypeScript, zero runtime dependencies, safe to import from client,
// server, and edge contexts. Collector implementations, redaction policy,
// packet assembly, and auditor access all consume these types.

export const SOC2_TSC_CODES = [
  'CC1', 'CC2', 'CC3', 'CC4', 'CC5', 'CC6', 'CC7', 'CC8', 'CC9',
  'A1', 'C1', 'P',
] as const;
export type Soc2TscCode = (typeof SOC2_TSC_CODES)[number];

export const SOC2_CATEGORY_DIRS: Record<Soc2TscCode, string> = {
  CC1: 'CC1-control-environment',
  CC2: 'CC2-communication-information',
  CC3: 'CC3-risk-assessment',
  CC4: 'CC4-monitoring-activities',
  CC5: 'CC5-control-activities',
  CC6: 'CC6-logical-access',
  CC7: 'CC7-system-operations',
  CC8: 'CC8-change-management',
  CC9: 'CC9-risk-mitigation',
  A1:  'A1-availability',
  C1:  'C1-confidentiality',
  P:   'P-privacy',
};

export interface Period {
  start: string; // ISO-8601 UTC
  end: string;   // ISO-8601 UTC
}

export interface CollectorCtx {
  packetUuid: string;
  pseudonymKey: Buffer;
  ruleRegistryVersion: string;
}

export interface CollectorFile {
  relativePath: string;
  contentType: 'text/csv' | 'application/json' | 'application/pdf' | 'text/markdown';
  bytes: Uint8Array;
}

export interface CollectorAttestation {
  collectorId: string;
  collectorVersion: string;
  dataSource: string;
  query: string;
  queryHash: string;
  parameters: unknown[];
  rowCount: number;
  outputSha256: string;
  executedAt: string;
  durationMs: number;
  deterministicReplayProof: {
    seedInputs: readonly string[];
    nonDeterministicSources: readonly string[];
  };
}

export interface CollectorOutput {
  files: CollectorFile[];
  attestation: CollectorAttestation;
}

export interface SOC2Collector {
  id: string;
  version: string;
  dataSource: string;
  controls: readonly string[];
  collect(period: Period, ctx: CollectorCtx): Promise<CollectorOutput>;
}

// ─── Redaction policy ──────────────────────────────────────────────────────

export type RedactionTreatment =
  | { kind: 'remove' }
  | { kind: 'pseudonymize'; context: string }
  | { kind: 'pseudonymize_array'; context: string }
  | { kind: 'retain' }
  | { kind: 'truncate_timestamp_seconds' }
  | { kind: 'truncate_ip' }
  | { kind: 'generalize_user_agent' }
  | { kind: 'block_entire_table' };

export type TableFieldPolicy = Record<string, RedactionTreatment>;

export interface RedactionPolicy {
  tables: Record<string, TableFieldPolicy>;
}

// ─── Packet manifest ───────────────────────────────────────────────────────

export interface PacketManifestFile {
  path: string;
  sha256: string;
  sizeBytes: number;
  collector?: string;
  deterministicQueryHash?: string;
  controls: string[];
}

export interface PacketManifest {
  packetVersion: '1.0.0';
  packetUuid: string;
  entity: {
    legalName: 'FarmCeutica Wellness LLC';
    platform: 'ViaConnect';
    systemBoundary: string;
  };
  period: {
    start: string;
    end: string;
    attestationType: 'Type I' | 'Type II';
  };
  tscInScope: Soc2TscCode[];
  generatedAt: string;
  generatedBy: string;
  ruleRegistryVersion: string;
  files: PacketManifestFile[];
  categoryHashes: Record<string, string>;
  rootHash: string;
  signature?: {
    alg: 'ES256';
    kid: string;
    jwt: string;
  };
}

// ─── Auditor grant ──────────────────────────────────────────────────────────

export interface AuditorGrant {
  id: string;
  auditorEmail: string;
  auditorFirm: string;
  packetIds: string[];
  grantedBy: string;
  grantedAt: string;
  expiresAt: string;
  revoked: boolean;
  revokedAt: string | null;
  accessCount: number;
}

// ─── Signing key ────────────────────────────────────────────────────────────

export interface SigningKey {
  id: string;
  alg: 'ES256';
  publicKeyPem: string;
  privateKeyRef: string; // Vault reference; never the key material itself
  active: boolean;
  rotationOf: string | null;
  createdAt: string;
  retiredAt: string | null;
}
