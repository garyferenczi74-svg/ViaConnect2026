// First-class Connections UI lives in wearable-tiles.ts (Whoop, Hume Body Pod,
// Apple Health, Oura). CONNECTED_SOURCES is an ingest-capability catalog only
// and must not be mapped as tiles.
//
// Hume Health (the Body Pod, operated by FitTrack Inc) has NO public developer
// API, OAuth program, or cloud endpoint. It reaches ViaConnect only as a
// downstream attribution origin inside an aggregator (Apple Health, Health
// Connect, Fitbit, Garmin). Hume is a data origin we tag, never a connector we
// authenticate against. Any prior "Hume API" or "Hume cloud sync" wiring
// (Prompt 77 and 85) is superseded by this registry.
//
// All comments use hyphens only. No em-dashes or en-dashes.

import { ALL_METRIC_KEYS, CORE_METRIC_KEYS, type BodyMetricKey } from "./metrics";

export type SourceStatus = "active" | "scaffold" | "coming_soon" | "deprecated";
export type SourceCategory = "aggregator" | "wearable" | "manual";
export type AuthMethod = "file_import" | "native_bridge" | "oauth2" | "manual";

export interface ConnectedSource {
  id: string; // stable slug, matches body_tracker_connections.source_id
  displayName: string;
  icon: string; // Lucide icon name, rendered at strokeWidth 1.5
  category: SourceCategory;
  status: SourceStatus;
  authMethod: AuthMethod;
  capabilities: BodyMetricKey[]; // which body metrics this source can deliver
  notes?: string; // honest limitation copy shown in the UI
  supersededBy?: string; // slug of the source that now provides this one
  dataTypes?: string[]; // human labels of everything provided, for the card
}

export const CONNECTED_SOURCES: ConnectedSource[] = [
  {
    id: "apple_health",
    displayName: "Apple Health",
    icon: "Activity",
    category: "aggregator",
    status: "active",
    authMethod: "file_import", // plus native_bridge when the shell ships, flag-gated
    capabilities: [...CORE_METRIC_KEYS],
    notes:
      "Import weight, body fat, lean mass, and BMI from a Health export file. Hume Body Pod readings that reached Apple Health are tagged automatically. Segmental and extended Hume metrics do not travel through Apple Health and need manual entry.",
  },
  {
    id: "manual_entry",
    displayName: "Manual Entry",
    icon: "PencilLine",
    category: "manual",
    status: "active",
    authMethod: "manual",
    capabilities: [...ALL_METRIC_KEYS],
    notes:
      "Add a single reading by hand, including the full Hume Body Pod metric set. Fields you leave blank stay marked Not available, never zero.",
  },
  {
    id: "google_health_connect",
    displayName: "Google Health Connect",
    icon: "HeartPulse",
    category: "aggregator",
    status: "scaffold",
    authMethod: "native_bridge",
    capabilities: [...CORE_METRIC_KEYS],
    notes: "Available in the upcoming Android app. Connect from your phone once the app ships.",
  },
  {
    id: "google_health",
    displayName: "Google Health",
    icon: "HeartPulse",
    category: "aggregator",
    status: "active",
    authMethod: "oauth2",
    capabilities: ["weight", "body_fat_pct"],
    dataTypes: [
      "Weight",
      "Body fat",
      "Heart rate variability",
      "Resting heart rate",
      "Oxygen saturation",
      "Respiratory rate",
      "Sleep",
      "Steps",
      "Activity",
    ],
    notes:
      "Connect Fitbit, Pixel Watch, and other devices through Google Health. Weight and body fat appear in My Biology; heart, sleep, and activity feed your Bio Optimization gauges. Each reading keeps its originating device.",
  },
  {
    id: "fitbit",
    displayName: "Fitbit",
    icon: "Watch",
    category: "wearable",
    status: "deprecated",
    authMethod: "oauth2",
    capabilities: ["weight", "body_fat_pct"],
    supersededBy: "google_health",
    notes:
      "Now part of Google Health. Connect Fitbit through the Google Health source above. Readings already synced from Fitbit are kept and stay attributed to your device.",
  },
  {
    id: "garmin",
    displayName: "Garmin",
    icon: "Watch",
    category: "wearable",
    status: "scaffold",
    authMethod: "oauth2",
    capabilities: ["weight", "body_fat_pct"],
    notes: "Coming soon. Will sync weight and body fat once the connection is enabled.",
  },
  // Prompt 212: WHOOP cloud OAuth + Hume via phone health store
  {
    id: "whoop",
    displayName: "WHOOP",
    icon: "Activity",
    category: "wearable",
    status: "active",
    authMethod: "oauth2",
    capabilities: ["weight", "body_fat_pct"],
    dataTypes: ["Recovery", "Sleep", "HRV", "Strain", "Workouts"],
    notes:
      "Connect WHOOP through the official WHOOP Developer API. Recovery, sleep, HRV, and workouts feed your Bio Optimization Score. Missing metrics stay UNKNOWN, never zero.",
  },
  {
    id: "hume_band",
    displayName: "Hume Band",
    icon: "Scan",
    category: "wearable",
    status: "active",
    authMethod: "native_bridge",
    capabilities: [...CORE_METRIC_KEYS],
    dataTypes: ["HRV", "Sleep", "Steps", "Body composition"],
    notes:
      "Hume has no public cloud API. Enable Hume to Apple Health (or Health Connect) sync in the Hume app, then grant ViaCura phone health permissions. Guided setup walks you through each step.",
  },
  {
    id: "phone_health",
    displayName: "Phone Health Data",
    icon: "Heart",
    category: "aggregator",
    status: "active",
    authMethod: "native_bridge",
    capabilities: [...CORE_METRIC_KEYS],
    dataTypes: ["Heart rate", "HRV", "Sleep", "Steps", "Body composition"],
    notes:
      "Apple Health (iOS) and Health Connect (Android, flag-gated). Also covers Apple Watch, Oura, Garmin, and other apps that write into the phone health store, including Hume.",
  },
];

export function getSource(id: string): ConnectedSource | undefined {
  return CONNECTED_SOURCES.find((s) => s.id === id);
}

export function sourceSupports(sourceId: string, metric: BodyMetricKey): boolean {
  const source = getSource(sourceId);
  return source ? source.capabilities.includes(metric) : false;
}

// Hume attribution. An Apple Health record whose sourceName matches any of these
// values (case-insensitive, substring) is tagged device_origin = HUME_DEVICE_ORIGIN.
// Kept as a configurable list, not hardcoded inline at the call site.
export const HUME_DEVICE_ORIGIN = "hume_body_pod";
export const HUME_SOURCE_NAME_MATCHES = ["hume_body_pod", "hume health", "hume", "fittrack"];

export function matchesHume(sourceName: string | null | undefined): boolean {
  if (!sourceName) return false;
  const normalized = sourceName.trim().toLowerCase();
  return HUME_SOURCE_NAME_MATCHES.some((m) => normalized.includes(m));
}
