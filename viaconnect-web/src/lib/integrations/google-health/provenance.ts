// Prompt 201b: provenance attribution for Google Health readings.
//
// Every Google Health data point carries provenance: the platform, the device
// model, and how it was recorded. We map that to a device_origin slug and an
// app_origin label so the UI can badge the originating device (Pixel Watch,
// Fitbit Sense, a third-party scale). Reuses the Prompt 201 Hume tagging so a
// Hume Body Pod reading that arrived via Google Health is still attributed.
//
// Shape verified 2026-06-16 against the dataPoints reference: a data point's
// provenance is point.dataSource, with device.displayName, application
// (displayName, packageName, platform), recordingMethod, and dataSourceFamily.
// Fields are read defensively and unknown shapes degrade to the generic
// google_health origin rather than throwing.
//
// All comments use hyphens only. No em-dashes or en-dashes.

import { matchesHume, HUME_DEVICE_ORIGIN } from "@/lib/body-tracker/connected-sources/registry";

export interface GoogleHealthProvenance {
  device?: { displayName?: string | null; formFactor?: string | null } | null;
  application?: { displayName?: string | null; packageName?: string | null; platform?: string | null } | null;
  recordingMethod?: string | null;
  dataSourceFamily?: string | null;
  [key: string]: unknown;
}

export interface AttributedOrigin {
  deviceOrigin: string; // stable slug stored on the reading
  appOrigin: string; // aggregator surface, always google_health here
  deviceLabel: string; // human label for the UI badge
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function attributeProvenance(p: GoogleHealthProvenance | null | undefined): AttributedOrigin {
  const appOrigin = "google_health";
  if (!p) {
    return { deviceOrigin: "google_health", appOrigin, deviceLabel: "Google Health" };
  }

  const deviceName = (p.device?.displayName ?? "").toString().trim();
  const appName = (p.application?.displayName ?? "").toString().trim();
  const platform = (p.application?.platform ?? "").toString().trim();

  // Hume Body Pod readings keep the Prompt 201 origin so body-composition
  // surfaces badge them consistently across connectors.
  if (matchesHume(deviceName) || matchesHume(appName)) {
    return { deviceOrigin: HUME_DEVICE_ORIGIN, appOrigin, deviceLabel: "Hume Body Pod" };
  }

  const primary = deviceName || appName || platform;
  if (primary) {
    return {
      deviceOrigin: slugify(primary),
      appOrigin,
      deviceLabel: deviceName || appName || titleCase(platform),
    };
  }

  return { deviceOrigin: "google_health", appOrigin, deviceLabel: "Google Health" };
}
