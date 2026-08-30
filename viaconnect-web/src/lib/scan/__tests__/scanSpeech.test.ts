/**
 * Voice selection + fail-closed speech for the FormaVision scan countdown.
 * Mocks speechSynthesis the way Chrome/Safari expose it (getVoices list,
 * optional voiceschanged). No DOM required.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  SCAN_SPEECH_PITCH,
  SCAN_SPEECH_RATE,
  selectFemaleVoice,
  speakScanCountdown,
  primeScanVoices,
  resetScanSpeechForTests,
  type ScanSpeechVoice,
} from '@/lib/scan/scanSpeech';

function voice(
  name: string,
  lang: string,
  extras: Partial<Pick<ScanSpeechVoice, 'default' | 'localService' | 'voiceURI'>> = {},
): ScanSpeechVoice {
  return {
    name,
    lang,
    default: extras.default ?? false,
    localService: extras.localService,
    voiceURI: extras.voiceURI ?? name,
  };
}

class FakeUtterance {
  text: string;
  voice: ScanSpeechVoice | null = null;
  rate = 1;
  pitch = 1;
  lang = '';
  constructor(text: string) {
    this.text = text;
  }
}

interface FakeSynth {
  getVoices: ReturnType<typeof vi.fn>;
  speak: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
  addEventListener?: ReturnType<typeof vi.fn>;
  onvoiceschanged: (() => void) | null;
}

function installSpeech(synth: FakeSynth): void {
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  vi.stubGlobal('window', {
    speechSynthesis: synth,
    SpeechSynthesisUtterance: FakeUtterance,
  });
}

describe('selectFemaleVoice', () => {
  it('returns null when the device list is empty', () => {
    expect(selectFemaleVoice([])).toBeNull();
  });

  it('prefers Samantha over other English voices', () => {
    const samantha = voice('Samantha', 'en-US', { localService: true });
    const picked = selectFemaleVoice([
      voice('Alex', 'en-US', { default: true }),
      samantha,
      voice('Daniel', 'en-GB'),
    ]);
    expect(picked).toBe(samantha);
  });

  it('prefers Google UK English Female when Samantha is absent', () => {
    const ukFemale = voice('Google UK English Female', 'en-GB');
    const picked = selectFemaleVoice([
      voice('Google UK English Male', 'en-GB', { default: true }),
      ukFemale,
      voice('Google US English', 'en-US'),
    ]);
    expect(picked).toBe(ukFemale);
  });

  it('prefers Microsoft Zira when the Safari/Chrome names are absent', () => {
    const zira = voice('Microsoft Zira Desktop - English (United States)', 'en-US');
    const picked = selectFemaleVoice([
      voice('Microsoft David Desktop - English (United States)', 'en-US', { default: true }),
      zira,
    ]);
    expect(picked).toBe(zira);
  });

  it('treats Chrome Google US English as female when Male is not in the name', () => {
    const usEnglish = voice('Google US English', 'en-US');
    const picked = selectFemaleVoice([
      voice('Google UK English Male', 'en-GB', { default: true }),
      usEnglish,
    ]);
    expect(picked).toBe(usEnglish);
  });

  it('uses lang + name heuristics for an English female (Karen)', () => {
    const karen = voice('Karen', 'en-AU');
    const picked = selectFemaleVoice([
      voice('Daniel', 'en-GB'),
      karen,
      voice('Jorge', 'es-ES'),
    ]);
    expect(picked).toBe(karen);
  });

  it('treats an explicit Female token as female even when the name also has male letters', () => {
    const female = voice('Chrome English Female', 'en-US');
    const picked = selectFemaleVoice([
      voice('Chrome English Male', 'en-US', { default: true }),
      female,
    ]);
    expect(picked).toBe(female);
  });

  it('does not treat a short hint as a substring of a longer name', () => {
    const david = voice('David', 'en-US', { default: true });
    const picked = selectFemaleVoice([
      david,
      voice('Ava', 'en-US'),
    ]);
    expect(picked?.name).toBe('Ava');
    expect(selectFemaleVoice([david, voice('Avalon', 'en-US')])).toBe(david);
  });

  it('prefers an English female over a non-English female', () => {
    const susan = voice('Susan', 'en-US');
    const picked = selectFemaleVoice([
      voice('Helena', 'de-DE'),
      voice('Paulina', 'es-MX'),
      susan,
    ]);
    expect(picked).toBe(susan);
  });

  it('still returns a voice when every listed voice is male', () => {
    const alex = voice('Alex', 'en-US', { default: true });
    const picked = selectFemaleVoice([
      voice('Daniel', 'en-GB'),
      alex,
      voice('Jorge', 'es-ES'),
    ]);
    expect(picked).not.toBeNull();
    expect(picked?.lang.toLowerCase().startsWith('en')).toBe(true);
  });

  it('returns the first voice rather than null when no female or English match exists', () => {
    const first = voice('Jorge', 'es-ES');
    const picked = selectFemaleVoice([first, voice('Thomas', 'fr-FR')]);
    expect(picked).toBe(first);
  });
});

describe('speakScanCountdown - toggle and fail-closed', () => {
  beforeEach(() => {
    resetScanSpeechForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetScanSpeechForTests();
  });

  it('does not speak when the voice toggle is Off', () => {
    const synth: FakeSynth = {
      getVoices: vi.fn(() => [voice('Samantha', 'en-US')]),
      speak: vi.fn(),
      cancel: vi.fn(),
      onvoiceschanged: null,
    };
    installSpeech(synth);

    speakScanCountdown('5', false);

    expect(synth.cancel).not.toHaveBeenCalled();
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('does not throw or speak when speechSynthesis is missing', () => {
    vi.stubGlobal('window', {});
    expect(() => speakScanCountdown('5', true)).not.toThrow();
  });

  it('does not throw when window is undefined', () => {
    vi.stubGlobal('window', undefined);
    expect(() => speakScanCountdown('5', true)).not.toThrow();
  });

  it('assigns the selected female voice, slower rate, and softer pitch', () => {
    const samantha = voice('Samantha', 'en-US', { localService: true });
    const spoken: FakeUtterance[] = [];
    const synth: FakeSynth = {
      getVoices: vi.fn(() => [
        voice('Alex', 'en-US', { default: true }),
        samantha,
      ]),
      speak: vi.fn((utterance: FakeUtterance) => {
        spoken.push(utterance);
      }),
      cancel: vi.fn(),
      onvoiceschanged: null,
    };
    installSpeech(synth);

    speakScanCountdown('10', true);

    expect(synth.cancel).toHaveBeenCalledTimes(1);
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(spoken[0]?.text).toBe('10');
    expect(spoken[0]?.voice).toBe(samantha);
    expect(spoken[0]?.lang).toBe('en-US');
    expect(spoken[0]?.rate).toBe(SCAN_SPEECH_RATE);
    expect(spoken[0]?.pitch).toBe(SCAN_SPEECH_PITCH);
    expect(SCAN_SPEECH_RATE).toBeLessThan(1);
    expect(SCAN_SPEECH_PITCH).not.toBe(1);
  });

  it('still speaks when getVoices returns an empty list (voices not loaded yet)', () => {
    const spoken: FakeUtterance[] = [];
    const synth: FakeSynth = {
      getVoices: vi.fn(() => []),
      speak: vi.fn((utterance: FakeUtterance) => {
        spoken.push(utterance);
      }),
      cancel: vi.fn(),
      onvoiceschanged: null,
    };
    installSpeech(synth);

    speakScanCountdown('4', true);

    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(spoken[0]?.text).toBe('4');
    expect(spoken[0]?.voice).toBeNull();
    expect(spoken[0]?.rate).toBe(SCAN_SPEECH_RATE);
  });

  it('still speaks with a male fallback when no female voice exists', () => {
    const alex = voice('Alex', 'en-US', { default: true });
    const spoken: FakeUtterance[] = [];
    const synth: FakeSynth = {
      getVoices: vi.fn(() => [alex, voice('Daniel', 'en-GB')]),
      speak: vi.fn((utterance: FakeUtterance) => {
        spoken.push(utterance);
      }),
      cancel: vi.fn(),
      onvoiceschanged: null,
    };
    installSpeech(synth);

    speakScanCountdown('3', true);

    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(spoken[0]?.voice).toBe(alex);
  });

  it('swallows speak errors so capture is never blocked', () => {
    const synth: FakeSynth = {
      getVoices: vi.fn(() => [voice('Samantha', 'en-US')]),
      speak: vi.fn(() => {
        throw new Error('tts exploded');
      }),
      cancel: vi.fn(),
      onvoiceschanged: null,
    };
    installSpeech(synth);

    expect(() => speakScanCountdown('2', true)).not.toThrow();
  });

  it('swallows getVoices errors and still attempts to speak', () => {
    const synth: FakeSynth = {
      getVoices: vi.fn(() => {
        throw new Error('voices blocked');
      }),
      speak: vi.fn(),
      cancel: vi.fn(),
      onvoiceschanged: null,
    };
    installSpeech(synth);

    expect(() => speakScanCountdown('1', true)).not.toThrow();
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });

  it('swallows SpeechSynthesisUtterance constructor failures', () => {
    const synth: FakeSynth = {
      getVoices: vi.fn(() => [voice('Samantha', 'en-US')]),
      speak: vi.fn(),
      cancel: vi.fn(),
      onvoiceschanged: null,
    };
    vi.stubGlobal('window', { speechSynthesis: synth });
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      constructor() {
        throw new Error('no utterance');
      }
    });

    expect(() => speakScanCountdown('5', true)).not.toThrow();
    expect(synth.speak).not.toHaveBeenCalled();
  });
});

describe('primeScanVoices', () => {
  beforeEach(() => {
    resetScanSpeechForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetScanSpeechForTests();
  });

  it('calls getVoices and binds voiceschanged so Chrome/Safari can populate later', () => {
    const addEventListener = vi.fn();
    const synth: FakeSynth = {
      getVoices: vi.fn(() => []),
      speak: vi.fn(),
      cancel: vi.fn(),
      addEventListener,
      onvoiceschanged: null,
    };
    installSpeech(synth);

    primeScanVoices();
    primeScanVoices();

    expect(synth.getVoices).toHaveBeenCalled();
    expect(addEventListener).toHaveBeenCalledTimes(1);
    expect(addEventListener.mock.calls[0]?.[0]).toBe('voiceschanged');
  });

  it('falls back to onvoiceschanged when addEventListener is missing', () => {
    const synth: FakeSynth = {
      getVoices: vi.fn(() => []),
      speak: vi.fn(),
      cancel: vi.fn(),
      onvoiceschanged: null,
    };
    installSpeech(synth);

    primeScanVoices();

    expect(typeof synth.onvoiceschanged).toBe('function');
  });

  it('does not throw when speechSynthesis is missing', () => {
    vi.stubGlobal('window', {});
    expect(() => primeScanVoices()).not.toThrow();
  });
});

describe('ScanExperience wiring', () => {
  it('routes countdown speech through scanSpeech and does not construct utterances itself', () => {
    const src = readFileSync(
      resolve(__dirname, '../../../components/scan/ScanExperience.tsx'),
      'utf8',
    );
    expect(src).toContain("from '@/lib/scan/scanSpeech'");
    expect(src).toContain('speakScanCountdown');
    expect(src).toContain('primeScanVoices');
    expect(src).not.toContain('new SpeechSynthesisUtterance');
    expect(src).toContain('data-testid="scan-setup-voice-toggle"');
  });
});
