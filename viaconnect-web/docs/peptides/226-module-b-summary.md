# Prompt 226 Module B (de-identified)

**Commit:** `0c8804b0`  
**G17 choice:** opaque `patient_ref` (no legal names / PHI in protocol rows)  
**G18:** Alberta (AB) and New York (NY) verification first

## Live surfaces

| Surface | Path |
| --- | --- |
| Practitioner builder | `/practitioner/peptide-protocols` |
| Printable sheet | `/practitioner/peptide-protocols/[id]/sheet` |
| Consumer inbox | `/peptide-protocol/my-protocols` (issued + `recipient_user_id` only) |

## Gates

1. Practitioner role alone is **not** enough.
2. Submit AB/NY licence verification request.
3. Admin/ops approve via `POST /api/cron/approve-226-practitioner-verification` with `{ "requestId": "..." }` and Bearer `CRON_SECRET`.
4. List pending: `GET` same cron route.

## Behaviour

- Practitioner enters regimen (dose originates from them).
- Platform converts to syringe units only.
- Lex attribution `226-b-v1` on every issued sheet.
- Opaque patient reference; name-like refs rejected on create.
- Schema applied live (`20260820170000` ok).

## Approve a verification (ops)

```
GET  /api/cron/approve-226-practitioner-verification
POST /api/cron/approve-226-practitioner-verification
Body: { "requestId": "<uuid>" }
```

## Not in this slice

- Full PHI named-patient storage (deferred)
- PDF binary export (print CSS sheet is live)
- Jurisdictions beyond AB/NY
