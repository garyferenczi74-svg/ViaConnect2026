'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Video, X, Loader2 } from 'lucide-react';

const HANNAH_IMG =
  'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Mobile%20Hero/Hannah%204.png';

interface HannahAvatarProps {
  onClose?: () => void;
}

/**
 * Tavus CVI conversation wrapper for Hannah's avatar mode.
 *
 * NOTE: The Tavus CVI component library (@daily-co/daily-js, @daily-co/daily-react,
 * @tavus/cvi-ui) must be installed before the avatar iframe is functional.
 * Until then, this component handles session creation and displays the
 * conversation via the Tavus-provided URL in an iframe fallback.
 */
export function HannahAvatar({ onClose }: HannahAvatarProps) {
  const [conversationUrl, setConversationUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/hannah/avatar/session', { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setConversationUrl(data.conversationUrl);
      setSessionId(data.sessionId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to start Hannah avatar session');
    } finally {
      setLoading(false);
    }
  };

  const endSession = async () => {
    if (sessionId) {
      await fetch('/api/hannah/avatar/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, endReason: 'user_left' }),
      }).catch(() => {});
    }
    setConversationUrl(null);
    setSessionId(null);
    onClose?.();
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-[#1E3054] rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1A2744] border-b border-white/5">
        <div className="flex items-center gap-2 text-white font-medium">
          <Video strokeWidth={1.5} className="w-5 h-5 text-[#2DA5A0]" />
          <span>Talk to Hannah</span>
        </div>
        <button
          onClick={endSession}
          aria-label="Close avatar session"
          className="text-white/60 hover:text-white transition-colors"
        >
          <X strokeWidth={1.5} className="w-5 h-5" />
        </button>
      </div>

      {/* Video area */}
      <div className="aspect-video bg-black relative">
        {!conversationUrl && !loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="relative h-28 w-28 sm:h-36 sm:w-36 overflow-hidden rounded-full border-2 border-[#2DA5A0]/30 shadow-lg shadow-[#2DA5A0]/10">
              <Image
                src={HANNAH_IMG}
                alt="Hannah, your AI Wellness Assistant"
                fill
                className="object-cover object-top"
                sizes="144px"
                priority
              />
            </div>
            <p className="text-white/80 max-w-md text-sm sm:text-base">
              Hannah is your AI Wellness Assistant. She&apos;ll see and hear you; make sure
              your camera and microphone are ready.
            </p>
            <button
              onClick={start}
              className="min-h-[44px] px-6 py-3 bg-[#2DA5A0] hover:bg-[#2DA5A0]/90 text-white rounded-lg font-medium transition"
            >
              Start Conversation
            </button>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-[#2DA5A0]/30 opacity-60">
              <Image
                src={HANNAH_IMG}
                alt="Hannah"
                fill
                className="object-cover object-top"
                sizes="96px"
              />
            </div>
            <Loader2 strokeWidth={1.5} className="w-6 h-6 text-[#2DA5A0] animate-spin" />
            <p className="text-xs text-white/40">Connecting to Hannah...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 gap-3">
            <p className="text-red-300 text-sm max-w-md text-center">{error}</p>
            <button
              onClick={start}
              className="min-h-[44px] px-4 py-2 text-sm text-[#2DA5A0] border border-[#2DA5A0]/30 rounded-lg hover:bg-[#2DA5A0]/10 transition"
            >
              Try Again
            </button>
          </div>
        )}

        {conversationUrl && (
          <iframe
            src={conversationUrl}
            allow="camera;microphone"
            className="absolute inset-0 h-full w-full border-0"
            title="Hannah Avatar Conversation"
          />
        )}
      </div>

      {/* Footer disclaimer */}
      <div className="px-4 py-2 bg-[#1A2744] text-xs text-white/50 text-center">
        This conversation is not medical advice. Hannah is an AI assistant.
      </div>
    </div>
  );
}
