"use client";

// VERBATIM PORT of docs/mockups/viaconnect-your-journey-coaching.jsx
// Allowed adaptations only: "use client", Lucide imports adapted, font injector
// useEffect removed (Instrument Sans loaded globally), TypeScript prop types added.
// Sample values, DOM structure, inline styles, class names, breakpoints: unchanged.
//
// Prompt 208i Task I-T2a: HERO values wired to real data. Markup/styles unchanged.
// Real data: useBioOptimizationTrend (gauges + graph), useHydrationToday (hydration
// gauge), useJourneyState (goal chip), getDisplayName + profiles.avatar_url (profile),
// stateWordForScore (narrative state word). No-history pillars: flat line at current
// value (honest "no trend known"). Per-pillar history backend gap flagged for Gary.
// Pillar colors: mockup hex retained (no canonical per-pillar source differs; flagged).

import { useState, useEffect } from "react";
import {
  Search, Bell, Edit2, Target, Activity, Moon, Salad, Heart, Sparkles, RefreshCw,
  Dna, FlaskConical, ClipboardList, Pill, HeartPulse, ArrowRight, ArrowUpRight,
  TrendingUp, TrendingDown, ChevronDown, ShieldCheck, CircleAlert, Droplet, Flame, Smile, Zap,
  type LucideIcon,
} from "lucide-react";
import { useBioOptimizationTrend } from "@/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/hooks/useBioOptimizationTrend";
import { useHydrationToday } from "@/components/hydration/useHydrationToday";
import { useJourneyState } from "@/hooks/journey/useJourneyState";
import { stateWordForScore } from "@/components/journey/coaching/NarrativeRead";
import { getDisplayName } from "@/lib/user/get-display-name";
import { createClient } from "@/lib/supabase/client";
import { withTimeout } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { heroGaugeScore, buildFlatSeries } from "@/components/journey/coaching/heroHelpers";

const C = {
  navy: "#1A2744", card: "#1E3054", inset: "#16203A", raised: "#243a63",
  teal: "#2DA5A0", orange: "#B75E18", blue: "#4F7FB5", green: "#46C18E", purple: "#7B6FB0",
  text: "#EAF1F8", muted: "#8DA0C0",
  line: "rgba(141,160,192,0.16)", tealSoft: "rgba(45,165,160,0.16)", orangeSoft: "rgba(183,94,24,0.18)", greenSoft: "rgba(70,193,142,0.16)",
};
const SW = 1.5;
const eyebrow: React.CSSProperties = { textTransform: "uppercase", letterSpacing: 1.3, fontSize: 10.5, fontWeight: 700, color: C.muted };

// Daily Scores pillars, order and colors carried identically on gauges and graph lines.
// NOTE for Gary: pillar colors below are the mockup hex values. The canonical dashboard
// Daily Scores coloring uses getScoreColor (score-VALUE-based), NOT a fixed per-pillar
// palette. There is no conflicting canonical per-pillar source, so the mockup hex stand.
// If a per-pillar canonical palette is established later, update this array.
const PILLARS: { key: string; label: string; value: number; delta: number; color: string; icon: LucideIcon; hero?: boolean }[] = [
  { key: "sleep", label: "Sleep Quality", value: 42, delta: -2, color: "#7B6FB0", icon: Moon },
  { key: "energy", label: "Energy Level", value: 58, delta: 3, color: "#D9A441", icon: Zap },
  { key: "mood", label: "Mood & Stress", value: 51, delta: 4, color: "#B75E18", icon: Smile },
  { key: "nutrition", label: "Nutrition", value: 72, delta: 5, color: "#46C18E", icon: Salad },
  { key: "activity", label: "Physical Activity", value: 60, delta: 3, color: "#4F7FB5", icon: Activity },
  { key: "overall", label: "Overall Wellness", value: 62, delta: 4, color: "#2DA5A0", icon: HeartPulse, hero: true },
  { key: "hydration", label: "Hydration", value: 64, delta: 6, color: "#38BDD8", icon: Droplet },
];

function panel(active: boolean): React.CSSProperties {
  return { position: "relative", background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16, boxShadow: active ? "0 14px 34px rgba(0,0,0,0.26)" : "0 10px 24px rgba(0,0,0,0.2)" };
}
function Edge({ active, color }: { active: boolean; color?: string }) {
  return <div aria-hidden style={{ position: "absolute", top: 0, left: 18, right: 18, height: 2, borderRadius: 2, background: `linear-gradient(90deg, transparent, ${color || (active ? C.teal : C.line)}, transparent)` }} className={active ? "vc-edge-active" : ""} />;
}
function bandLabel(v: number): string { return v >= 75 ? "Strong" : v >= 60 ? "Solid" : v >= 40 ? "Fair" : "Low"; }
function Delta({ v, unit }: { v: number; unit?: string }) { const up = v >= 0; return <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: up ? C.teal : C.orange }}>{up ? <TrendingUp size={11} strokeWidth={SW} /> : <TrendingDown size={11} strokeWidth={SW} />}{up ? "+" : ""}{v}{unit || ""}</span>; }

