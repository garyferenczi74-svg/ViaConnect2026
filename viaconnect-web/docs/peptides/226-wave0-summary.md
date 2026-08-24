# Prompt 226 Wave 0 summary

**Commit:** `241663dc`  
**Apply:** `docs/peptides/226-apply-wave0-result.json`

## Applied live

| Check | Result |
| --- | --- |
| Schema migration | ok |
| Marshall allowlist seed | ok |
| `converter_eligible` count | **8** |
| `edu-bpc157` blocked | **true** |
| Disclaimer `226-v1` | present, `lex_status=pending`, `marshall_status=pending` |
| G20 Lex production gate | **false** (correct; UI must not ship) |

## Local tests

25/25 Wave 0 + Hannah dose-validation refusal.

## Hard stops before Module A UI

1. Lex clears `226-v1` (G20)
2. Marshall approves disclaimer row
3. Consumer converter UI (Wave 1) only after both
4. Module B deferred pending G17 Lex/Security
