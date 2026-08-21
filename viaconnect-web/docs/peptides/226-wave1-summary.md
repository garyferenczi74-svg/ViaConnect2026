# Prompt 226 Wave 1: Module A converter UI

**Commit:** `1b9fb4ff`  
**Apply:** `226-apply-wave1-result.json`

## Live

| Check | Result |
| --- | --- |
| Lex `226-v1` | **cleared** (Gary Wave 1 continue; Appendix A copy) |
| Marshall disclaimer | **approved** |
| G20 gate | **true** |
| Allowlist eligible | **8** |
| `/peptide-protocol/converter` | deployed (auth redirect 307 when logged out) |
| `/peptide-protocol/converter/not-listed` | deployed (307 logged out) |

## Product rules enforced in UI

- Dose field starts **empty**; no presets or suggestions
- BAC shortcuts labelled **Common volumes, choose one.**
- Syringe scale **read-only** (`data-interactive="false"`; no drag)
- No result until compound + vial + diluent + dose are all present
- U-100 / U-40 first-use confirmation + change warning (2.5x)
- Layer 2 persistent; Layer 3 on every result and history row
- Non-allowlisted path does **not** convert free text

## APIs

- `GET /api/peptides/converter/status`
- `GET /api/peptides/converter/allowlist`
- `POST /api/peptides/converter/acknowledge`
- `POST /api/peptides/converter/compute`
- `GET|POST /api/peptides/converter/sessions`

## Not done yet

- Module C Protocol Literacy lessons
- Module B practitioner protocols (G17)
- Authenticated browser E2E screenshots (login required; logged-out probe is 307)
