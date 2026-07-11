# 211a W2: Health Sync -- Device Verification Pending

## Status

Prompt 211a Workstream 2. Merged: 2026-07-11.

The JS-layer sync service (`src/lib/formavision/health/healthSync.ts`) and the
HealthBridge interface (`src/lib/formavision/health/healthBridge.ts`) are
complete and fully tested. The 42-test vitest suite (node-safe) covers all
required behaviors: flag-gating, RULE 9 honest-omit, unit conversion, per-metric
grants, revoked-grant handling, fail-open resilience, and telemetry PHI rules.

**All native paths are DEVICE-UNTESTED.** See the honesty gates below.

---

## Native verification required before enabling `native_health_bridge`

### iOS -- Cap-6 native-build risk

`@perfood/capacitor-healthkit@1.3.2` was force-installed with `--legacy-peer-deps`
on Capacitor 6.2.0. The plugin targets Cap 4/5. Its native iOS podspec must be
verified on a real iOS device build before the flag is enabled.

**Additional write limitation (critical):** `@perfood/capacitor-healthkit@1.3.2`
is a read-only plugin. It exposes `requestAuthorization` and `queryHKitSampleType`
but has NO write/save method in its public JS API. The `IosHealthBridge` class
documents this and its `writeBodyComposition` method throws a NotImplementedError.

Before enabling native iOS health writes, one of the following is required:

1. A fork of the plugin that adds `HKHealthStore.save()` bridging in Swift.
2. A replacement plugin (e.g., `@capacitor-community/health`) that supports writes.
3. A custom Capacitor plugin written in Swift that bridges `HKHealthStore.save()`
   for the three types: `HKQuantityTypeIdentifierBodyMass`,
   `HKQuantityTypeIdentifierBodyFatPercentage`,
   `HKQuantityTypeIdentifierLeanBodyMass`.

### Android -- Cap-6 native-build risk

`capacitor-health-connect@0.7.0` was force-installed with `--legacy-peer-deps`
on Capacitor 6.2.0. The plugin targets Cap 4/5. Its native Android gradle must be
verified on a real Android device with Health Connect installed.

**Lean mass limitation:** Android Health Connect v1 API (`RecordType` as of
`capacitor-health-connect@0.7.0`) does not include a `LeanBodyMass` record type.
Lean mass writes are permanently skipped on Android until Health Connect exposes
this type or a custom record is used.

---

## Native configuration files authored blind

The native iOS and Android project folders were not present in this worktree
(web-only checkout). The following configuration items were authored as
documentation; they must be applied to the actual native project by a developer
with a full native checkout:

### iOS (Info.plist)

```xml
<key>NSHealthShareUsageDescription</key>
<string>ViaConnect reads body-composition scan results from Apple Health so your data stays in sync. It never uploads your Apple Health data to our servers.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>ViaConnect writes your body-composition scan results to Apple Health so you can keep all your health data in one place. It never uploads your Apple Health data to our servers.</string>
```

### iOS (entitlement)

In the Xcode entitlements file (typically `App.entitlements` or `App.xcent`):

```xml
<key>com.apple.developer.healthkit</key>
<true/>
<key>com.apple.developer.healthkit.background-delivery</key>
<false/>
```

Add the HealthKit capability in Xcode under Signing and Capabilities.

### Android (AndroidManifest.xml)

Inside the `<manifest>` element, add the Health Connect permissions and the
required permission-rationale activity (per `capacitor-health-connect` README):

```xml
<!-- Health Connect write permissions -->
<uses-permission android:name="android.permission.health.WRITE_WEIGHT" />
<uses-permission android:name="android.permission.health.WRITE_BODY_FAT" />

<!-- Health Connect permission rationale activity (required by Google Play) -->
<activity
    android:name="io.flutter.plugins.healthconnect.HealthConnectPermissionRationale"
    android:exported="true">
    <intent-filter>
        <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" />
    </intent-filter>
</activity>
```

---

## RULE 9 -- Honest all-three-when-any

A FormaVision body scan produces ONLY `body_fat_pct`. Weight and lean mass are
null unless a real weight or composition entry supplied them.

The sync service writes ONLY the metrics that have a real, non-null value AND a
user-granted permission. It NEVER writes 0, NEVER fabricates a value, and NEVER
uses a placeholder.

On a pure vision scan, the service writes `body_fat` only.

This is test-enforced. Tests covering this behavior:

- "RULE 9: weight is null when input is null"
- "RULE 9: lean_mass is null when input is null"
- "pure scan: only body_fat_pct is non-null"
- "pure scan writes body_fat ONLY"
- "RULE 9: writeBodyComposition is NOT called with 0 for weight"

---

## Unit conversion proof

DB stores masses in lbs. Health stores want kg. The conversion uses the NIST
exact factor: `1 pound = 0.45359237 kg`.

This constant is defined once in `healthBridge.ts`:

```ts
export const LBS_TO_KG = 0.45359237 as const;
```

Body fat percent (0..100) is passed through unchanged. Both Apple Health
(HealthKit) and Android Health Connect (Health Connect BodyFat.percentage)
expect the raw percent value, not a 0..1 fraction.

---

## Telemetry events (no PHI)

| Event | Trigger | Payload (no values) |
|---|---|---|
| `formavision.health_sync_skipped` | Flag off, no platform, not available | `{ reason: 'flag_off' | 'no_user' | 'not_available' }` |
| `formavision.health_sync_written` | Metrics written successfully | `{ metrics: HealthMetric[], count: number }` |
| `formavision.health_sync_denied` | Metric present but no grant | `{ metric: HealthMetric }` |
| `formavision.health_sync_failed` | Bridge threw an error | `{ errorClass: string, metrics: HealthMetric[] }` |

No measurement values appear in any telemetry payload. This is test-enforced.

---

## Helix invisible

This service writes NO helix/token/streak/gamification data. The test
"no insert call contains helix/streak/token/gamification" verifies this.

---

## UI seam (future task)

W2 is service-only. A "Connect Apple Health / Health Connect" toggle UI is not
included in this workstream. When the native write path is verified and the flag
is ready to enable, add a toggle on the Connected Sources page
(`src/app/(app)/(consumer)/body-tracker/connections/page.tsx`) that calls
`syncHealthData` on demand. The toggle should follow the responsive grid pattern
(grid-cols-1 sm:grid-cols-2, min-h-[44px] touch targets).
