"use client";

// /waitlist — public pre-launch landing page for the Founding 8,888.
//
// Anonymous visitors can:
//   • See live capacity stats (X / 8,888 spots claimed)
//   • Read the four founder benefits
//   • Submit their email to join
//   • See their position number in the success state
//
// All server interaction goes through two SECURITY DEFINER functions:
//   • waitlist_stats() — public counts only, no emails
//   • waitlist_join(email, source, ua) — atomic insert with capacity guard
//
// No auth required. The page lives at the app root (outside (app) and
// (auth) groups) so the auth gate doesn't apply.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Sparkles, Crown, FlaskConical, Tag, Check, ArrowRight, Loader2, Mail, AlertTriangle, ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ── Founder benefits (the 4 perks) ────────────────────────────────────
const BENEFITS = [
  {
    icon: Tag,
    title: "25% off your first order",
    description: "Founders save a flat 25% on their first purchase, any product, any portal.",
    accent: "#2DA5A0",
  },
  {
    icon: Crown,
    title: "6 months Platinum free",
    description: "Six months of the Platinum Personal Wellness Portal — recommendations, tracking, AI clinical reasoning — on us.",
    accent: "#B75E18",
  },
  {
    icon: FlaskConical,
    title: "1 year Platinum free with GeneX360",
    description: "Buy a GeneX360 panel and we extend your Platinum Wellness Portal access to a full year, free.",
    accent: "#7C6FE0",
  },
  {
    icon: Sparkles,
    title: "20% off products with GeneX360",
    description: "Pair any GeneX360 panel with our supplement library and save 20% on every product in the same order.",
    accent: "#E87DA0",
  },
] as const;

interface JoinResult {
  success: boolean;
  already_joined?: boolean;
  position?: number;
  capacity?: number;
  remaining?: number;
  error?: string;
}

interface Stats {
  total: number;
  capacity: number;
  remaining: number;
  percent_filled: number;
}

const DEFAULT_STATS: Stats = {
  total: 0,
  capacity: 8888,
  remaining: 8888,
  percent_filled: 0,
};

