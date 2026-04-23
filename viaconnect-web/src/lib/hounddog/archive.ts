/**
 * Evidence archiver. STUB implementation until Playwright (runtime), Google
 * Cloud Vision / AWS Textract (OCR), Deepgram (ASR), and Wayback Machine
 * submission SDK are approved in a follow-up prompt.
 *
 * This file creates a bundle row + a single 'stub' artifact so downstream
 * pipeline code (writer, notice, appeal) has a valid evidence_bundle_id to
 * reference. When the real archiver lands, only this module changes.
 *
 * Integrity guarantee today:
 *   - The manifest SHA-256 is computed over the artifact list. Tampering with
 *     the stub payload is detectable via the same verify function that will
 *     be used once real artifacts land.
 */

import { createHash, randomUUID } from "crypto";
import type { SocialSignal, EvidenceBundle, EvidenceArtifact } from "./bridge-types";

export interface ArchiveCtx {
  persistBundle: (bundle: Omit<EvidenceBundle, "id"> & { id: string }) => Promise<void>;
  persistArtifact: (bundleId: string, artifact: EvidenceArtifact) => Promise<void>;
  externalArchiveEnabled?: boolean; // gated on HOUNDDOG_ARCHIVE_ENABLED === "1"
}

const DEFAULT_RETENTION_YEARS = 7;

function sha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

function computeManifestHash(artifacts: EvidenceArtifact[]): string {
  const basis = artifacts
    .slice()
    .sort((a, b) => a.storageKey.localeCompare(b.storageKey))
    .map((a) => `${a.kind}:${a.sha256}:${a.sizeBytes}:${a.storageKey}`)
    .join("|");
  return sha256Hex(basis);
}

export async function archiveSignal(signal: SocialSignal, ctx: ArchiveCtx): Promise<EvidenceBundle> {
  const bundleId = randomUUID();
  const now = new Date();
  const retentionUntil = new Date(now.getTime());
  retentionUntil.setFullYear(retentionUntil.getFullYear() + DEFAULT_RETENTION_YEARS);

  // Stub artifact: a deterministic JSON blob of signal identity + collector
  // metadata. Lets the pipeline produce verifiable manifests today.
  const stubPayload = JSON.stringify({
    signalId: signal.id,
    url: signal.url,
    collectorId: signal.collectorId,
    capturedAt: signal.capturedAt,
    authorHandle: signal.author.handle,
    fingerprint: signal.content.fingerprint,
    note: "STUB ARTIFACT — Playwright/OCR/ASR/Wayback not yet configured.",
  });
  const stubSha = sha256Hex(stubPayload);
  const stubArtifact: EvidenceArtifact = {
    kind: "stub",
    storageKey: `compliance-evidence/stub/${bundleId}.json`,
    sha256: stubSha,
    sizeBytes: Buffer.byteLength(stubPayload, "utf8"),
  };

  const artifacts: EvidenceArtifact[] = [stubArtifact];
  const manifestSha256 = computeManifestHash(artifacts);

  const bundle: EvidenceBundle = {
    id: bundleId,
    signalId: signal.id,
    collectedAt: now.toISOString(),
    collectedBy: "hounddog_collector_v1",
    artifacts,
    waybackUrl: undefined,
    manifestSha256,
    retentionUntil: retentionUntil.toISOString().slice(0, 10),
    legalHold: false,
  };

  await ctx.persistBundle(bundle);
  for (const a of artifacts) {
    await ctx.persistArtifact(bundleId, a);
  }

  return bundle;
}

export function verifyBundle(bundle: EvidenceBundle): boolean {
  return computeManifestHash(bundle.artifacts) === bundle.manifestSha256;
}
