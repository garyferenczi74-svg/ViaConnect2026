// Prompt 231: FormaVision scan countdown speech. Picks a calm female
// device voice when the browser lists one, then speaks walk-in and pose
// count digits through the Web Speech API. No paid TTS, no new
// dependency. Fail-closed: any speech error is swallowed so capture
// never blocks. Toggle Off is a no-op at the helper door.

export const SCAN_SPEECH_RATE = 0.88;
export const SCAN_SPEECH_PITCH = 1.05;

/** Preferred device voice names, first match wins. Chrome, Safari, and
 * Edge ship these as on-device female English voices. */
export const PREFERRED_FEMALE_VOICE_NAMES = [
  'Samantha',
  'Google UK English Female',
  'Microsoft Zira',
] as const;

/** Given-name / product tokens that usually mark a female TTS voice.
 * Matched case-insensitively. Short tokens use a word boundary so "Ava"
 * does not collide with longer names. */
const FEMALE_NAME_HINTS = [
  'samantha',
  'zira',
  'karen',
  'moira',
  'tessa',
  'fiona',
  'victoria',
  'susan',
  'allison',
  'salli',
  'joanna',
  'kendra',
  'kimberly',
  'serena',
  'veena',
  'hazel',
  'kate',
  'emma',
  'ava',
  'ivy',
  'amy',
] as const;

export interface ScanSpeechVoice {
  name: string;
  lang: string;
  default: boolean;
  localService?: boolean;
  voiceURI?: string;
}

let voicesListenerBound = false;

function isEnglishLang(lang: string): boolean {
  return lang.toLowerCase().startsWith('en');
}

function nameHasFemaleToken(name: string): boolean {
  const lower = name.toLowerCase();
  if (lower.includes('female') || lower.includes('woman')) return true;
  // Chrome desktop ships "Google US English" as a female voice without
  // putting Female in the name. Skip if the same string is tagged Male.
  if (lower.includes('google us english') && !/\bmale\b/i.test(name)) return true;
  return FEMALE_NAME_HINTS.some((hint) => {
    if (hint.length <= 3) {
      return new RegExp(`\\b${hint}\\b`, 'i').test(name);
    }
    return lower.includes(hint);
  });
}

function nameHasMaleToken(name: string): boolean {
  const lower = name.toLowerCase();
  // "female" contains the letters "male", so require female to lose first.
  if (lower.includes('female') || lower.includes('woman')) return false;
  return /\bmale\b/i.test(name);
}

function preferredNameRank(name: string): number {
  const lower = name.toLowerCase();
  for (let i = 0; i < PREFERRED_FEMALE_VOICE_NAMES.length; i++) {
    if (lower.includes(PREFERRED_FEMALE_VOICE_NAMES[i].toLowerCase())) {
      return PREFERRED_FEMALE_VOICE_NAMES.length - i;
    }
  }
  return 0;
}

function scoreVoice(voice: ScanSpeechVoice): number {
  const preferred = preferredNameRank(voice.name);
  const female = nameHasFemaleToken(voice.name);
  const male = nameHasMaleToken(voice.name);
  const english = isEnglishLang(voice.lang);

  let score = 0;
  if (preferred > 0) score += 1000 + preferred * 10;
  if (female && english) score += 300;
  else if (female) score += 200;
  if (english) score += 50;
  if (voice.default) score += 5;
  if (voice.localService) score += 2;
  if (male && !female) score -= 400;
  return score;
}

/**
 * Pick the best available female (or, failing that, any) voice from the
 * device list. Returns null only when the list is empty so the caller can
 * still speak with the engine default rather than going silent.
 */
export function selectFemaleVoice<T extends ScanSpeechVoice>(
  voices: ReadonlyArray<T>,
): T | null {
  if (voices.length === 0) return null;

  let best = voices[0];
  let bestScore = scoreVoice(best);
  for (let i = 1; i < voices.length; i++) {
    const candidate = voices[i];
    const score = scoreVoice(candidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

/** Call once on mount so Chrome/Safari start loading voices (getVoices
 * is often empty until voiceschanged). Safe to call repeatedly. */
export function primeScanVoices(): void {
  if (typeof window === 'undefined') return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  try {
    void synth.getVoices();
    if (voicesListenerBound) return;
    voicesListenerBound = true;
    const refresh = (): void => {
      try {
        void synth.getVoices();
      } catch {
        // fail silently, never blocks capture
      }
    };
    if (typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', refresh);
    } else {
      synth.onvoiceschanged = refresh;
    }
  } catch {
    // fail silently, never blocks capture
  }
}

/** Test hook: drop the voiceschanged listener flag so suites can re-prime. */
export function resetScanSpeechForTests(): void {
  voicesListenerBound = false;
}

/**
 * Speak one countdown tick (or the empty warmup string). Honors the
 * On/Off toggle. Assigns a selected female voice after listing device
 * voices (iOS needs voice set on the utterance once the list is live).
 * Rate/pitch are slightly slower and softer than the engine defaults.
 */
export function speakScanCountdown(text: string, enabled: boolean): void {
  if (!enabled) return;
  if (typeof window === 'undefined') return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  try {
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = SCAN_SPEECH_RATE;
    utterance.pitch = SCAN_SPEECH_PITCH;
    let voices: SpeechSynthesisVoice[] = [];
    try {
      voices = synth.getVoices();
    } catch {
      voices = [];
    }
    const voice = selectFemaleVoice(voices);
    if (voice) {
      utterance.voice = voice;
      if (voice.lang) utterance.lang = voice.lang;
    }
    synth.speak(utterance);
  } catch {
    // fail silently, never blocks capture
  }
}
