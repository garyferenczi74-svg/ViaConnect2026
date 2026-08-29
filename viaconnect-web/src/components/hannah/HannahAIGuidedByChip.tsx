'use client';

// In-page HannahAI chrome. The Guided by pill toggles a compact popover
// anchored directly under the chip. Never leaves the current hub for the
// standalone advisor route. Visible on mobile and desktop together. Do
// not copy the Gordon/Arnold desktop-only visibility classes.

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { MessageCircleHeart, Sparkles, X } from 'lucide-react';
import AdvisorChat from '@/components/advisor/AdvisorChat';
import { getDisplayName } from '@/lib/getDisplayName';
import { HANNAH_CONSUMER_SUBTITLE } from '@/lib/jeffery/hannah-persona';

export const HANNAH_AI_CHAT_ID = 'hannah-ai-chat';

export const CONSUMER_HANNAH_SUGGESTED_PROMPTS = [
  'How can I improve my Bio Optimization Score?',
  'Should I take my supplements with food?',
  'What does my MTHFR result mean?',
  'Which genetic test should I take next?',
] as const;

const ACCENT = '#2DA5A0';
const PANEL_MAX_WIDTH_PX = 416;
const VIEWPORT_GUTTER_PX = 16;
const PANEL_GAP_PX = 8;

interface PanelCoords {
  top: number;
  left: number;
  width: number;
}

function hashWantsHannahChat(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hash === `#${HANNAH_AI_CHAT_ID}`;
}

function panelCoordsFromAnchor(anchor: HTMLElement): PanelCoords {
  const rect = anchor.getBoundingClientRect();
  const width = Math.min(
    PANEL_MAX_WIDTH_PX,
    Math.max(0, window.innerWidth - VIEWPORT_GUTTER_PX * 2),
  );
  const maxLeft = Math.max(
    VIEWPORT_GUTTER_PX,
    window.innerWidth - VIEWPORT_GUTTER_PX - width,
  );
  const preferredLeft = rect.right - width;
  const left = Math.min(maxLeft, Math.max(VIEWPORT_GUTTER_PX, preferredLeft));
  return { top: rect.bottom + PANEL_GAP_PX, left, width };
}

export function HannahAIGuidedByChip() {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<PanelCoords | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelDomId = useId();

  const syncCoords = useCallback(() => {
    const anchor = buttonRef.current;
    if (!anchor) return;
    setCoords(panelCoordsFromAnchor(anchor));
  }, []);

  const closePanel = useCallback(() => {
    setOpen(false);
  }, []);

  const togglePanel = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      if (next && buttonRef.current) {
        setCoords(panelCoordsFromAnchor(buttonRef.current));
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (hashWantsHannahChat()) {
      setOpen(true);
      syncCoords();
    }
    const onHash = () => {
      if (hashWantsHannahChat()) {
        setOpen(true);
        syncCoords();
      }
    };
    window.addEventListener('hashchange', onHash);
    window.addEventListener('popstate', onHash);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('popstate', onHash);
    };
  }, [syncCoords]);

  useEffect(() => {
    if (!open) return;
    syncCoords();
    const onDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', syncCoords);
    window.addEventListener('scroll', syncCoords, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', syncCoords);
      window.removeEventListener('scroll', syncCoords, true);
    };
  }, [open, syncCoords]);

  const displayName = getDisplayName('hannahai');

  return (
    <div
      ref={rootRef}
      id={HANNAH_AI_CHAT_ID}
      className="relative inline-flex flex-shrink-0"
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={togglePanel}
        className="inline-flex min-h-[44px] flex-shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-sm text-white/90 backdrop-blur-sm"
        aria-label={`Open chat guided by ${displayName}`}
        aria-expanded={open}
        aria-controls={panelDomId}
        aria-haspopup="dialog"
      >
        <Sparkles className="h-3 w-3 text-[#2DA5A0]" strokeWidth={1.5} />
        Guided by {getDisplayName('hannahai')}
      </button>
      {open ? (
        <div
          id={panelDomId}
          role="dialog"
          aria-modal="false"
          aria-label={`${displayName} Wellness Assistant`}
          className="fixed z-[60] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1E3054]/80 shadow-xl shadow-black/40 backdrop-blur-md max-w-[min(26rem,calc(100vw-2rem))]"
          style={
            coords
              ? { top: coords.top, left: coords.left, width: coords.width }
              : { top: 72, right: 16, width: 'min(26rem, calc(100vw - 2rem))' }
          }
        >
          <button
            type="button"
            onClick={closePanel}
            aria-label="Close chat"
            className="absolute right-1 top-1 z-10 flex h-11 w-11 items-center justify-center rounded-lg text-white/50 transition-colors hover:text-white"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <AdvisorChat
            embedded
            role="consumer"
            accentColor={ACCENT}
            title={`${getDisplayName('hannahai')} Wellness Assistant`}
            subtitle={HANNAH_CONSUMER_SUBTITLE}
            icon={
              <MessageCircleHeart
                className="w-5 h-5"
                strokeWidth={1.5}
                style={{ color: ACCENT }}
              />
            }
            suggestedPrompts={[...CONSUMER_HANNAH_SUGGESTED_PROMPTS]}
          />
        </div>
      ) : null}
    </div>
  );
}

export default HannahAIGuidedByChip;
