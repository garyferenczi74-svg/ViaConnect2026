// Prompt 201: connected-sources registry. The single source of truth for body
// composition ingestion sources. Adding a future source is a registry entry
// here, not new UI plumbing.
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

export type SourceStatus = "active" | "scaffold" | "coming_soon";
export type SourceCategory = "aggregator" | "wearable" | "manual";
export type AuthMethod = "file_import" | "native_bridge" | "oauth2" | "manual";

export interface ConnectedSource {
  id: string; // stable slug, matches body_tracker_connections.source_id
  displayName: string;
  icon: string; // Lucide icon name, rendered at strokeWidth 1.5
  category: SourceCategory;
  status: SourceStatus;
  authMethod: AuthMethod;
  capabilities: BodyMetricKey[]; // which metrics this source can deliver
  notes?: string; // honest limitation copy shown in the UI
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
    id: "fitbit",
    displayName: "Fitbit",
    icon: "Watch",
    category: "wearable",
    status: "scaffold",
    authMethod: "oauth2",
    capabilities: ["weight", "body_fat_pct"],
    notes: "Coming soon. Will sync weight and body fat once the connection is enabled.",
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
export const HUME_SOURCE_NAME_MATCHES = ["hume health", "hume", "fittrack"];

export function matchesHume(sourceName: string | null | undefined): boolean {
  if (!sourceName) return false;
  const normalized = sourceName.trim().toLowerCase();
  return HUME_SOURCE_NAME_MATCHES.some((m) => normalized.includes(m));
}
