# Rythm Health lab import

Spelling is **Rythm** (no first h). Legal name: Rythm Health, Inc.
Not Rhythm Software (`docs.api.rhythmsoftware.com`).

## What this is

At-home capillary blood panel (Tasso+). Consumer CSV (and PDF) export from
https://app.rythmhealth.com/account/orders

ViaConnect persists parsed blood chemistry to `lab_biomarkers` with
`lab_report_uploads.lab_name = "Rythm Health"`. HormoneIQ DUTCH counts stay
DUTCH-only. Rythm Score and Biological Age are dropped and never written.

## What this is not

There is no public developer API, OAuth, webhook, FHIR, or Terra / Vital /
Junction listing. `/api` and `/developers` on rythmhealth.com 404.
`docs.` and `api.` hosts NXDOMAIN.

Do not add `RYTHM_HEALTH_CLIENT_ID`, `RYTHM_HEALTH_CLIENT_SECRET`, or
`RYTHM_HEALTH_REDIRECT_URI`. Those names would imply a live partner
contract that does not exist.

Partner inquiry (not a Connect button):
https://form.rythmhealth.com/provider
support@rythmhealth.com

## CSV schema

Public column names are UNKNOWN. `parseRythmHealthCsv` is resilient:

- Tall tables with Biomarker/Test/Name + Result/Value headers
- Wide tables whose headers match documented panel names
- Skips Rythm Score and Biological Age
- Never invents 0 for a missing marker

Documented panel groups (product copy, not a schema): hormones, thyroid,
heart, metabolic, CBC, kidney/liver.

## Surfaces

- My Biology Hormones (`/body-tracker/hormones`)
- Connections Labs section (not the wearable grid)
- Connect Lab Results (`/plugins/labs`)

Wearable tiles, `WearableProvider`, and wearable OAuth are out of scope.
