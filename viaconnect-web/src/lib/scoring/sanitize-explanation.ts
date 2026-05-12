// Hannah explanation sanitizer (defense in depth XSS strip).
//
// Purpose:
//   The Hannah model is prompted not to emit markup, and the persisted
//   bio_optimization_history.breakdown.hannah_output.explanation column
//   is treated as plain text by every server side caller. Even so, the
//   /api/bos/current read endpoint passes the string straight to a
//   consumer surface, so we add a single defense in depth layer that
//   strips anything that looks like executable markup before the value
//   leaves the API boundary. The persisted column stays raw; only the
//   read path sanitizes. Persistence is unchanged so backfills, audit
//   queries, and the Hannah self check can read the original output.
//
// Behavior:
//   1. Null, undefined, or non string input returns the empty string.
//   2. <script> and <style> blocks are removed, including unterminated
//      blocks that run to end of input.
//   3. Remaining HTML tags are removed via a bounded iteration (max 8
//      passes) so that nested evasion patterns like
//      <scr<script>ipt>alert(1)</script> cannot leave a script
//      substring behind. The loop exits as soon as the output is
//      stable, so the worst case cost is bounded for benign input.
//   4. A small named entity set (amp, lt, gt, quot, #39, apos) is
//      decoded so that escaped human punctuation renders correctly.
//   5. ASCII control characters in the C0 range are stripped except
//      LF, CR, and TAB. Null bytes are removed.
//   6. Runs of spaces and tabs are collapsed to a single space.
//      Newlines are preserved so multi line explanations render with
//      line breaks intact. Each line is trimmed; the whole string is
//      trimmed at the end.
//
// Trade off note:
//   Entities are decoded after tag stripping. That means a literal
//   string like &lt;script&gt; in the source survives as <script> in
//   the output (no executable tag, just text). Under React this is
//   safe because JSX auto escapes string children. Non React downstream
//   consumers (a raw <div innerHTML> binding, a templating engine, a
//   plain text email body composed with naive string concatenation)
//   MUST run their own escape pass over this output. The decision to
//   strip rather than HTML escape was made on 2026-05-12 to keep the
//   user facing copy free of stray entity references; if a future
//   consumer needs an escaped output, add a second helper rather than
//   changing the contract of this one.
//
// Discipline:
//   Pure function. No I/O, no logging, no randomness. Deterministic.
//   Safe to call from any context including server side and middleware.

const SCRIPT_BLOCK_RE = /<script\b[^<]*(?:(?!<\/script\s*>)<[^<]*)*(?:<\/script\s*>|$)/gi;
const STYLE_BLOCK_RE = /<style\b[^<]*(?:(?!<\/style\s*>)<[^<]*)*(?:<\/style\s*>|$)/gi;
const TAG_RE = /<\/?[a-zA-Z][^>]*>?/g;
const CONTROL_CHAR_RE = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;
const HORIZONTAL_WS_RUN_RE = /[ \t]+/g;
const MAX_TAG_STRIP_PASSES = 8;

const ENTITY_DECODE: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
};

export function sanitizeExplanation(input: string | null | undefined): string {
  if (input === null || input === undefined) return '';
  if (typeof input !== 'string') return '';
  if (input.length === 0) return '';

  let out = input;

  // 1. Strip script + style blocks first so the bodies do not leak
  // back out as plain text after the generic tag strip.
  out = out.replace(SCRIPT_BLOCK_RE, '');
  out = out.replace(STYLE_BLOCK_RE, '');

  // 2. Bounded iterative generic tag strip. Each pass removes one
  // layer of tags; nested evasion needs O(depth) passes. We cap at
  // MAX_TAG_STRIP_PASSES and break as soon as the output is stable.
  for (let i = 0; i < MAX_TAG_STRIP_PASSES; i += 1) {
    const next = out.replace(TAG_RE, '');
    if (next === out) break;
    out = next;
  }

  // 3. Decode the small named entity set. Done after tag stripping so
  // a literal &lt;script&gt; survives as text only.
  for (const [entity, char] of Object.entries(ENTITY_DECODE)) {
    out = out.split(entity).join(char);
  }

  // 4. Strip ASCII control characters except LF, CR, TAB.
  out = out.replace(CONTROL_CHAR_RE, '');

  // 5. Collapse runs of spaces and tabs to a single space. Newlines
  // are preserved so multi line explanations keep their breaks.
  out = out.replace(HORIZONTAL_WS_RUN_RE, ' ');

  // 6. Trim each line then trim the whole string.
  out = out
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();

  return out;
}
