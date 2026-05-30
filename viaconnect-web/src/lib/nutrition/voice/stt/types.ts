/**
 * Shared STT (Speech-to-Text) interface for Prompt 170j voice editing per §3.
 *
 * Each provider (Web Speech API, Capacitor native, Gemini Audio server
 * fallback) implements this contract. The orchestrator selects which to
 * use based on platform + availability + kill-switch state.
 */

export interface STTTranscriptUpdate {
  is_final: boolean;
  transcript: string;
  stt_confidence: number | null;
}

export interface STTError {
  kind:
    | 'no_speech_detected'
    | 'audio_capture_failed'
    | 'permission_denied'
    | 'service_unavailable'
    | 'aborted'
    | 'network_error'
    | 'timeout';
  message: string;
}

export interface STTCaptureHandle {
  stop: () => void;
  cancel: () => void;
}

export interface STTCaptureOptions {
  language?: string;
  onUpdate?: (u: STTTranscriptUpdate) => void;
  onComplete: (u: STTTranscriptUpdate) => void;
  onError: (err: STTError) => void;
}

export interface STTProviderClient {
  isAvailable: () => boolean | Promise<boolean>;
  startCapture: (options: STTCaptureOptions) => Promise<STTCaptureHandle>;
}
