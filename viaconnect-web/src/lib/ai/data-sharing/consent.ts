/**
 * VIA-10 third-party AI sharing consent.
 *
 * The gate is off unless AI_THIRD_PARTY_CONSENT_GATE is "true" or "1".
 * While it is off, existing AI calls keep working. After Gary applies the
 * migration, set that variable on Vercel and on the Supabase edge functions
 * that send body photos to Anthropic.
 *
 * Consent text lives here under a version id. Changing the text requires a
 * new version so a previous agree no longer counts.
 */

export const AI_DATA_SHARING_CONSENT_VERSION = '2026-10-03.v1';

export const AI_CONSENT_REQUIRED_CODE = 'ai_consent_required';

export interface AiVendorDisclosure {
  readonly name: string;
  readonly data: string;
}

/**
 * Vendors with a code path that sends user content off the device.
 * Genetic files are not listed: the live Advisor and Hannah request builders
 * that were traced do not put GeneX360 results in the outbound body.
 */
export const AI_VENDORS: readonly AiVendorDisclosure[] = [
  {
    name: 'Anthropic',
    data: 'Chat messages, the health context a feature includes with them (such as symptoms, medications, supplements, and the Bio Optimization score), meal and supplement photos, meal-edit transcripts, and body photos when a body scan or body-photo analysis runs.',
  },
  {
    name: 'Google Gemini',
    data: 'Meal photos, meal descriptions, voice recordings used to type a meal, and the text of questions stored in the knowledge log.',
  },
  {
    name: 'Google Cloud Vision',
    data: 'Product-label photos when the label check runs and Google Cloud credentials are configured. If those credentials are missing, that check does not send the photo.',
  },
  {
    name: 'LogMeal',
    data: 'Meal photos for food recognition.',
  },
  {
    name: 'Tavus',
    data: 'Avatar calls. The call uses the camera and microphone, and ViaConnect sends a short text summary with the session. That summary is redacted before it is sent.',
  },
  {
    name: 'OpenAI',
    data: 'Text submitted to the multi-model AI route when the GPT option is selected.',
  },
  {
    name: 'xAI',
    data: 'Text submitted to the multi-model AI route when the Grok option is selected, and research queries that feature sends.',
  },
  {
    name: 'Consensus',
    data: 'Research search text when a research pass runs. This is a paper search, not a chat reply.',
  },
] as const;

export const AI_CONSENT_INTRO =
  'Some ViaConnect features send what you type, photos you submit, voice you record, or health details already in your account to outside AI providers. Those providers use it to generate a reply, a food read, or a body-photo estimate. ViaConnect does not send it for advertising.';

export const AI_CONSENT_DECLINE =
  'If you do not agree, ViaConnect does not call those AI features. The rest of the app still works. You can change this later in Account, under AI sharing.';

export type DisclosureKind =
  | 'camera_meal'
  | 'camera_body'
  | 'photo_library'
  | 'microphone'
  | 'health';

export const PERMISSION_DISCLOSURES: Record<DisclosureKind, string> = {
  camera_meal:
    'ViaConnect uses the camera to photograph a meal or a package. If you agreed to AI sharing, that photo can be sent to Google Gemini, and for some meal photos also to LogMeal or Anthropic, to identify the food. The camera does not start until you continue and allow it.',
  camera_body:
    'ViaConnect uses the camera for body-progress or FormaVision photos. If you agreed to AI sharing, those photos can be sent to Anthropic to estimate body composition. The camera does not start until you continue and allow it.',
  photo_library:
    'ViaConnect uses the photo you choose. If you agreed to AI sharing, that photo can be sent to the AI providers named under AI sharing. The photo picker does not open until you continue.',
  microphone:
    'ViaConnect uses the microphone so you can speak a meal change or talk with the avatar. If you agreed to AI sharing, a recording can be sent to Google Gemini to turn speech into text, and an avatar call sends the camera and microphone to Tavus. A browser speech feature may use the device speech service instead. The microphone does not start until you continue and allow it.',
  health:
    'ViaConnect reads the Apple Health types you allow: heart rate, resting heart rate, heart rate variability, sleep, respiratory rate, oxygen saturation, steps, active energy, body mass, body fat percentage, and lean body mass. On Android, Health Connect is off unless a separate switch is turned on. ViaConnect uses these readings in your wellness record. It does not use them for advertising. The health permission is not requested until you continue.',
};

export interface ConsentSnapshot {
  acceptedAt: string | null;
  revokedAt: string | null;
  version: string | null;
}

export function isAiDataSharingGateEnabled(): boolean {
  const value = process.env.AI_THIRD_PARTY_CONSENT_GATE;
  return value === 'true' || value === '1';
}

export function consentIsCurrent(row: ConsentSnapshot | null): boolean {
  if (!row?.acceptedAt) return false;
  if (row.version !== AI_DATA_SHARING_CONSENT_VERSION) return false;
  const accepted = Date.parse(row.acceptedAt);
  if (Number.isNaN(accepted)) return false;
  if (row.revokedAt) {
    const revoked = Date.parse(row.revokedAt);
    if (Number.isNaN(revoked) || revoked >= accepted) return false;
  }
  return true;
}

const AI_PREFIX = '/api/ai/';

const PERSONAL_DATA_AI_PATHS = [
  '/api/advisor/chat',
  '/api/hannah/ask',
  '/api/hannah/ultrathink',
  '/api/hannah/avatar/session',
  '/api/nutrition/analyze-photo',
  '/api/nutrition/analyze-text',
  '/api/nutrition/photo/recognize',
  '/api/nutrition/photo/analyze',
  '/api/nutrition/voice/transcribe',
  '/api/nutrition/voice/parse',
  '/api/nutrition/voice-native/parse',
  '/api/nutrition/voice-native/clarify',
] as const;

const LEGAL_TRIAGE_PATH = /^\/api\/admin\/legal\/cases\/[^/]+\/triage$/;

export function aiRouteNeedsConsent(pathname: string, method: string): boolean {
  const verb = method.toUpperCase();
  if (verb !== 'POST' && verb !== 'PUT' && verb !== 'PATCH') return false;
  if (pathname === '/api/ai/consent' || pathname === '/api/ai/report') return false;
  if (pathname.startsWith(AI_PREFIX)) return true;
  if (LEGAL_TRIAGE_PATH.test(pathname)) return true;
  return PERSONAL_DATA_AI_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export type AiConsentAccess = 'allow' | 'unauthenticated' | 'denied';

export function decideAiConsentAccess(
  gateEnabled: boolean,
  userId: string | null,
  row: ConsentSnapshot | null | 'error',
): AiConsentAccess {
  if (!gateEnabled) return 'allow';
  if (!userId) return 'unauthenticated';
  if (row === 'error') return 'denied';
  return consentIsCurrent(row) ? 'allow' : 'denied';
}

export function aiConsentDeniedBody(status: 401 | 403): {
  error: string;
  code: typeof AI_CONSENT_REQUIRED_CODE;
} {
  if (status === 401) {
    return { error: 'Unauthenticated', code: AI_CONSENT_REQUIRED_CODE };
  }
  return {
    error: 'AI data sharing is off until you agree.',
    code: AI_CONSENT_REQUIRED_CODE,
  };
}
