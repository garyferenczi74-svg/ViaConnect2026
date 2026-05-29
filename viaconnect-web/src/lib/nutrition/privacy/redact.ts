// Prompt #170 Phase 1b: PHI redaction at the vision provider boundary.
// Per Prompt 170 §2.5 and Prompt 170a §4.3, the outbound payload to LogMeal,
// Gemini Vision, or Claude Vision contains ONLY:
//   1. imageBase64    (the actual image bytes, base64 encoded)
//   2. requestId      (opaque v4 UUID, never derived from user_id)
//   3. capturedAt     (ISO 8601 timestamp)
//   4. deviceClass    (small enum used for portion calibration)
//
// It must NEVER contain auth.uid, email, profile name, phone, IP, geo,
// condition strings, protocol identifiers, supplement identifiers, or
// household composition. This module enforces the allowlist on the way out
// and exposes a denylist helper used by tests and by guard middleware that
// scans rejection payloads.
//
// Hard rules honored: no em or en dashes anywhere, no emojis, no any.

const ALLOWED_DEVICE_CLASSES = [
  'ios_lidar',
  'ios_no_lidar',
  'android_arcore',
  'android_no_depth',
  'web',
] as const;

export type DeviceClass = (typeof ALLOWED_DEVICE_CLASSES)[number];

export interface VisionRequestEnvelope {
  imageBase64: string;
  requestId: string;
  capturedAt: string;
  deviceClass: DeviceClass;
}

const ALLOWED_KEYS: ReadonlyArray<keyof VisionRequestEnvelope> = [
  'imageBase64',
  'requestId',
  'capturedAt',
  'deviceClass',
];

export const VISION_REQUEST_DENYLIST: ReadonlyArray<string> = [
  'user_id', 'userId', 'auth_uid', 'authUid', 'email', 'profile_name', 'profileName',
  'first_name', 'firstName', 'last_name', 'lastName', 'phone', 'phone_number', 'phoneNumber',
  'ip', 'ip_address', 'ipAddress', 'geo', 'location', 'lat', 'lng', 'latitude', 'longitude',
  'condition', 'conditions', 'diagnosis', 'protocol_id', 'protocolId', 'supplement_id', 'supplementId',
  'household', 'household_size', 'householdSize', 'address',
];

const DENYLIST_SET: ReadonlySet<string> = new Set(VISION_REQUEST_DENYLIST);

// RFC 4122 v4 UUID shape: xxxxxxxx-xxxx-4xxx-(8|9|a|b)xxx-xxxxxxxxxxxx.
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ISO 8601 minimal shape check; full validity is enforced by Date.parse below.
const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+\-]\d{2}:\d{2})$/;

function isAllowedDeviceClass(v: unknown): v is DeviceClass {
  return typeof v === 'string' && (ALLOWED_DEVICE_CLASSES as ReadonlyArray<string>).includes(v);
}

export function findForbiddenKeys(input: Record<string, unknown>): string[] {
  const hits: string[] = [];
  for (const key of Object.keys(input)) {
    if (DENYLIST_SET.has(key)) {
      hits.push(key);
    }
  }
  return hits;
}

export function sanitizeVisionRequest(envelope: VisionRequestEnvelope): VisionRequestEnvelope {
  if (envelope === null || typeof envelope !== 'object') {
    throw new Error('sanitizeVisionRequest: envelope must be an object');
  }

  const keys = Object.keys(envelope);
  const extraKeys: string[] = [];
  for (const k of keys) {
    if (!(ALLOWED_KEYS as ReadonlyArray<string>).includes(k)) {
      extraKeys.push(k);
    }
  }
  if (extraKeys.length > 0) {
    throw new Error(
      `sanitizeVisionRequest: forbidden or extra keys present: ${extraKeys.join(', ')}`,
    );
  }

  for (const required of ALLOWED_KEYS) {
    if (!(required in envelope)) {
      throw new Error(`sanitizeVisionRequest: missing required key "${required}"`);
    }
  }

  if (typeof envelope.imageBase64 !== 'string' || envelope.imageBase64.length === 0) {
    throw new Error('sanitizeVisionRequest: imageBase64 must be a non empty string');
  }
  if (typeof envelope.requestId !== 'string' || !UUID_V4.test(envelope.requestId)) {
    throw new Error('sanitizeVisionRequest: requestId must be a v4 UUID');
  }
  if (
    typeof envelope.capturedAt !== 'string' ||
    !ISO_8601.test(envelope.capturedAt) ||
    Number.isNaN(Date.parse(envelope.capturedAt))
  ) {
    throw new Error('sanitizeVisionRequest: capturedAt must be an ISO 8601 timestamp');
  }
  if (!isAllowedDeviceClass(envelope.deviceClass)) {
    throw new Error(
      `sanitizeVisionRequest: deviceClass must be one of ${ALLOWED_DEVICE_CLASSES.join(', ')}`,
    );
  }

  return {
    imageBase64: envelope.imageBase64,
    requestId: envelope.requestId,
    capturedAt: envelope.capturedAt,
    deviceClass: envelope.deviceClass,
  };
}