function PlasmaRing({ value, color, size = 40 }: { value: number; color: string; size?: number }) {
  const sw = Math.max(3, size * 0.085);
  const r = size / 2 - sw / 2 - 1, CIRC = 2 * Math.PI * r;
  const ang = (-90 + (value / 100) * 360) * Math.PI / 180;
  const capX = size / 2 + r * Math.cos(ang), capY = size / 2 + r * Math.sin(ang);
  return (
    <div style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.inset} strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - value / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ filter: `drop-shadow(0 0 4px ${color}cc)` }} />
        <circle cx={capX} cy={capY} r={Math.max(1.8, size * 0.06)} fill="#fff" style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
        <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fontSize={(size * 0.34).toFixed(1)} fontWeight="800" fill={C.text}>{value}</text>
      </svg>
    </div>
  );
}
function GaugeCard({ value, label, color, hero }: { value: number; label: string; color: string; hero?: boolean }) {
  return (
    <div style={{ flex: "1 1 0", minWidth: 64, background: C.inset, border: `1px solid ${hero ? color + "66" : C.line}`, borderRadius: 12, padding: "10px 6px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: hero ? `inset 0 0 0 1px ${color}33` : "none" }}>
      <PlasmaRing value={value} color={color} size={hero ? 52 : 48} />
      <span style={{ fontSize: 9, fontWeight: 600, color: C.text, textAlign: "center", lineHeight: 1.1 }}>{label}</span>
    </div>
  );
}

// Pillar value mapping: receive real values keyed by pillar key.
// overall -> useBioOptimizationTrend.current
// sleep -> categoryAverages.sleep
// energy -> categoryAverages.adherence (energy_score avg)
// mood -> categoryAverages.stress
// nutrition -> categoryAverages.nutrition
// activity -> categoryAverages.movement
// hydration -> useHydrationToday.percentage_of_target
type PillarValues = Record<string, number>;

// Graph range data type. Each key is a pillar key; value is an array of scores.
type RangeData = Record<string, number[]>;
// Three range slots for 1W / 1M / 1Y.
type AllRangeData = { "1W": RangeData; "1M": RangeData; "1Y": RangeData };

function DailyScores({ rangeData }: { rangeData: AllRangeData }) {
  const [range, setRange] = useState("1W");
  const d = rangeData[range as keyof AllRangeData], n = d.overall.length;
  const W = 840, H = 220, padL = 6, padR = 6, padT = 12, padB = 12;
  const x = (i: number) => padL + (i / (n - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - v / 100) * (H - padT - padB);
  const pathFor = (arr: number[]) => arr.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join(" ");
  const ordered = [...PILLARS].sort((a, b) => (a.hero ? 1 : 0) - (b.hero ? 1 : 0)); // hero drawn last, on top
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={eyebrow}>Daily Scores</div>
        <div style={{ display: "flex", gap: 6 }}>
          {["1W", "1M", "1Y"].map((r) => (
            <button key={r} onClick={() => setRange(r)} className="vc-focus" style={{ cursor: "pointer", padding: "5px 13px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, border: `1px solid ${range === r ? C.teal : C.line}`, background: range === r ? C.teal : "transparent", color: range === r ? C.navy : C.muted }}>{r}</button>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        {[0, 0.25, 0.5, 0.75, 1].map((g, i) => <line key={i} x1={padL} x2={W - padR} y1={padT + g * (H - padT - padB)} y2={padT + g * (H - padT - padB)} stroke={C.line} />)}
        {ordered.map((p) => <path key={p.key} d={pathFor(d[p.key])} fill="none" stroke={p.color} strokeWidth={p.hero ? 2.6 : 1.7} strokeLinecap="round" strokeLinejoin="round" style={p.hero ? { filter: `drop-shadow(0 0 4px ${p.color}99)` } : { opacity: 0.92 }} />)}
        {ordered.map((p) => <circle key={p.key + "d"} cx={x(n - 1)} cy={y(d[p.key][n - 1])} r={p.hero ? 3.2 : 2.3} fill={p.color} />)}
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "7px 14px", marginTop: 12 }}>
        {PILLARS.map((p) => <span key={p.key} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: C.muted }}><span style={{ width: 12, height: 3, borderRadius: 2, background: p.color, display: "inline-block" }} />{p.label}</span>)}
      </div>
    </div>
  );
}

// ProfileCard now accepts real data props. Markup/styles unchanged from verbatim port.
// Avatar: real photo from profiles.avatar_url when present; else initial tile (honest).
// Name: from getDisplayName(); Goal: from useJourneyState goalPhrase.
// Last sync line: "No wearable connected" (wearable connector is not active).
// Hannah note: state-appropriate, calm, name-aware copy. No fabricated numbers.
function ProfileCard({
  displayName,
  initial,
  avatarUrl,
  goalPhrase,
  stateWord,
}: {
  displayName: string;
  initial: string;
  avatarUrl: string | null;
  goalPhrase: string;
  stateWord: string;
}) {
  const [avatarErrored, setAvatarErrored] = useState(false);
  const showAvatar = !!avatarUrl && !avatarErrored;

  // Hannah note: state-appropriate and calm. One sentence, no em-dashes,
  // no medical claims, no fabricated numbers. Uses stateWord for tone.
  const hannahNote = (() => {
    if (!displayName || displayName === "there") {
      return "Welcome. As you log and connect your data, your read sharpens here.";
    }
    if (stateWord === "getting started") {
      return `Good to see you, ${displayName}. Your read below sharpens as you log and connect more data.`;
    }
    if (stateWord === "recovering") {
      return `${displayName}, this is a rebuilding stretch. Small, consistent steps restore momentum fastest.`;
    }
    if (stateWord === "steady") {
      return `${displayName}, you are holding a solid baseline. One focused area is usually the next lever.`;
    }
    if (stateWord === "building") {
      return `${displayName}, your trend is moving in the right direction. Consistency carries it higher.`;
    }
    return `${displayName}, your signals are clustering near your best. Keep the routine steady.`;
  })();

  return (
    <div style={{ background: C.inset, border: `1px solid ${C.line}`, borderRadius: 14, padding: 15, display: "flex", flexDirection: "column", gap: 13, height: "100%" }}>
      <div style={{ position: "relative", width: 92, height: 92 }}>
        {showAvatar ? (
          <img
            src={avatarUrl!}
            alt={displayName || "Profile"}
            onError={() => setAvatarErrored(true)}
            style={{ width: 92, height: 92, borderRadius: 16, objectFit: "cover", border: `1.5px solid ${C.teal}` }}
          />
        ) : (
          <div style={{ width: 92, height: 92, borderRadius: 16, background: `radial-gradient(circle at 35% 28%, #34618a, ${C.navy})`, border: `1.5px solid ${C.teal}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800 }}>{initial}</div>
        )}
        <span style={{ position: "absolute", right: -5, top: -5, width: 22, height: 22, borderRadius: 999, background: C.card, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}><Edit2 size={11} strokeWidth={SW} /></span>
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{displayName || "there"}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 9, fontSize: 11.5, color: C.muted }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><RefreshCw size={13} strokeWidth={SW} /> No wearable connected</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 10, background: C.card, border: `1px solid ${C.line}` }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: C.muted }}><Target size={14} strokeWidth={SW} color={C.teal} /> Goal</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.teal }}>{goalPhrase || "supporting your wellness"}</span>
      </div>
      <div>
        <div style={{ ...eyebrow, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}><Sparkles size={12} strokeWidth={SW} color={C.teal} /> Hannah's note</div>
        <p style={{ margin: 0, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{hannahNote}</p>
      </div>
    </div>
  );
}

// Hero receives real values for gauges, graph, narrative, and profile.
function Hero({
  pillarValues,
  rangeData,
  overallScore,
  displayName,
  initial,
  avatarUrl,
  goalPhrase,
}: {
  pillarValues: PillarValues;
  rangeData: AllRangeData;
  overallScore: number | null;
  displayName: string;
  initial: string;
  avatarUrl: string | null;
  goalPhrase: string;
}) {
  const stateWord = stateWordForScore(overallScore);

  // Narrative read: state-appropriate, one paragraph, honest to real score.
  const narrativeRead = (() => {
    if (stateWord === "getting started") {
      return "You are at the start of your read, and that is exactly where it should begin. As you log and connect data, this picture fills in.";
    }
    if (stateWord === "recovering") {
      return "This is a rebuilding stretch, which is a normal part of the cycle. Small, repeatable habits restore momentum fastest.";
    }
    if (stateWord === "steady") {
      return "You are holding a solid, level baseline. A single focused area is usually the next lever to nudge it up.";
    }
    if (stateWord === "building") {
      return "Your trend is moving in the right direction. Consistency over the next stretch is what carries it higher.";
    }
    return "Your signals are clustering near your best. Keep the routine steady and let the small wins compound.";
  })();

  // Build the real pillar values array from pillarValues map, matching PILLARS order.
  const livePillars = PILLARS.map((p) => ({
    ...p,
    value: heroGaugeScore(pillarValues[p.key] ?? 0),
  }));

  return (
    <div style={{ position: "relative", borderRadius: 22, padding: 20, marginBottom: 16, border: `1px solid ${C.line}`, background: `linear-gradient(160deg, #223a66 0%, ${C.card} 55%, #1b2c4e 100%)`, boxShadow: "0 24px 60px rgba(0,0,0,0.34)", overflow: "hidden" }}>
      <Edge active />
      <div className="vc-hero">
        <ProfileCard
          displayName={displayName}
          initial={initial}
          avatarUrl={avatarUrl}
          goalPhrase={goalPhrase}
          stateWord={stateWord}
        />
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="vc-herotop">
            <div style={{ flex: "1 1 280px" }}>
              <div style={eyebrow}>Your read today</div>
              <h1 style={{ margin: "8px 0 0", fontSize: 27, fontWeight: 800, letterSpacing: -0.6, lineHeight: 1.12 }}>You are in a <span style={{ color: C.teal }}>{stateWord}</span> state today</h1>
              <p style={{ margin: "10px 0 0", fontSize: 13, color: C.muted, lineHeight: 1.55, maxWidth: 460 }}>{narrativeRead}</p>
            </div>
            <div className="vc-gaugecluster">{livePillars.map((p) => <GaugeCard key={p.key} value={p.value} label={p.label} color={p.color} hero={p.hero} />)}</div>
          </div>
          <div style={{ background: `linear-gradient(180deg, ${C.inset}, ${C.card})`, border: `1px solid ${C.line}`, borderRadius: 16, padding: "16px 16px 14px" }}>
            <DailyScores rangeData={rangeData} />
          </div>
        </div>
      </div>
    </div>
  );
}

function HannahRead() {
  return (
    <div style={{ ...panel(true), height: "100%", display: "flex", flexDirection: "column" }}>
      <Edge active />
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
        <span style={{ width: 30, height: 30, borderRadius: 999, background: C.tealSoft, color: C.teal, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Sparkles size={15} strokeWidth={SW} /></span>
        <div><div style={{ ...eyebrow, color: C.teal }}>Hannah AI</div><div style={{ fontSize: 10.5, color: C.muted }}>Personalized read</div></div>
      </div>
      <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700 }}>Gary, here is this week's read.</h3>
      <p style={{ margin: 0, fontSize: 12.5, color: C.muted, lineHeight: 1.55 }}>You are building the first data points of your Bio Optimization journey. The next ten days of consistent check ins will unlock pattern detection.</p>
      <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: C.inset, border: `1px solid ${C.orangeSoft}` }}>
        <div style={{ ...eyebrow, color: C.orange, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}><Target size={12} strokeWidth={SW} /> Focus, sleep recovery</div>
        <p style={{ margin: 0, fontSize: 12.5, color: C.text, lineHeight: 1.5 }}>Hold a consistent sleep window tonight, paired with your evening Magnesium Glycinate.</p>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 12 }}>
        <span style={{ fontSize: 11.5, color: C.muted }}>Estimated lift</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: C.green }}><ArrowUpRight size={13} strokeWidth={2} /> +8 pts</span>
      </div>
      <button className="vc-focus" style={{ marginTop: 10, width: "100%", cursor: "pointer", background: "transparent", border: `1px solid ${C.teal}`, color: C.teal, borderRadius: 10, padding: "10px 12px", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between" }}>View Full Report with Hannah <ArrowRight size={15} strokeWidth={2} /></button>
    </div>
  );
}

function StatBar({ icon: Icon, name, value, sub, pct, color }: { icon: LucideIcon; name: string; value: string; sub: string; pct: number; color: string }) {
  return (
    <div style={{ flex: "1 1 150px", minWidth: 140 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}><Icon size={15} strokeWidth={SW} color={C.muted} /><span style={{ fontSize: 12, color: C.muted }}>{name}</span></div>
      <div style={{ fontSize: 15, fontWeight: 700 }}>{value} <span style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}>{sub}</span></div>
      <div style={{ height: 6, borderRadius: 6, background: C.inset, marginTop: 7, overflow: "hidden" }}><div style={{ height: "100%", width: pct + "%", background: color, borderRadius: 6 }} /></div>
    </div>
  );
}
function Sparkline({ data, color = C.teal, w = 92, h = 26 }: { data: number[]; color?: string; w?: number; h?: number }) {
  const max = Math.max(...data), min = Math.min(...data), span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - ((v - min) / span) * (h - 4) - 2]);
  return <svg width={w} height={h} style={{ display: "block" }}><path d={pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ")} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.2" fill={color} /></svg>;
}
const VITALS: [string, string, string, number[], string][] = [["HRV", "72 ms", "+6", [60, 64, 62, 68, 66, 70, 72], C.teal], ["Resting HR", "58 bpm", "+3", [62, 61, 60, 59, 60, 58, 58], C.teal], ["Respiratory", "14.2", "+1", [15, 14.8, 14.5, 14.6, 14.3, 14.2, 14.2], C.teal], ["Blood Oxygen", "97 %", "+1", [96, 96, 97, 96, 97, 97, 97], C.teal], ["Hydration", "1.6 L", "+0.2", [1.2, 1.4, 1.3, 1.5, 1.4, 1.6, 1.6], "#38BDD8"]];
function Donut({ segments, top, bot, size = 118 }: { segments: { value: number; color: string }[]; top: string; bot: string; size?: number }) {
  const strokeW = Math.max(9, Math.round(size * 0.11));
  const r = size / 2 - strokeW, CIRC = 2 * Math.PI * r; let off = 0; const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.inset} strokeWidth={strokeW} />
        {segments.map((s, i) => { const len = (s.value / total) * CIRC; const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={strokeW} strokeDasharray={`${len} ${CIRC - len}`} strokeDashoffset={-off} transform={`rotate(-90 ${size / 2} ${size / 2})`} />; off += len; return el; })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 6px" }}><div style={{ fontSize: Math.round(size * 0.15), fontWeight: 800, lineHeight: 1, whiteSpace: "nowrap" }}>{top}</div><div style={{ fontSize: Math.round(size * 0.08), color: C.muted, lineHeight: 1, marginTop: 2, whiteSpace: "nowrap" }}>{bot}</div></div>
    </div>
  );
}
function Legend({ items }: { items: { name: string; label: string; color: string }[] }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{items.map((it, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: it.color }} /><span style={{ color: C.muted, flex: 1 }}>{it.name}</span><span style={{ color: C.text, fontWeight: 600 }}>{it.label}</span></div>)}</div>;
}

type AccDot = { hub: string; label: string; icon: LucideIcon; missing?: boolean };
type AccItem = { headline: string; body: string; tag: string; pts: number; icon: LucideIcon; conf: string; dots: AccDot[] };

const ACCEL: AccItem[] = [
  { headline: "Activate Foundation Stack", body: "Magnesium Glycinate plus Vitamin D3/K2 to restore the baseline your score needs.", tag: "SUPPLEMENT", pts: 10, icon: Pill, conf: "high", dots: [{ hub: "My Genetics", label: "MTHFR C677T variant", icon: Dna }, { hub: "Lab Results", label: "Homocysteine trending up", icon: FlaskConical }, { hub: "Assessment", label: "Fatigue you reported", icon: ClipboardList }] },
  { headline: "Anchor Your Sleep Window", body: "Hold a 30 minute sleep/wake window for 7 days. Biggest single lift for Overall Wellness.", tag: "SLEEP", pts: 8, icon: Moon, conf: "high", dots: [{ hub: "Connected", label: "Sleep slipping this week", icon: Moon }, { hub: "My Biology", label: "Recovery below target", icon: HeartPulse }] },
  { headline: "Add Omega 3 Elite", body: "Bioavailable EPA/DHA at 10 to 28 times absorption, paired with breakfast.", tag: "SUPPLEMENT", pts: 6, icon: Pill, conf: "medium", dots: [{ hub: "Assessment", label: "Inflammation markers in CAQ", icon: ClipboardList }, { hub: "Lab Results", label: "Omega panel not on file yet", icon: FlaskConical, missing: true }] },
  { headline: "Zone 2 Movement Block", body: "Three 25 minute easy sessions this week, mitochondrial density payoff shows in 14 days.", tag: "MOVEMENT", pts: 5, icon: Activity, conf: "medium", dots: [{ hub: "My Biology", label: "Recovery supports easy load", icon: HeartPulse }, { hub: "Goal", label: "Build lean mass", icon: Target }] },
];
function AccCard({ c }: { c: AccItem }) {
  const [open, setOpen] = useState(false);
  const Ic = c.icon, col = c.conf === "high" ? C.teal : C.orange, Conf = c.conf === "high" ? ShieldCheck : CircleAlert;
  return (
    <div style={panel(false)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ width: 38, height: 38, borderRadius: 999, background: C.inset, border: `1px solid ${C.orange}`, color: C.orange, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Ic size={17} strokeWidth={SW} /></span>
        <span style={{ padding: "4px 9px", borderRadius: 999, background: C.greenSoft, color: C.green, fontSize: 11.5, fontWeight: 700 }}>+{c.pts} pts</span>
      </div>
      <h3 style={{ margin: "12px 0 6px", fontSize: 16, fontWeight: 700 }}>{c.headline}</h3>
      <p style={{ margin: 0, fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>{c.body}</p>
      <div style={{ ...eyebrow, marginTop: 12, fontSize: 10 }}>{c.tag}</div>
      <button onClick={() => setOpen(!open)} className="vc-focus" style={{ marginTop: 10, cursor: "pointer", width: "100%", background: "transparent", border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 10px", display: "flex", alignItems: "center", gap: 7, color: col, fontSize: 11.5, fontWeight: 600 }}><Conf size={13} strokeWidth={SW} /> Why this, why you<ChevronDown size={14} strokeWidth={SW} style={{ marginLeft: "auto", transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms" }} /></button>
      {open && <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 9 }}>{c.dots.map((dt, i) => { const Di = dt.icon, dc = dt.missing ? C.orange : C.teal; return <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 9, background: C.inset, border: `1px solid ${dt.missing ? C.orangeSoft : C.line}` }}><span style={{ width: 24, height: 24, borderRadius: 7, background: dt.missing ? C.orangeSoft : C.tealSoft, color: dc, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Di size={13} strokeWidth={SW} /></span><span style={{ flex: 1 }}><span style={{ display: "block", fontSize: 12, fontWeight: 600 }}>{dt.label}</span><span style={{ display: "block", fontSize: 10, color: C.muted }}>{dt.hub}</span></span></div>; })}</div>}
    </div>
  );
}
const HUBS: [string, LucideIcon][] = [["CAQ", ClipboardList], ["Genetics", Dna], ["Labs", FlaskConical], ["Biology", HeartPulse], ["Nutrition", Salad], ["Supplements", Pill]];
function ConnectionMap() {
  const active = new Set(["Genetics", "Labs", "CAQ"]);
  const size = 300, cx = size / 2, cy = size / 2, r = 102;
  const nodes = HUBS.map(([key], i) => { const a = (-90 + i * 60) * Math.PI / 180; return { key, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }; });
  const litNodes = nodes.filter((n) => active.has(n.key));
  return (
    <div style={{ ...panel(false), flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>The Foundation Stack insight is drawn from three of your hubs.</p>
      <div style={{ flex: 1, position: "relative", minHeight: 0, marginTop: 8 }}>
      <svg viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="xMidYMid meet" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}>
        {nodes.map((n) => <line key={n.key} x1={cx} y1={cy} x2={n.x} y2={n.y} stroke={active.has(n.key) ? C.teal : C.line} strokeWidth={active.has(n.key) ? 2 : 1} style={{ opacity: active.has(n.key) ? 0.9 : 0.5 }} />)}
        {litNodes.map((a, i) => litNodes.slice(i + 1).map((b, j) => <line key={`${i}${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.teal} strokeWidth="1.4" style={{ opacity: 0.5 }} />))}
        <circle cx={cx} cy={cy} r={23} fill={C.tealSoft} stroke={C.teal} strokeWidth="1.5" /><text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={C.text}>You</text>
        {nodes.map((n) => <g key={n.key}><circle cx={n.x} cy={n.y} r={20} fill={active.has(n.key) ? C.tealSoft : C.inset} stroke={active.has(n.key) ? C.teal : C.line} strokeWidth={active.has(n.key) ? 2 : 1.5} /><text x={n.x} y={n.y + 32} textAnchor="middle" fontSize="9.5" fill={active.has(n.key) ? C.text : C.muted} fontWeight={active.has(n.key) ? 600 : 500}>{n.key}</text></g>)}
      </svg>
      </div>
    </div>
  );
}

function TodayTab() {
  return (
    <div className="vc-split" style={{ alignItems: "stretch" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={panel(false)}>
          <div style={{ ...eyebrow, marginBottom: 12 }}>Today</div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <StatBar icon={Activity} name="Steps" value="7,842" sub="/ 10,000" pct={78} color={C.teal} />
            <StatBar icon={Heart} name="Active Calories" value="612" sub="/ 800 kcal" pct={76} color={C.teal} />
            <StatBar icon={Activity} name="Exercise" value="42" sub="/ 60 min" pct={70} color={C.teal} />
            <StatBar icon={Moon} name="Sleep" value="7h 12m" sub="/ 8h" pct={90} color={C.blue} />
            <StatBar icon={Droplet} name="Hydration" value="1.6" sub="/ 2.5 L" pct={64} color="#38BDD8" />
          </div>
        </div>
        <div style={panel(false)}>
          <div style={{ ...eyebrow, marginBottom: 10 }}>Vital trends</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>{VITALS.map(([n, val, d, data, col]) => <div key={n} style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ flex: 1, fontSize: 12, color: C.muted }}>{n}</span><span style={{ fontSize: 12, fontWeight: 600, width: 54, textAlign: "right" }}>{val}</span><span style={{ fontSize: 11, color: C.teal, width: 28 }}>{d}</span><Sparkline data={data} color={col} /></div>)}</div>
        </div>
      </div>
      <HannahRead />
    </div>
  );
}
function GoalCard() {
  return (
    <div style={panel(true)}>
      <Edge active />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
        <div><h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Build lean mass</h2><p style={{ margin: "6px 0 0", fontSize: 12, color: C.muted, maxWidth: 340 }}>You are moving in the right direction. Lean mass is climbing and body fat is easing down. Keep the trend, no rush.</p></div>
        <div style={{ textAlign: "right" }}><div style={{ fontSize: 26, fontWeight: 800, color: C.teal }}>68%</div><div style={{ fontSize: 11, color: C.muted }}>to your target</div></div>
      </div>
      <div style={{ height: 8, borderRadius: 8, background: C.inset, marginTop: 14, overflow: "hidden" }}><div style={{ height: "100%", width: "68%", background: `linear-gradient(90deg, ${C.teal}, #3fd0c8)`, borderRadius: 8 }} /></div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: C.muted }}><span>Baseline 142 lb</span><span>Now 148 lb</span><span>Target 152 lb</span></div>
    </div>
  );
}
function BodyCompTrio() {
  return (
    <div className="vc-tri">
      <div style={panel(false)}><div style={{ ...eyebrow, marginBottom: 10 }}>Lean mass</div><div style={{ fontSize: 22, fontWeight: 800 }}>148 lb <span style={{ fontSize: 12 }}><Delta v={1.2} unit=" lb" /></span></div><div style={{ marginTop: 10 }}><Sparkline data={[142, 143, 144, 145, 146, 147, 148]} w={180} h={36} /></div></div>
      <div style={panel(false)}><div style={{ ...eyebrow, marginBottom: 10 }}>Body fat</div><div style={{ fontSize: 22, fontWeight: 800 }}>18.4 % <span style={{ fontSize: 12 }}><Delta v={-0.6} unit=" pt" /></span></div><div style={{ marginTop: 10 }}><Sparkline data={[20.2, 19.8, 19.5, 19.1, 18.9, 18.6, 18.4]} w={180} h={36} color={C.orange} /></div></div>
      <div style={panel(false)}><div style={{ ...eyebrow, marginBottom: 12 }}>Energy balance</div><div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>{([["Intake", Salad], ["Activity", Activity], ["Body", HeartPulse]] as [string, LucideIcon][]).map(([n, Ic]) => <div key={n} style={{ textAlign: "center" }}><span style={{ width: 38, height: 38, borderRadius: 999, background: C.tealSoft, color: C.teal, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Ic size={17} strokeWidth={SW} /></span><div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>{n}</div></div>)}</div><div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: C.teal, fontWeight: 600 }}>Surplus supports the trend</div></div>
    </div>
  );
}
function NutritionCard() {
  return (
    <div style={panel(false)}><div style={{ ...eyebrow, marginBottom: 10 }}>Nutrition</div><div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}><Donut size={86} segments={[{ value: 170, color: C.green }, { value: 92, color: C.orange }, { value: 48, color: C.blue }]} top="1,642" bot="kcal left" /><Legend items={[{ name: "Carbs", label: "170 / 240g", color: C.green }, { name: "Protein", label: "92 / 120g", color: C.orange }, { name: "Fat", label: "48 / 70g", color: C.blue }]} /></div></div>
  );
}
function SleepCard() {
  return (
    <div style={panel(false)}><div style={{ ...eyebrow, marginBottom: 10 }}>Sleep breakdown</div><div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}><Donut size={86} segments={[{ value: 108, color: C.teal }, { value: 260, color: C.blue }, { value: 60, color: C.purple }, { value: 20, color: C.orange }]} top="7h 12m" bot="total" /><Legend items={[{ name: "Deep", label: "1h 48m", color: C.teal }, { name: "Light", label: "4h 20m", color: C.blue }, { name: "REM", label: "1h 00m", color: C.purple }, { name: "Awake", label: "0h 20m", color: C.orange }]} /></div></div>
  );
}
function AcceleratorsTab() {
  return (
    <div className="vc-split" style={{ alignItems: "stretch" }}>
      <div><div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Journey accelerators</div><div className="vc-two">{ACCEL.map((c, i) => <AccCard key={i} c={c} />)}</div></div>
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}><div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Your connection map</div><ConnectionMap /></div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Real-data graph builder
//
// REALITY: only the OVERALL composite has a real time-series (dailyScores/bioScores
// from useBioOptimizationTrend). The 6 component pillar lines have NO history source
// (known backend gap - flagged for Gary). They are represented as FLAT lines at the
// pillar's current value: honest "no trend known" rather than a fabricated trend.
//
// overall line: real history array of scores. If fewer than 2 points, flattened at
//   the current overall value (honest baseline).
// pillar lines (sleep/energy/mood/nutrition/activity/hydration): flat array of the
//   pillar's current gauge value repeated across the point count.
//
// The point count matches the data.dailyScores length for the range. If empty,
// defaults to 7 points so the graph is never empty (all zeros is honest baseline).
// ---------------------------------------------------------------------------

function buildRangeData(
  overallPoints: { score: number }[],
  pillarValues: PillarValues,
): RangeData {
  // Determine point count from the real series (minimum 2 for a valid line).
  const n = Math.max(2, overallPoints.length);

  // Overall line: real scores when >= 2 finite points; flat at current otherwise.
  const overallScores = overallPoints
    .map((p) => p.score)
    .filter((s) => typeof s === "number" && isFinite(s));
  const overallArr: number[] =
    overallScores.length >= 2
      ? overallScores
      : buildFlatSeries(heroGaugeScore(pillarValues["overall"] ?? 0), n);

  // Pillar lines: flat at the current gauge value (no history, honest representation).
  const sleepArr = buildFlatSeries(heroGaugeScore(pillarValues["sleep"] ?? 0), n);
  const energyArr = buildFlatSeries(heroGaugeScore(pillarValues["energy"] ?? 0), n);
  const moodArr = buildFlatSeries(heroGaugeScore(pillarValues["mood"] ?? 0), n);
  const nutritionArr = buildFlatSeries(heroGaugeScore(pillarValues["nutrition"] ?? 0), n);
  const activityArr = buildFlatSeries(heroGaugeScore(pillarValues["activity"] ?? 0), n);
  const hydrationArr = buildFlatSeries(heroGaugeScore(pillarValues["hydration"] ?? 0), n);

  return {
    sleep: sleepArr,
    energy: energyArr,
    mood: moodArr,
    nutrition: nutritionArr,
    activity: activityArr,
    overall: overallArr,
    hydration: hydrationArr,
  };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function YourJourneyCoaching({ userId: _userId }: { userId: string | null }) {
  const userId = _userId;

  // Real data hooks (fail-open: all return safe defaults on error/loading).
  const { data: bos7D } = useBioOptimizationTrend(userId, "7D");
  const { data: bos4W } = useBioOptimizationTrend(userId, "4W");
  const { data: bos1Y } = useBioOptimizationTrend(userId, "1Y");
  const { data: hydrationData } = useHydrationToday();
  const { state: journeyState } = useJourneyState(userId);

  // Display name: resolved async via getDisplayName (mirrors ProfileCard.tsx approach).
  const [displayName, setDisplayName] = useState<string>("");
  useEffect(() => {
    let active = true;
    getDisplayName()
      .then((n) => { if (active) setDisplayName(n); })
      .catch(() => { /* keep empty; renders as "there" */ });
    return () => { active = false; };
  }, [userId]);

  // Avatar URL: best-effort direct Supabase read wrapped in withTimeout + try/catch.
  // Fails open to null (initial tile). Mirrors ProfileCard.tsx resilience pattern.
  // The Supabase query builder chain is cast to a typed Promise to avoid `any`.
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setAvatarUrl(null);
    if (!userId) return;
    (async () => {
      try {
        const supabase = createClient();
        type ProfileRow = { avatar_url: string | null };
        type AvatarQueryResult = { data: ProfileRow | null; error: unknown };
        // The Supabase client's from().select().eq().maybeSingle() chain returns a
        // PromiseLike that is not yet typed in the generated types. We cast it to the
        // known result shape. This is the established pattern across 208g/h/ProfileCard.
        const queryResult = supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", userId)
          .maybeSingle();
        const { data } = await withTimeout(
          queryResult as unknown as Promise<AvatarQueryResult>,
          4000,
          "YourJourneyCoaching.avatar",
        );
        const url = (data?.avatar_url as string | null) ?? null;
        if (active) setAvatarUrl(url && url.trim().length > 0 ? url : null);
      } catch (err) {
        safeLog.warn("YourJourneyCoaching", "avatar read failed, failing open", { error: err });
      }
    })();
    return () => { active = false; };
  }, [userId]);

  // Derive pillar values from hook data (fail-open: missing data -> 0).
  const averages = bos7D?.categoryAverages ?? null;
  const overallCurrent = bos7D?.current ?? 0;
  const hydrationPct = hydrationData?.percentage_of_target ?? null;

  const pillarValues: PillarValues = {
    sleep: averages?.sleep ?? 0,
    energy: averages?.adherence ?? 0,    // adherence = energy_score avg
    mood: averages?.stress ?? 0,
    nutrition: averages?.nutrition ?? 0,
    activity: averages?.movement ?? 0,
    overall: overallCurrent,
    hydration: hydrationPct ?? 0,
  };

  // Build range data for 1W / 1M / 1Y graph tabs.
  // Overall composite: real history for each range window.
  // Pillar lines: flat at current value (no per-pillar history; backend gap flagged).
  const rangeData: AllRangeData = {
    "1W": buildRangeData(bos7D?.dailyScores ?? bos7D?.bioScores ?? [], pillarValues),
    "1M": buildRangeData(bos4W?.dailyScores ?? bos4W?.bioScores ?? [], pillarValues),
    "1Y": buildRangeData(bos1Y?.dailyScores ?? bos1Y?.bioScores ?? [], pillarValues),
  };

  // Profile card data.
  const displayNameSafe = displayName && displayName.trim().length > 0 ? displayName : "there";
  const initial = displayNameSafe.charAt(0).toUpperCase() || "V";
  const goalPhrase = journeyState.goalPhrase || "supporting your wellness";

  // Overall score for narrative (null when no data = getting started state).
  const overallScore: number | null =
    overallCurrent > 0 ? overallCurrent : null;

  return (
    <div style={{ fontFamily: "'Instrument Sans', system-ui, sans-serif", background: `radial-gradient(1200px 600px at 70% -12%, #21345c 0%, ${C.navy} 58%)`, minHeight: "100vh", color: C.text, padding: "18px 28px 46px" }}>
      <style>{`
        .vc-focus:focus-visible { outline: 2px solid ${C.teal}; outline-offset: 2px; }
        .vc-edge-active { animation: vcPulse 2.8s ease-in-out infinite; }
        @keyframes vcPulse { 0%,100%{opacity:.55} 50%{opacity:1} }
        .vc-hero { display: grid; grid-template-columns: 220px 1fr; gap: 18px; align-items: stretch; }
        .vc-herotop { display: flex; gap: 18px; align-items: flex-start; flex-wrap: wrap; }
        .vc-gaugecluster { flex: 1.7 1 340px; display: flex; gap: 8px; align-items: stretch; }
        .vc-split { display: grid; grid-template-columns: 1fr 360px; gap: 14px; align-items: start; }
        .vc-two { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .vc-tri { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .vc-goalrow { display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 14px; align-items: stretch; }
        @media (max-width: 1100px){ .vc-split { grid-template-columns: 1fr; } }
        @media (max-width: 960px){ .vc-hero { grid-template-columns: 1fr; } .vc-tri { grid-template-columns: 1fr; } .vc-two { grid-template-columns: 1fr; } .vc-goalrow { grid-template-columns: 1fr; } }
        @media (prefers-reduced-motion: reduce){ .vc-edge-active{animation:none;opacity:1} * {transition:none !important} }
      `}</style>
      <div style={{ width: "100%", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}><span style={{ color: C.orange }}>Via</span><span style={{ color: C.text }}>Connect</span><span style={{ ...eyebrow, marginLeft: 12 }}>Your Journey</span></div>
          <div style={{ display: "flex", gap: 12, color: C.muted }}><Search size={18} strokeWidth={SW} /><Bell size={18} strokeWidth={SW} /></div>
        </div>

        <Hero
          pillarValues={pillarValues}
          rangeData={rangeData}
          overallScore={overallScore}
          displayName={displayNameSafe}
          initial={initial}
          avatarUrl={avatarUrl}
          goalPhrase={goalPhrase}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <section>
            <div style={{ ...eyebrow, marginBottom: 12 }}>Goals, nutrition and sleep</div>
            <div className="vc-goalrow"><GoalCard /><NutritionCard /><SleepCard /></div>
            <div style={{ marginTop: 14 }}><BodyCompTrio /></div>
          </section>
          <section>
            <div style={{ ...eyebrow, marginBottom: 12 }}>Today and this week</div>
            <TodayTab />
          </section>
          <section>
            <AcceleratorsTab />
          </section>
        </div>

        <p style={{ fontSize: 11, color: C.muted, marginTop: 18, lineHeight: 1.5 }}>For education and structure-function support only, not a diagnosis or treatment. Avatar and figures are placeholders. The user's real photo would sit in the profile card. Pillar colors shown here would map to your canonical dashboard Daily Scores colors.</p>
      </div>
    </div>
  );
}