export default function WaitlistPage() {
  const reduce = useReducedMotion();
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<JoinResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Initial stats fetch ──────────────────────────────────────────
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await (supabase as any).rpc("waitlist_stats");
        if (!active) return;
        if (data && typeof data === "object") {
          setStats({
            total: Number(data.total ?? 0),
            capacity: Number(data.capacity ?? 8888),
            remaining: Number(data.remaining ?? 8888),
            percent_filled: Number(data.percent_filled ?? 0),
          });
        }
      } catch {
        /* network blip — keep defaults */
      } finally {
        if (active) setStatsLoaded(true);
      }
    })();
    return () => { active = false; };
  }, []);

  // ── Submit handler ───────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;
      const referrer = typeof document !== "undefined" ? document.referrer || null : null;
      const { data, error } = await (supabase as any).rpc("waitlist_join", {
        p_email: trimmed,
        p_referral_source: referrer,
        p_user_agent: ua,
      });
      if (error) {
        setErrorMsg(
          error.message?.includes("invalid_email")
            ? "That email doesn't look right. Try again."
            : "Something went wrong. Please try again in a moment.",
        );
        return;
      }
      const payload = data as JoinResult;
      if (!payload?.success) {
        if (payload?.error === "capacity_full") {
          setErrorMsg("All 8,888 founder spots have been claimed. Watch your inbox for general-launch news.");
        } else {
          setErrorMsg("We couldn't add you to the waitlist. Please try again.");
        }
        return;
      }
      setResult(payload);
      // Bump the local stats so the progress bar updates immediately.
      setStats(s => ({
        ...s,
        total: payload.position ?? s.total + 1,
        remaining: Math.max(0, s.capacity - (payload.position ?? s.total + 1)),
        percent_filled: Math.min(100, ((payload.position ?? s.total + 1) / s.capacity) * 100),
      }));
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const capacityFull = stats.remaining <= 0 && !result;
  const percent = useMemo(() => Math.min(100, Math.max(0, stats.percent_filled)), [stats.percent_filled]);

  return (
    <div
      className="min-h-screen w-full text-white"
      style={{ background: "radial-gradient(ellipse at top, #1E3054 0%, #1A2744 45%, #141E33 100%)" }}
    >
      {/* Header bar */}
      <header className="w-full px-4 sm:px-6 lg:px-10 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="text-sm font-semibold tracking-wide text-white/90 hover:text-white transition-colors">
          ViaConnect<span className="text-[#2DA5A0]">™</span>
        </Link>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/40">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2DA5A0]" strokeWidth={1.5} />
          Pre-launch
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-10 pb-16">
        {/* Hero */}
        <section className="text-center pt-6 md:pt-10">
          <motion.div
            initial={reduce ? undefined : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 text-[#2DA5A0] text-[10px] font-semibold uppercase tracking-[0.18em] mb-5"
          >
            <Sparkles className="w-3 h-3" strokeWidth={1.5} />
            Founding 8,888
          </motion.div>

          <motion.h1
            initial={reduce ? undefined : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="text-3xl md:text-5xl font-bold leading-tight tracking-tight"
          >
            Be one of the first <span className="text-[#2DA5A0]">8,888</span> on the inside.
          </motion.h1>

          <motion.p
            initial={reduce ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-sm md:text-base text-white/60 mt-4 max-w-xl mx-auto leading-relaxed"
          >
            Join the FarmCeutica founders list and lock in lifetime perks before launch.
            One Genome. One Formulation. One Life at a Time.™
          </motion.p>
        </section>

        {/* Capacity counter + progress */}
        <section className="mt-10">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm px-5 py-5">
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-white/40">Founder spots claimed</p>
                <p className="text-2xl md:text-3xl font-bold text-white tabular-nums mt-1">
                  <AnimatedNumber value={statsLoaded ? stats.total : 0} />{" "}
                  <span className="text-white/30 text-base font-medium">/ {stats.capacity.toLocaleString()}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-[0.15em] text-white/40">Remaining</p>
                <p className="text-lg font-bold text-[#2DA5A0] tabular-nums mt-1">
                  {stats.remaining.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 90, damping: 20, delay: 0.2 }}
                className="h-full rounded-full bg-gradient-to-r from-[#2DA5A0] via-[#2DA5A0] to-[#B75E18] shadow-[0_0_20px_rgba(45,165,160,0.4)]"
                style={{ minWidth: percent > 0 ? "0.5rem" : 0 }}
              />
            </div>
            <p className="text-[10px] text-white/30 mt-2">
              {percent.toFixed(2)}% claimed · Once full, founder benefits close.
            </p>
          </div>
        </section>

        {/* Benefits grid */}
        <section className="mt-10">
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4">Founder benefits</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BENEFITS.map((b, i) => {
              const Icon = b.icon;
              return (
                <motion.div
                  key={b.title}
                  initial={reduce ? undefined : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.07 }}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 md:p-5 hover:border-white/[0.15] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${b.accent}33, ${b.accent}10)`,
                        border: `1px solid ${b.accent}33`,
                      }}
                    >
                      <Icon className="w-4 h-4" strokeWidth={1.5} style={{ color: b.accent }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-white leading-snug">{b.title}</h3>
                      <p className="text-xs text-white/50 mt-1.5 leading-relaxed">{b.description}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Form / success state */}
        <section className="mt-10">
          {result ? (
            <SuccessCard
              position={result.position ?? 0}
              capacity={result.capacity ?? stats.capacity}
              alreadyJoined={!!result.already_joined}
            />
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-white/[0.10] bg-gradient-to-br from-[#1E3054] to-[#1A2744] p-5 md:p-6"
            >
              <label htmlFor="waitlist-email" className="block text-xs text-white/50 mb-2">
                Your email
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Mail
                    className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    strokeWidth={1.5}
                  />
                  <input
                    id="waitlist-email"
                    type="email"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={submitting || capacityFull}
                    className="w-full pl-10 pr-3 py-3 rounded-xl bg-white/[0.04] border border-white/[0.10] text-sm text-white placeholder:text-white/30 focus:border-[#2DA5A0]/60 focus:ring-2 focus:ring-[#2DA5A0]/25 focus:outline-none transition-all disabled:opacity-50"
                  />
                </div>
                <motion.button
                  type="submit"
                  disabled={submitting || capacityFull}
                  whileHover={reduce || submitting || capacityFull ? undefined : { scale: 1.02 }}
                  whileTap={reduce || submitting || capacityFull ? undefined : { scale: 0.97 }}
                  className={`min-h-[48px] px-5 rounded-xl font-semibold text-sm inline-flex items-center justify-center gap-2 transition-all ${
                    capacityFull
                      ? "bg-white/[0.06] text-white/40 cursor-not-allowed"
                      : "bg-[#2DA5A0] hover:bg-[#2DA5A0]/85 text-white shadow-lg shadow-[#2DA5A0]/25"
                  } disabled:opacity-70`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                      Joining…
                    </>
                  ) : capacityFull ? (
                    "Waitlist full"
                  ) : (
                    <>
                      Claim my spot
                      <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                    </>
                  )}
                </motion.button>
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 mt-3 text-xs text-red-300">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <p className="text-[10px] text-white/30 mt-4 leading-relaxed">
                By joining, you agree to receive launch updates. We never sell or share your email.
                One spot per email. Founder benefits redeem at first checkout after launch.
              </p>
            </form>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-12 text-center text-[10px] text-white/30">
          ViaConnect™ · FarmCeutica Wellness LLC ·{" "}
          <Link href="/" className="hover:text-white/50 transition-colors">Home</Link>
        </footer>
      </main>
    </div>
  );
}

// ── Success card ──────────────────────────────────────────────────────
function SuccessCard({
  position, capacity, alreadyJoined,
}: { position: number; capacity: number; alreadyJoined: boolean }) {
  return (
    <div className="rounded-2xl border border-[#2DA5A0]/30 bg-gradient-to-br from-[#2DA5A0]/12 via-[#1E3054] to-[#1A2744] p-6 md:p-7 text-center">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 250, damping: 18 }}
        className="w-16 h-16 mx-auto rounded-full bg-[#2DA5A0]/15 border border-[#2DA5A0]/40 flex items-center justify-center mb-4"
      >
        <Check className="w-8 h-8 text-[#2DA5A0]" strokeWidth={2} />
      </motion.div>

      <h3 className="text-xl md:text-2xl font-bold text-white mb-1">
        {alreadyJoined ? "You're already on the list" : "You're in."}
      </h3>
      <p className="text-sm text-white/60 mb-5">
        You're <span className="text-[#2DA5A0] font-semibold tabular-nums">#{position.toLocaleString()}</span>{" "}
        out of {capacity.toLocaleString()} founders.
      </p>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-4 text-left max-w-sm mx-auto">
        <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3">Your founder perks</p>
        <ul className="space-y-2 text-sm text-white/70">
          <PerkRow>25% off your first order</PerkRow>
          <PerkRow>6 months Platinum Wellness Portal — free</PerkRow>
          <PerkRow>1 year Platinum free with GeneX360</PerkRow>
          <PerkRow>20% off products bundled with GeneX360</PerkRow>
        </ul>
      </div>

      <p className="text-[10px] text-white/30 mt-5">
        We'll email you when launch is live so you can redeem your benefits.
      </p>
    </div>
  );
}

function PerkRow({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="w-3.5 h-3.5 text-[#2DA5A0] flex-shrink-0 mt-0.5" strokeWidth={2} />
      <span>{children}</span>
    </li>
  );
}

// ── Animated count-up number ──────────────────────────────────────────
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = display;
    const delta = value - start;
    if (delta === 0) return;
    const duration = Math.min(900, 250 + Math.abs(delta) * 8);
    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + delta * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{display.toLocaleString()}</>;
}
