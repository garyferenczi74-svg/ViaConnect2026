// Prompt 201b: Google Health API connector - centralized schema map.
//
// The Google Health API is the next-generation Fitbit Web API: a web
// server-to-server OAuth 2.0 REST API exposing health and fitness data from
// Fitbit, Pixel Watch, and other devices on one surface. It is NOT Google Fit
// (deprecated) and NOT Health Connect (the on-device Android layer). This file
// is the single source of truth for the API surface so a breaking change is a
// one-file fix.
//
// Newness caveat: the API is brand new and Google warned of possible breaking
// changes. Everything here is pinned to v4 and treated as PROVISIONAL until the
// project is allowlisted and the contract is verified against live Google docs
// in staging. Callers log unexpected fields rather than throwing.
//
// Identifier quirk encoded once, here: data type names are kebab-case in
// endpoint paths (for example body-fat) and snake_case in filter parameters
// (for example body_fat). Never hand-build these strings at a call site.
//
// All comments use hyphens only. No em-dashes or en-dashes.

export const GOOGLE_HEALTH_API_VERSION = "v4";

// REST base. Verified 2026-06-16 against developers.google.com/health/endpoints:
// https://health.googleapis.com/v4. Centralized so the host is one edit, not many.
export const GOOGLE_HEALTH_API_BASE =
  process.env.GOOGLE_HEALTH_API_BASE ??
  `https://health.googleapis.com/${GOOGLE_HEALTH_API_VERSION}`;

// OAuth 2.0 endpoints (standard Google identity platform; stable, not part of
// the new Health surface).
export const GOOGLE_OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

// Domains a reading can belong to. Body flows to My Biology body composition;
// the rest flow to the Bio Optimization gauges.
export type GoogleHealthDomain = "body" | "vitals" | "sleep" | "activity";

// Where a normalized value lands. "body" goes through the Prompt 201 ingestion
// funnel; "daily_column" is a typed column on daily_scores the gauge engine
// already reads; "daily_jsonb" is the source_breakdown JSONB on daily_scores
// for signals that have no dedicated column yet (retained, never dropped).
export type GoogleHealthTarget =
  | { store: "body"; metricKey: string }
  | { store: "daily_column"; column: string }
  | { store: "daily_jsonb"; key: string };

// Canonical unit a value is normalized to before storage. Echoes the
// kJ-to-kcal lesson: never store a raw source number without confirming unit.
export type CanonicalUnit =
  | "kg"
  | "pct"
  | "ms"
  | "bpm"
  | "rpm"
  | "hours"
  | "count"
  | "km"
  | "minutes"
  | "kcal";

export interface GoogleHealthDataType {
  // Internal stable key used across the connector.
  key: string;
  // Kebab-case name used in REST endpoint paths.
  endpointName: string;
  // Snake_case name used in filter query parameters.
  filterName: string;
  domain: GoogleHealthDomain;
  // OAuth scope bundle this type requires (see SCOPES below).
  scope: GoogleHealthDomain;
  // list gives per-device provenance; reconcile gives Google's merged stream.
  // Recommendation per the prompt: list for body composition (attribute each
  // reading to its device), reconcile for high-volume vitals.
  endpointMode: "list" | "reconcile";
  canonicalUnit: CanonicalUnit;
  target: GoogleHealthTarget;
}

