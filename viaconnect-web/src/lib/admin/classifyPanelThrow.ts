/**
 * Safe classification for AdminPanelErrorBoundary catches.
 * UI stays "failed to load". Kind + digest go to safeLog only.
 */

export type AdminPanelThrowKind =
  | "invalid_element"
  | "invalid_child"
  | "missing_suspense"
  | "invalid_row_shape"
  | "unknown";

export interface ClassifiedPanelThrow {
  kind: AdminPanelThrowKind;
  digest: string | null;
  name: string;
}

function errorDigest(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.length > 0 ? digest : null;
}

export function classifyPanelThrow(error: unknown): ClassifiedPanelThrow {
  const err = error instanceof Error ? error : null;
  const message = err?.message ?? String(error);
  const digest = errorDigest(error);
  const name = err?.name ?? "Error";

  if (/Element type is invalid/i.test(message)) {
    return { kind: "invalid_element", digest, name };
  }
  if (/Objects are not valid as a React child/i.test(message)) {
    return { kind: "invalid_child", digest, name };
  }
  if (
    /Missing Suspense boundary/i.test(message) ||
    /useSearchParams/i.test(message)
  ) {
    return { kind: "missing_suspense", digest, name };
  }
  if (/\b(?:find|map|filter|forEach)\s+is not a function/i.test(message)) {
    return { kind: "invalid_row_shape", digest, name };
  }
  return { kind: "unknown", digest, name };
}
