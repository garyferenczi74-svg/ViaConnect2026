# #161a Sanitizer Security Review (Sherlock)

Reviewer: Sherlock
Reviewed file: `src/lib/scoring/sanitize-explanation.ts`
Tests: `src/lib/scoring/__tests__/sanitize-explanation.test.ts`
Integration: `src/app/api/bos/current/route.ts:189`
Persist path: `src/lib/scoring/bio-optimization-score.ts:385` (raw, no sanitize)

## Findings table

| # | Severity | Area | Description | Verdict |
|---|----------|------|-------------|---------|
| 1 | Info | Strip order | Script + style block strip runs before generic tag strip per spec, then entity decode after tag strip. Matches §6.1. | Correct |
| 2 | Info | Iterative tag strip | Bounded loop (max 8 passes) with stable-output early exit; nested `<scr<script>ipt>` resolves in 2 passes. | Correct |
| 3 | Info | Entity decode order | Decode after tag strip; literal `&lt;script&gt;` survives as plain text `<script>` (no re-feed into tag stripper). | Per locked decision |
| 4 | Low | CDATA + HTML comments | `<!--...-->` and `<![CDATA[...]]>` wrappers survive as literal text (regex requires `[a-zA-Z]` after `<`/`</`). Nested `<script>` inside CDATA still caught by SCRIPT_BLOCK_RE. Acceptable per §6.1; not a vuln. | Accept |
| 5 | Info | Control chars | `[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]` correctly preserves `\t \n \r`, strips null + DEL. | Correct |
| 6 | Info | Whitespace collapse | `[ \t]+` → single space; `\n` preserved; per-line trim then whole-string trim. Handles `\r\n` because `\r` is preserved as a control-char exemption. | Correct |
| 7 | Info | Integration `||` operator | Falls back to PRECOMPUTE_EXPLANATION when sanitize output is empty string; correct per §0.2 + §6.1. | Correct |
| 8 | Info | Persist-time rawness | `bio-optimization-score.ts:385` writes `args.hannah` unchanged into `hannah_output`; zero call sites of `sanitizeExplanation` outside the read route. | Correct |
| 9 | Info | ReDoS | SCRIPT/STYLE block uses tempered greedy token (linear); TAG_RE has no nested quantifiers. No catastrophic backtracking vector. | Safe |
| 10 | Info | DoS bound | 10k nested-tag stress test under 100ms (Michelangelo); 8-pass cap × linear regex = O(n) worst case. | Safe |

## OWASP coverage table

Mental-traced against the implementation. All produce empty string or harmless plain text.

| Payload | Expected | Traced result | Pass |
|---|---|---|---|
| `<IMG SRC="javascript:alert('XSS');">` | empty | TAG_RE removes whole tag → `` | Pass |
| `<IMG SRC=javascript:alert('XSS')>` | empty | TAG_RE removes (no `>` inside) | Pass |
| `<IMG """><SCRIPT>alert("XSS")</SCRIPT>">` | `">` text | SCRIPT block strip then TAG_RE; leaves `">` plain | Pass |
| `<SCRIPT/SRC="http://evil.com/xss.js"></SCRIPT>` | empty | `<script\b` matches `/` boundary; full block stripped | Pass |
| `<<SCRIPT>alert("XSS");//<</SCRIPT>` | `<` text | SCRIPT block consumes inner, leading `<` plain | Pass |
| `<IMG SRC=\n javascript:alert('XSS')>` | empty | `[^>]*` swallows whitespace; TAG_RE removes | Pass |
| `<BODY ONLOAD=alert('XSS')>` | empty | TAG_RE removes | Pass |
| `<svg/onload=alert(1)>` | empty | TAG_RE removes (test 21 confirms) | Pass |
| `<iframe src="javascript:alert(1)">` | empty | TAG_RE removes | Pass |
| `<a href="javascript:alert(1)">click</a>` | `click` | TAG_RE removes both tags | Pass |
| `<meta http-equiv="refresh" content="0;url=javascript:alert(1)">` | empty | TAG_RE removes | Pass |
| `<object data="javascript:alert(1)">` | empty | TAG_RE removes | Pass |
| `<embed src="javascript:alert(1)">` | empty | TAG_RE removes | Pass |
| `<ScRiPt>alert(1)</ScRiPt>` | empty | `gi` flag handles mixed case | Pass |
| `&amp;lt;script&amp;gt;alert(1)&amp;lt;/script&amp;gt;` | `<script>alert(1)</script>` plain text | Two decode passes (amp first), result is text only | Pass |
| `<scr<script>ipt>alert(1)</script>` | empty / no `<script` substring | SCRIPT block strips inner, TAG_RE pass 1 catches `<scr` | Pass |
| `5 < 10 is true` | `5 < 10 is true` | `< 10` not tag (no letter); preserved | Pass |
| `<![CDATA[<script>alert(1)</script>]]>` | `<![CDATA[]]>` | Inner script stripped; CDATA wrapper plain text | Pass |
| `<!-- comment -->` | `<!-- comment -->` plain text | Survives as literal; React JSX escapes | Pass (accept) |

## Re-injection vector analysis

No step re-feeds output into an earlier step. The pipeline is strictly forward: script/style → generic tag (bounded loop is internal) → entity decode → control char → whitespace → trim. The entity decode is the only step that introduces new characters (`<`, `>`, `&`, `"`, `'`). Because it runs AFTER tag stripping, any decoded `<` becomes inert plain text. The locked design accepts that `&lt;script&gt;` decodes to the literal characters `<script>` in the output; this is harmless under React JSX (which auto-escapes string children) and is explicitly documented in the file header as the consumer-contract. The control-char strip and whitespace collapse cannot introduce `<` characters. No re-injection vector identified.

## DoS posture

Bounded loop (8 passes) is generous: each pass is O(n) linear regex (no nested quantifiers, no backtracking trap). For typical Hannah output (≤500 chars, zero tags) the loop exits on pass 1. For the 10k-nested-tag stress payload, Michelangelo's test confirms <100ms (likely <5ms in practice). The SCRIPT_BLOCK_RE / STYLE_BLOCK_RE use a tempered greedy token `(?:(?!<\/script\s*>)<[^<]*)*` which is linear (each `<` advances position by at least 1; lookahead is constant cost). TAG_RE `<\/?[a-zA-Z][^>]*>?` has a single `[^>]*` quantifier with no overlap, no ReDoS. Bound is adequate.

## Audit-trail integrity

Persisted `bio_optimization_history.breakdown.hannah_output.explanation` stays raw: confirmed at `src/lib/scoring/bio-optimization-score.ts:385` (`hannah_output: args.hannah` is unmodified passthrough; zero `sanitiz*` references in the persist module).

## Final verdict

**SIGN-OFF** for #161a commit + push.

The sanitizer correctly implements §6.1, defeats all 19 mental-traced OWASP payloads, has no ReDoS vector, persists raw data per §0.2, and the read-path `||` fallback is correct. The CDATA + HTML comment "survives as text" behavior is acceptable under the React JSX consumer contract documented in the file header; non-React future consumers are explicitly flagged in lines 32-43 to add their own escape pass.

No fixes required. Ship.