// The data type registry. Body uses list (per-device provenance). Vitals and
// activity high-volume streams use reconcile. Sleep uses list so nightly
// sessions keep their originating device.
export const GOOGLE_HEALTH_DATA_TYPES: GoogleHealthDataType[] = [
  // Body composition. Latest-write-wins per day on the Google side for these
  // two; we store latest-per-day and never expect an intraday series.
  {
    key: "weight",
    endpointName: "weight",
    filterName: "weight",
    domain: "body",
    scope: "body",
    endpointMode: "list",
    canonicalUnit: "kg",
    target: { store: "body", metricKey: "weight" },
  },
  {
    key: "body_fat",
    endpointName: "body-fat",
    filterName: "body_fat",
    domain: "body",
    scope: "body",
    endpointMode: "list",
    canonicalUnit: "pct",
    target: { store: "body", metricKey: "body_fat_pct" },
  },

  // Vitals. recovery_hrv and a JSONB bag of the rest (no dedicated column yet).
  {
    key: "heart_rate_variability",
    endpointName: "heart-rate-variability",
    filterName: "heart_rate_variability",
    domain: "vitals",
    scope: "vitals",
    endpointMode: "reconcile",
    canonicalUnit: "ms",
    target: { store: "daily_column", column: "recovery_hrv" },
  },
  {
    key: "resting_heart_rate",
    endpointName: "resting-heart-rate",
    filterName: "resting_heart_rate",
    domain: "vitals",
    scope: "vitals",
    endpointMode: "reconcile",
    canonicalUnit: "bpm",
    target: { store: "daily_jsonb", key: "resting_hr_bpm" },
  },
  {
    key: "oxygen_saturation",
    endpointName: "oxygen-saturation",
    filterName: "oxygen_saturation",
    domain: "vitals",
    scope: "vitals",
    endpointMode: "reconcile",
    canonicalUnit: "pct",
    target: { store: "daily_jsonb", key: "oxygen_saturation_pct" },
  },
  {
    key: "respiratory_rate",
    endpointName: "respiratory-rate",
    filterName: "respiratory_rate",
    domain: "vitals",
    scope: "vitals",
    endpointMode: "reconcile",
    canonicalUnit: "rpm",
    target: { store: "daily_jsonb", key: "respiratory_rate_rpm" },
  },
  {
    key: "heart_rate",
    endpointName: "heart-rate",
    filterName: "heart_rate",
    domain: "vitals",
    scope: "vitals",
    endpointMode: "reconcile",
    canonicalUnit: "bpm",
    target: { store: "daily_jsonb", key: "heart_rate_bpm" },
  },

  // Sleep.
  {
    key: "sleep",
    endpointName: "sleep",
    filterName: "sleep",
    domain: "sleep",
    scope: "sleep",
    endpointMode: "list",
    canonicalUnit: "hours",
    target: { store: "daily_column", column: "sleep_hours" },
  },

  // Activity. steps and active minutes have columns; the rest go to JSONB.
  {
    key: "steps",
    endpointName: "steps",
    filterName: "steps",
    domain: "activity",
    scope: "activity",
    endpointMode: "reconcile",
    canonicalUnit: "count",
    target: { store: "daily_column", column: "steps_count" },
  },
  {
    // active_zone_minutes drives the Exercise gauge column
    // (daily_scores.exercise_minutes). Confirm with Hannah/scoring in staging that
    // this is the intended input for the Exercise weight.
    key: "active_zone_minutes",
    endpointName: "active-zone-minutes",
    filterName: "active_zone_minutes",
    domain: "activity",
    scope: "activity",
    endpointMode: "reconcile",
    canonicalUnit: "minutes",
    target: { store: "daily_column", column: "exercise_minutes" },
  },
  {
    key: "distance",
    endpointName: "distance",
    filterName: "distance",
    domain: "activity",
    scope: "activity",
    endpointMode: "reconcile",
    canonicalUnit: "km",
    target: { store: "daily_jsonb", key: "distance_km" },
  },
  {
    key: "floors",
    endpointName: "floors",
    filterName: "floors",
    domain: "activity",
    scope: "activity",
    endpointMode: "reconcile",
    canonicalUnit: "count",
    target: { store: "daily_jsonb", key: "floors" },
  },
  {
    // Verified type name: total-calories (represents the activity caloriesOut).
    key: "calories",
    endpointName: "total-calories",
    filterName: "total_calories",
    domain: "activity",
    scope: "activity",
    endpointMode: "reconcile",
    canonicalUnit: "kcal",
    target: { store: "daily_jsonb", key: "calories_kcal" },
  },
];

// OAuth read scopes. Verified 2026-06-16 against developers.google.com/health/scopes:
// the API exposes coarse readonly bundles, not per-metric scopes. Body composition
// and vitals both fall under health metrics and measurements; sleep and activity
// have their own. We request only the readonly bundles the enabled domains need.
const SCOPE_HEALTH_METRICS =
  "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly";
const SCOPE_ACTIVITY = "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly";
const SCOPE_SLEEP = "https://www.googleapis.com/auth/googlehealth.sleep.readonly";

export const SCOPES: Record<GoogleHealthDomain, string> = {
  body: SCOPE_HEALTH_METRICS,
  vitals: SCOPE_HEALTH_METRICS,
  sleep: SCOPE_SLEEP,
  activity: SCOPE_ACTIVITY,
};

// The domains this connector reads at launch. Kept explicit so scopes stay
// minimal and a domain can be turned off without touching call sites.
export const ENABLED_DOMAINS: GoogleHealthDomain[] = ["body", "vitals", "sleep", "activity"];

export function enabledScopes(domains: GoogleHealthDomain[] = ENABLED_DOMAINS): string[] {
  const wanted = new Set(domains);
  const urls = Object.entries(SCOPES)
    .filter(([d]) => wanted.has(d as GoogleHealthDomain))
    .map(([, url]) => url);
  // body and vitals share one bundle; dedupe so consent requests each scope once.
  return [...new Set(urls)];
}

export function dataTypesForDomains(
  domains: GoogleHealthDomain[] = ENABLED_DOMAINS,
): GoogleHealthDataType[] {
  const wanted = new Set(domains);
  return GOOGLE_HEALTH_DATA_TYPES.filter((t) => wanted.has(t.domain));
}

export function getDataType(key: string): GoogleHealthDataType | undefined {
  return GOOGLE_HEALTH_DATA_TYPES.find((t) => t.key === key);
}

// The connector's stable source slug across the connected-sources registry,
// the integrations app registry, and data_source_connections.source_id.
export const GOOGLE_HEALTH_SOURCE_ID = "google_health";
