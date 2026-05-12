// Bio Optimization Score telemetry error_message sanitizer.
//
// Purpose:
//   Every error_message value persisted to public.bos_write_telemetry is
//   sanitized before insert so the table cannot accumulate raw user IDs
//   or unbounded error blobs. This helper runs on the application write
//   path inside logBOSWrite (see telemetry.ts). A parallel SQL function
//   bos_sanitize_error_message ships in the migration paired with #161b
//   so that future trigger writes (per #163) apply the same rule set on
//   the database side. Keep the two implementations in lockstep; if the
//   rules change here, change the SQL function in the same migration.
//
// Rules (applied in order):
//   1. Null, undefined, or non string input returns null.
//   2. Replace every RFC 4122 style UUID (case insensitive) with the
//      literal token <uuid>. Multiple UUIDs in one message are all
//      redacted (global regex flag).
//   3. If the resulting string is longer than 500 characters, truncate
//      to exactly 500 characters: the first 496 characters of the
//      sanitized output followed by the four character suffix ' ...'.
//      The empty string (length 0) is a valid output and passes through
//      unchanged.
//
// Why both layers:
//   - The TypeScript sanitizer covers every app side call to
//     logBOSWrite from the worker, the API routes, and the legacy
//     observability path.
//   - The SQL sanitizer covers any future server side trigger or RPC
//     that writes telemetry directly without crossing through the app
//     boundary. The #163 trigger work will call it.
//
// Discipline:
//   Pure function. No I/O, no logging, no randomness. Deterministic.

const UUID_REGEX = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
const MAX_LENGTH = 500;
const TRUNCATION_SUFFIX = ' ...';

export function sanitizeErrorMessage(input: string | null | undefined): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input !== 'string') return null;

  // Replace every UUID with the redaction token. Reset lastIndex is
  // unnecessary because we call replace() rather than exec() in a loop.
  let out = input.replace(UUID_REGEX, '<uuid>');

  if (out.length > MAX_LENGTH) {
    out = out.substring(0, MAX_LENGTH - TRUNCATION_SUFFIX.length) + TRUNCATION_SUFFIX;
  }

  return out;
}
