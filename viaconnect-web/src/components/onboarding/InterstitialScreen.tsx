"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Brain } from "lucide-react";
import type { InterstitialConfig } from "@/config/onboarding";
import {
  INTERSTITIAL_AUTO_ADVANCE_MS,
  INTERSTITIAL_PROGRESS_TICK_MS,
} from "@/config/caq-interstitial-advance";
import { InterstitialContinueButton } from "./InterstitialContinueButton";

// 173c 1.2: settings toggle so users can disable the reading-time-aware
// auto-advance globally. Stored in localStorage so it persists across
// reloads; the future /settings/caq surface can mirror this.
const AUTO_ADVANCE_DISABLED_KEY = "caq.interstitial.autoAdvanceDisabled";

function readAutoAdvanceDisabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(AUTO_ADVANCE_DISABLED_KEY) === "true";
  } catch {
    return false;
  }
}

// ─── ProgressDots ───────────────────────────────────────────────────────────

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap" role="progressbar" aria-valuenow={current} aria-valuemin={1} aria-valuemax={total} aria-label={`Step ${current} of ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const dotIndex = i + 1;
        const isCompleted = dotIndex <= current;
        const isCurrent = dotIndex === current;
        return (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              isCompleted ? "w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 bg-orange-500" : "w-1 h-1 sm:w-2 sm:h-2 bg-white/20"
            } ${isCurrent ? "ring-2 ring-orange-500/30" : ""}`}
          />
        );
      })}
    </div>
  );
}

// ─── FeaturePreviewCard ─────────────────────────────────────────────────────

function FeaturePreviewCard({ card }: { card: NonNullable<InterstitialConfig["featureCard"]> }) {
  return (
    <div className="w-full rounded-2xl p-6 bg-white/10 backdrop-blur-md border border-white/15 shadow-lg shadow-black/10">
      <p className="text-xs font-semibold tracking-[0.2em] uppercase text-white/50 mb-1">
        {card.category}
      </p>
      <h3 className="text-base font-medium text-white/80 mb-3">{card.title}</h3>
      <p className="text-lg md:text-xl font-light text-white leading-relaxed">
        {card.description}
      </p>
    </div>
  );
}

// ─── FloatingPills ──────────────────────────────────────────────────────────

function FloatingPills() {
  const pills = [
    { label: "Emerging Innovations", cls: "top-4 left-0" },
    { label: "Peer-Reviewed Studies", cls: "top-20 right-0" },
    { label: "Clinical Trial Outcomes", cls: "bottom-20 left-0" },
    { label: "Expert Consensus Reports", cls: "bottom-4 right-0" },
  ];

  return (
    <div className="relative w-56 h-56 sm:w-72 sm:h-72 mx-auto my-4 sm:my-6">
      {[1, 2, 3].map((ring) => (
        <div
          key={ring}
          className="absolute rounded-full border border-white/10"
          style={{
            width: `${ring * 33}%`,
            height: `${ring * 33}%`,
            top: `${50 - ring * 16.5}%`,
            left: `${50 - ring * 16.5}%`,
          }}
        />
      ))}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-[#B75E18] to-[#D4741F] flex items-center justify-center shadow-lg shadow-orange-500/30">
        <Brain className="w-10 h-10 text-white" />
      </div>
      {pills.map((pill, i) => (
        <motion.div
          key={pill.label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 + i * 0.2, duration: 0.5 }}
          className={`absolute ${pill.cls}`}
        >
          <span className="inline-block px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white text-black text-xs sm:text-sm font-medium shadow-lg whitespace-nowrap">
            {pill.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

// ─── BackgroundLayer ────────────────────────────────────────────────────────

function BackgroundLayer({ background }: { background: InterstitialConfig["background"] }) {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    setPrefersReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  return (
    <div className="absolute inset-0 z-0">
      {/* Animated gradient fallback , always rendered */}
      <div
        className="absolute inset-0 animate-gradient-shift"
        style={{
          background: background.fallbackGradient,
          backgroundSize: "400% 400%",
        }}
      />

      {/* Video layer */}
      {background.type === "video" && background.src && !videoError && !prefersReducedMotion && (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          onLoadedData={() => setVideoLoaded(true)}
          onError={() => setVideoError(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            videoLoaded ? "opacity-100" : "opacity-0"
          }`}
        >
          <source src={background.src} type="video/mp4" />
        </video>
      )}
    </div>
  );
}

// ─── InterstitialScreen (Main Export) ───────────────────────────────────────

interface InterstitialScreenProps {
  config: InterstitialConfig;
  onContinue: () => void;
  celebrationMode?: boolean;
}

export function InterstitialScreen({ config, onContinue, celebrationMode }: InterstitialScreenProps) {
  const buttonDelay = celebrationMode ? 2.0 : 0.5;

  // 173c 1.2 hybrid advance: tap anywhere advances, otherwise auto-advance
  // after a reading-time-aware delay with a visible progress fill. Pause on
  // any interaction (hover, touch, keyboard focus). Disabled entirely when
  // prefers-reduced-motion is set, in celebration mode, or when the user
  // disabled auto-advance in settings.
  const [paused, setPaused] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [autoAdvanceDisabled, setAutoAdvanceDisabled] = useState(false);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPrefersReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setAutoAdvanceDisabled(readAutoAdvanceDisabled());
  }, []);

  // Reset on config change so a navigated-back interstitial starts fresh.
  useEffect(() => {
    setPaused(false);
    setProgressPct(0);
    startedAtRef.current = null;
  }, [config.id]);

  // 173d Section 1: fixed 8 second auto-advance. The reading-time-aware
  // delay formula from 173c is retired in favor of one constant so users
  // get a predictable cadence and the long interstitials are no longer at
  // risk of feeling rushed.
  const delayMs = INTERSTITIAL_AUTO_ADVANCE_MS;

  // Auto-advance + progress fill. Skips entirely under the disabled cases.
  const autoAdvanceActive =
    !celebrationMode && !prefersReducedMotion && !autoAdvanceDisabled && !paused;

  useEffect(() => {
    if (!autoAdvanceActive) {
      // Pause on entering a disabled state by freezing progress where it is
      // (do NOT reset to 0 so the user sees how much time was already used).
      return;
    }
    let cancelled = false;
    const startedAt = startedAtRef.current ?? Date.now();
    startedAtRef.current = startedAt;
    const tick = () => {
      if (cancelled) return;
      const elapsed = Date.now() - startedAt;
      const pct = Math.min(100, (elapsed / delayMs) * 100);
      setProgressPct(pct);
      if (pct >= 100) {
        onContinue();
        return;
      }
      window.setTimeout(tick, INTERSTITIAL_PROGRESS_TICK_MS);
    };
    window.setTimeout(tick, INTERSTITIAL_PROGRESS_TICK_MS);
    return () => { cancelled = true; };
  }, [autoAdvanceActive, delayMs, onContinue]);

  // 173c 1.2: tap anywhere advances. The outer div catches the click so
  // the user can tap the background, the quote, the featureCard, anywhere.
  // The dedicated Continue button at the bottom still works (the click
  // bubbles up). Celebration mode does NOT advance on tap because it has
  // its own scripted timing.
  const handleTapAdvance = () => {
    if (celebrationMode) return;
    onContinue();
  };

  // Any hover, touch, or keyboard focus pauses the auto-advance so the
  // reader is never cut off mid-thought. Once paused, stays paused until
  // the user explicitly taps. Mirrors the "Pause Stop Hide" intent of
  // WCAG 2.2.2 plus the spirit of 2.3.3.
  const handlePauseTrigger = () => {
    if (autoAdvanceActive) setPaused(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden cursor-pointer"
      onClick={handleTapAdvance}
      onMouseMove={handlePauseTrigger}
      onTouchStart={handlePauseTrigger}
      onFocus={handlePauseTrigger}
      role="button"
      tabIndex={-1}
      aria-label="Tap to advance"
    >
      {/* Layer 1: Background */}
      <BackgroundLayer background={config.background} />

      {/* Layer 2: Dark overlay */}
      <div className="absolute inset-0 bg-black z-[1]" style={{ opacity: config.background.overlayOpacity }} />

      {/* Layer 3: Content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-grow w-full max-w-lg mx-auto px-6">
        {/* Progress Dots (hidden when totalDots is 0) */}
        {config.totalDots > 0 && (
          <div className="absolute top-12 left-6 right-6">
            <ProgressDots current={config.dotPosition} total={config.totalDots} />
          </div>
        )}

        {/* Celebration Icon (completion screen only) */}
        {celebrationMode && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
            className="mb-8"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-teal-500 flex items-center justify-center mx-auto shadow-lg shadow-teal-500/30 animate-pulse">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </motion.div>
        )}

        {/* Quote */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: celebrationMode ? 0.6 : 0.15 }}
          className="text-center mb-8"
        >
          <h1 className="text-xl sm:text-3xl md:text-4xl font-light text-white leading-relaxed tracking-tight px-2">
            {config.quote}
          </h1>
          {config.subtext && !celebrationMode && (
            <p className="text-sm text-white/50 mt-4 tracking-wider uppercase">{config.subtext}</p>
          )}
        </motion.div>

        {/* Analyzing spinner (celebration mode) */}
        {celebrationMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.6 }}
            className="flex items-center gap-2"
          >
            <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-white/40 tracking-wider uppercase">Analyzing your responses...</span>
          </motion.div>
        )}

        {/* Floating Pills (Science interstitial) */}
        {config.floatingPills && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <FloatingPills />
          </motion.div>
        )}

        {/* Feature Card */}
        {config.featureCard && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
            className="w-full"
          >
            <FeaturePreviewCard card={config.featureCard} />
          </motion.div>
        )}
      </div>

      {/* Layer 4 (173d Sections 2 + 3): compact white glass Continue
          button. Hugs its label, ~ 44 by 44 CSS pixel tappable area on
          mobile, navy label on frosted glass. The hero video softens
          behind it via backdrop-blur where supported. The wrapper centers
          the button so it does not stretch to the full width any more. */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: buttonDelay }}
        className="relative z-10 w-full max-w-lg mx-auto px-6 pb-12 flex justify-center"
      >
        <InterstitialContinueButton onClick={() => onContinue()} />
      </motion.div>

      {/* Layer 5 (173c 1.2): subtle progress fill at the bottom that
          fills over the fixed 8 second auto-advance. Hidden under
          prefers-reduced-motion + celebration mode + the user setting
          off. The bar is decorative (aria-hidden) so screen-reader
          users are never advanced before the copy finishes. */}
      {!celebrationMode && !prefersReducedMotion && !autoAdvanceDisabled ? (
        <div
          className="absolute bottom-0 left-0 right-0 z-[2] h-0.5 bg-white/[0.04]"
          aria-hidden="true"
        >
          <div
            className="h-full bg-white/35"
            style={{
              width: `${progressPct}%`,
              transition: paused ? "none" : `width ${INTERSTITIAL_PROGRESS_TICK_MS}ms linear`,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
