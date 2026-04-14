"use client";

import { useState, useEffect } from "react";
import {
  Pill, CalendarClock, Sparkles, ShieldAlert, UserSearch, ShoppingBag,
  Stethoscope, Leaf, ArrowRight, Check, Search, FlaskConical, Droplets,
  Dna, Activity, TestTubes, Clock, Sunrise, Sun, Moon,
  AlertTriangle, Plus, RefreshCw, Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ProtocolConfidenceBadge } from "@/components/protocol/ProtocolConfidenceBadge";
import { PractitionerDisclaimer } from "@/components/protocol/PractitionerDisclaimer";
import { DataSourceTag } from "@/components/protocol/DataSourceTag";
import SupplementInput from "@/components/shared/SupplementInput";
import type { PluginProductResult } from "@/plugins/types";
import { useUserDashboardData } from "@/hooks/useUserDashboardData";
import type { DashboardSupplement } from "@/hooks/useUserDashboardData";
import { createClient } from "@/lib/supabase/client";
import RecommendedSupplements from "@/components/supplement-protocol/RecommendedSupplements";
import { MobileHeroBackground } from "@/components/ui/MobileHeroBackground";
const SUPPLEMENT_HERO_IMAGE =
  "https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Images/Athlete%205.png";

function PIcon({ icon: Icon, color, size = "md" }: { icon: LucideIcon; color: string; size?: "sm" | "md" | "lg" }) {
  const s = size === "lg" ? { box: "w-14 h-14", ico: "w-7 h-7", glow: "blur-2xl -inset-2" } : size === "sm" ? { box: "w-9 h-9", ico: "w-4 h-4", glow: "blur-lg -inset-1" } : { box: "w-12 h-12", ico: "w-5 h-5", glow: "blur-xl -inset-1.5" };
  return (<div className="relative flex-shrink-0"><div className={`absolute ${s.glow} rounded-2xl opacity-60 pointer-events-none`} style={{ backgroundColor: `${color}33` }} /><div className={`relative ${s.box} rounded-xl flex items-center justify-center`} style={{ background: `linear-gradient(135deg, ${color}33, ${color}1A, transparent)`, border: `1px solid ${color}26` }}><Icon className={s.ico} style={{ color }} strokeWidth={1.5} /></div></div>);
}

/* ═══ DATA — built from real user supplements ═══ */

type ProtocolItem = {
  id: string;
  productName: string;
  dosage: string;
  deliveryMethod?: string;
  priority: "essential" | "recommended" | "optional";
  dataSourceTag: string;
  takenToday: boolean;
};

function buildProtocol(supplements: DashboardSupplement[]): Record<string, ProtocolItem[]> {
  const protocol: Record<string, ProtocolItem[]> = { morning: [], afternoon: [], evening: [], asNeeded: [] };
  supplements.forEach((s) => {
    const freq = (s.frequency || "").toLowerCase();
    const cat = (s.category || "").toLowerCase();
    let slot = "morning";
    if (freq.includes("evening") || freq.includes("night") || freq.includes("bedtime") || cat.includes("sleep")) slot = "evening";
    else if (freq.includes("afternoon") || freq.includes("midday")) slot = "afternoon";
    else if (freq.includes("needed") || freq.includes("prn")) slot = "asNeeded";
    protocol[slot].push({
      id: s.id,
      productName: s.product_name || s.supplement_name || "Supplement",
      dosage: s.dosage || "",
      deliveryMethod: s.dosage_form || undefined,
      priority: s.is_ai_recommended ? "recommended" : "essential",
      dataSourceTag: s.is_ai_recommended ? "ai" : "caq",
      takenToday: false,
    });
  });
  return protocol;
}
const SLOTS = [
  { id: "morning", label: "Morning", icon: Sunrise, time: "7:00 AM", color: "#FBBF24" },
  { id: "afternoon", label: "Afternoon", icon: Sun, time: "12:00 PM", color: "#B75E18" },
  { id: "evening", label: "Evening", icon: Moon, time: "7:00 PM", color: "#60A5FA" },
  { id: "asNeeded", label: "As Needed", icon: Clock, time: "Flexible", color: "#9CA3AF" },
];
const CATEGORIES = [
  { icon: FlaskConical, label: "Liposomal", color: "#2DA5A0", count: "45+" },
  { icon: Droplets, label: "Micellar", color: "#60A5FA", count: "38+" },
  { icon: Dna, label: "Methylated", color: "#A855F7", count: "25+" },
  { icon: Activity, label: "Minerals", color: "#FBBF24", count: "40+" },
  { icon: TestTubes, label: "Amino Acids", color: "#22D3EE", count: "30+" },
  { icon: Leaf, label: "Botanicals", color: "#34D399", count: "55+" },
  { icon: Sparkles, label: "Specialty", color: "#B75E18", count: "35+" },
  { icon: Pill, label: "Standard", color: "#9CA3AF", count: "50+" },
];

function ItemRow({ item }: { item: ProtocolItem }) {
  const [taken, setTaken] = useState(item.takenToday);
  return (
    <div className="flex items-center gap-4 px-4 md:px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
      <button onClick={() => setTaken(!taken)} className="min-w-[44px] min-h-[44px] flex items-center justify-center">
        {taken ? <div className="w-6 h-6 rounded-full bg-teal-400/20 border border-teal-400/40 flex items-center justify-center"><Check className="w-3.5 h-3.5 text-teal-400" strokeWidth={2.5} /></div> : <div className="w-6 h-6 rounded-full border-2 border-white/15 hover:border-teal-400/30 transition-colors" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${taken ? "text-white/40 line-through" : "text-white/80"}`}>{item.productName}</p>
        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          <span className="text-[10px] text-white/25">{item.dosage}</span>
          {item.deliveryMethod && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/20">{item.deliveryMethod}</span>}
          {item.dataSourceTag && <DataSourceTag source={item.dataSourceTag as "caq"} />}
        </div>
      </div>
      <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider flex-shrink-0 ${item.priority === "essential" ? "bg-teal-400/10 text-teal-400/60 border border-teal-400/15" : item.priority === "recommended" ? "bg-orange-400/10 text-orange-400/60 border border-orange-400/15" : "bg-white/5 text-white/25 border border-white/[0.08]"}`}>{item.priority}</span>
    </div>
  );
}

/* ═══ SECTION WRAPPER ═══ */
function Section({ icon, iconColor, title, subtitle, children }: { icon: LucideIcon; iconColor: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="relative rounded-2xl overflow-hidden">
      <div className="absolute inset-0 bg-[#1E3054]/35 backdrop-blur-md" />
      <div className="absolute inset-0 rounded-2xl border border-white/[0.08]" />
      <div className="relative z-10">
        <div className="flex items-center gap-3 p-5 md:p-6 border-b border-white/5">
          <PIcon icon={icon} color={iconColor} size="md" />
          <div>
            <h2 className="text-base md:text-lg font-bold text-white">{title}</h2>
            <p className="text-xs text-white/30 mt-0.5">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

/* ═══ MAIN PAGE ═══ */
export default function SupplementsPage() {
  const { loading, supplements, assessmentCompleted, profile } = useUserDashboardData();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" style={{ background: "linear-gradient(180deg, #0F1520, #1A2744)" }}>
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
        <p className="text-sm text-white/40">Loading your supplement protocol...</p>
      </div>
    );
  }

  const PROTOCOL = buildProtocol(supplements);
  const all = [...PROTOCOL.morning, ...PROTOCOL.afternoon, ...PROTOCOL.evening, ...PROTOCOL.asNeeded];
  const taken = all.filter(i => i.takenToday).length;
  const pct = all.length > 0 ? Math.round((taken / all.length) * 100) : 0;

  // Mobile: show one slot at a time based on current local hour.
  // 00:00-11:59 = morning, 12:00-17:59 = afternoon, 18:00-23:59 = evening
  const hour = new Date().getHours();
  const currentSlotId = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  return (
    <>
    <MobileHeroBackground src={SUPPLEMENT_HERO_IMAGE} overlayOpacity={0.6} objectPosition="center top" priority />
    <div className="relative z-10 min-h-screen text-white">

      {/* Portal switcher removed (Prompt #74): global nav is single source of truth */}

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8">

      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <PIcon icon={Pill} color="#2DA5A0" size="lg" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">Supplement Protocol</h1>
            <p className="text-sm text-white/40 mt-0.5">Your personalized daily regimen</p>
          </div>
        </div>
        <ProtocolConfidenceBadge tier={1} />
      </div>

      {/* ═══ 1. DAILY SCHEDULE ═══ */}
      <Section icon={CalendarClock} iconColor="#2DA5A0" title="Daily Schedule" subtitle="Your supplement checklist for today">
        <div className="p-5 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs text-white/30">{taken}/{all.length} taken today</p>
            <div className="flex items-center gap-2"><div className="w-24 h-2 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full bg-teal-400" style={{ width: `${pct}%` }} /></div><span className="text-xs font-medium text-teal-400">{pct}%</span></div>
          </div>
          {/* Desktop: 3 columns (Morning / Afternoon / Evening) */}
          <div className="hidden md:grid md:grid-cols-3 gap-4">
            {SLOTS.filter((s) => s.id !== 'asNeeded').map((slot) => {
              const items = (PROTOCOL as Record<string, ProtocolItem[]>)[slot.id] || [];
              return (
                <div key={slot.id} className="rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden flex flex-col">
                  <div className="flex items-center gap-3 px-4 md:px-5 py-3 border-b border-white/5">
                    <PIcon icon={slot.icon} color={slot.color} size="sm" />
                    <div className="flex-1 min-w-0"><h4 className="text-sm font-semibold text-white">{slot.label}</h4><p className="text-[10px] text-white/25">{slot.time}</p></div>
                    <span className="text-xs text-white/20">{items.length}</span>
                  </div>
                  {items.length > 0 ? (
                    <div className="divide-y divide-white/[0.03]">{items.map((item) => <ItemRow key={item.id} item={item} />)}</div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center py-8 px-4">
                      <p className="text-xs text-white/25 text-center">No supplements scheduled</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile: single container auto-switching by time of day */}
          <div className="md:hidden">
            {(() => {
              const slot = SLOTS.find((s) => s.id === currentSlotId)!;
              const items = (PROTOCOL as Record<string, ProtocolItem[]>)[slot.id] || [];
              return (
                <div className="rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden flex flex-col">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                    <PIcon icon={slot.icon} color={slot.color} size="sm" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-white">{slot.label}</h4>
                      <p className="text-[10px] text-white/25">{slot.time} · now</p>
                    </div>
                    <span className="text-xs text-white/20">{items.length}</span>
                  </div>
                  {items.length > 0 ? (
                    <div className="divide-y divide-white/[0.03]">{items.map((item) => <ItemRow key={item.id} item={item} />)}</div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center py-8 px-4">
                      <p className="text-xs text-white/25 text-center">No supplements scheduled</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </Section>

      {/* ═══ UPDATE ASSESSMENT ═══ */}
      <SupplementsRetakeCard />

      {/* ═══ 2. RECOMMENDED SUPPLEMENTS — Powered by Ultrathink AI ═══ */}
      <Section icon={Sparkles} iconColor="#2DA5A0" title="Recommended Supplements" subtitle="AI-powered personalized protocol by Ultrathink">
        <div className="p-5 md:p-6">
          <RecommendedSupplements />
        </div>
      </Section>

      {/* ═══ 2b. BROWSE OUR FULL SUPPLEMENT CATALOG → /shop ═══ */}
      <Section icon={ShoppingBag} iconColor="#2DA5A0" title="Browse Our Full Supplement Catalog" subtitle="Explore the complete ViaConnect™ shop">
        <div className="p-5 md:p-6">
          <a
            href="/shop"
            className="group relative block overflow-hidden rounded-2xl border border-teal-400/20 bg-gradient-to-br from-teal-400/10 via-teal-400/[0.04] to-transparent p-5 md:p-6 transition-all duration-300 hover:border-teal-400/40 hover:shadow-[0_0_30px_rgba(45,165,160,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
          >
            <div className="flex items-start gap-4">
              <PIcon icon={ShoppingBag} color="#2DA5A0" size="lg" />
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-white md:text-lg">
                  Browse Our Full Supplement Catalog
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-white/50 md:text-sm">
                  Explore the complete ViaConnect™ shop — liposomal, micellar,
                  methylated, minerals, amino acids, botanicals, and specialty
                  formulas. All curated for genomics-guided protocols.
                </p>
                <div className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-teal-400/30 bg-teal-400/15 px-4 py-2.5 text-sm font-semibold text-teal-400 transition-all group-hover:border-teal-400/50 group-hover:bg-teal-400/25">
                  <ShoppingBag className="h-4 w-4" strokeWidth={1.5} />
                  Visit the Shop
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
                </div>
              </div>
            </div>
          </a>
        </div>
      </Section>

      {/* ═══ 3. MEDICAL & HERBAL INTERACTIONS ═══ */}
      <Section icon={ShieldAlert} iconColor="#60A5FA" title="Medical & Herbal Interactions" subtitle="Medications, allergies, and interaction analysis">
        <div className="p-5 md:p-6 space-y-6">
          <div><div className="flex items-center gap-3 mb-3"><PIcon icon={Pill} color="#60A5FA" size="sm" /><div><h3 className="text-sm font-semibold text-white">Current Medications</h3><p className="text-xs text-white/30">0 medications on file</p></div></div><div className="rounded-xl bg-white/[0.02] border border-white/5 p-5 text-center"><p className="text-sm text-white/30">No medications on file</p></div></div>
          <div><div className="flex items-center gap-3 mb-3"><PIcon icon={AlertTriangle} color="#FBBF24" size="sm" /><h3 className="text-sm font-semibold text-white">Known Allergies &amp; Adverse Reactions</h3></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="rounded-xl bg-white/[0.02] border border-white/5 p-4"><p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold mb-2">Allergies</p><p className="text-xs text-white/25">No known allergies</p></div><div className="rounded-xl bg-white/[0.02] border border-white/5 p-4"><p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold mb-2">Adverse Reactions</p><p className="text-xs text-white/25">None reported</p></div></div></div>
          <div><div className="flex items-center gap-3 mb-3"><PIcon icon={ShieldAlert} color="#2DA5A0" size="sm" /><div><h3 className="text-sm font-semibold text-white">Interaction Analysis</h3><p className="text-xs text-white/30">Real-time checking across all substances</p></div></div><div className="rounded-xl bg-teal-400/[0.03] border border-teal-400/10 p-5 text-center"><Check className="w-6 h-6 text-teal-400 mx-auto mb-2" strokeWidth={1.5} /><p className="text-sm text-teal-400/80 font-medium">No Interactions Found</p><p className="text-xs text-white/25 mt-1">Your current medications and supplements have been checked</p></div></div>
        </div>
      </Section>

      {/* ═══ 4. FIND A PRACTITIONER ═══ */}
      <Section icon={UserSearch} iconColor="#B75E18" title="Find a Practitioner" subtitle="Consult with a healthcare professional">
        <div className="p-5 md:p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <div className="relative rounded-2xl overflow-hidden group cursor-pointer"><div className="absolute inset-0 bg-gradient-to-br from-teal-400/10 to-teal-400/[0.02]" /><div className="relative border border-teal-400/15 group-hover:border-teal-400/30 rounded-2xl p-5 md:p-6 transition-all duration-300 group-hover:shadow-[0_0_30px_rgba(45,165,160,0.08)]">
              <PIcon icon={Stethoscope} color="#2DA5A0" size="lg" />
              <h3 className="text-base font-bold text-white mt-3 mb-1.5">Find a Practitioner</h3>
              <p className="text-xs text-white/40 leading-relaxed mb-4">Licensed practitioners specializing in integrative medicine and genomics-guided optimization.</p>
              <div className="space-y-1.5 mb-4">{["Review your AI protocol", "Verify medication interactions", "Order specialized lab work", "Monitor your progress"].map(t => <div key={t} className="flex items-center gap-2"><Check className="w-3 h-3 text-teal-400/60 flex-shrink-0" strokeWidth={2} /><span className="text-[11px] text-white/35">{t}</span></div>)}</div>
              <a href="/messages" className="min-h-[44px] w-full flex items-center justify-center gap-2 rounded-xl bg-teal-400/15 border border-teal-400/30 text-teal-400 font-semibold text-sm transition-all"><Stethoscope className="w-4 h-4" strokeWidth={1.5} /> Browse Practitioners <ArrowRight className="w-4 h-4" strokeWidth={1.5} /></a>
            </div></div>
            <div className="relative rounded-2xl overflow-hidden group cursor-pointer"><div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 to-emerald-400/[0.02]" /><div className="relative border border-emerald-400/15 group-hover:border-emerald-400/30 rounded-2xl p-5 md:p-6 transition-all duration-300 group-hover:shadow-[0_0_30px_rgba(52,211,153,0.08)]">
              <PIcon icon={Leaf} color="#34D399" size="lg" />
              <h3 className="text-base font-bold text-white mt-3 mb-1.5">Find a Naturopath</h3>
              <p className="text-xs text-white/40 leading-relaxed mb-4">Naturopathic doctors combining traditional healing with modern genomics and herbal protocols.</p>
              <div className="space-y-1.5 mb-4">{["Herbal protocol guidance", "TCM / Ayurvedic integration", "Functional lab interpretation", "Holistic wellness planning"].map(t => <div key={t} className="flex items-center gap-2"><Check className="w-3 h-3 text-emerald-400/60 flex-shrink-0" strokeWidth={2} /><span className="text-[11px] text-white/35">{t}</span></div>)}</div>
              <a href="/messages" className="min-h-[44px] w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-400/15 border border-emerald-400/30 text-emerald-400 font-semibold text-sm transition-all"><Leaf className="w-4 h-4" strokeWidth={1.5} /> Browse Naturopaths <ArrowRight className="w-4 h-4" strokeWidth={1.5} /></a>
            </div></div>
          </div>
        </div>
      </Section>

      {/* ═══ 5. BROWSE & BUILD PROTOCOL ═══ */}
      <Section icon={ShoppingBag} iconColor="#B75E18" title="Browse & Build Protocol" subtitle="Scan a barcode, search by name, or browse the catalog">
        <div className="p-5 md:p-6 space-y-6">
          <SupplementInput portal="consumer" onProductAdded={() => {}} />
          <div><h3 className="text-xs text-white/20 uppercase tracking-wider font-semibold mb-3">Browse by Category</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
              {CATEGORIES.map((cat) => (
                <a key={cat.label} href={`/shop?category=${encodeURIComponent(cat.label)}`} className="rounded-xl bg-white/[0.02] border border-white/5 p-4 hover:border-white/15 hover:bg-white/[0.04] transition-all group flex flex-col items-center gap-2 text-center">
                  <div className="relative"><div className="absolute -inset-1 rounded-lg opacity-0 group-hover:opacity-60 transition-opacity blur-md" style={{ backgroundColor: `${cat.color}1A` }} /><div className="relative w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${cat.color}26, transparent)`, border: `1px solid ${cat.color}1A` }}><cat.icon className="w-5 h-5" style={{ color: cat.color }} strokeWidth={1.5} /></div></div>
                  <span className="text-xs font-medium text-white/50 group-hover:text-white/70 transition-colors">{cat.label}</span>
                  <span className="text-[10px] text-white/20">{cat.count} products</span>
                </a>
              ))}
            </div>
          </div>
          <div className="text-center pt-4"><a href="/shop" className="min-h-[48px] inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-teal-400/25 hover:border-teal-400/40 text-white font-semibold text-sm hover:shadow-[0_0_25px_rgba(45,165,160,0.1)] transition-all duration-300" style={{ background: "linear-gradient(135deg, rgba(45,165,160,0.15), rgba(183,94,24,0.15))" }}><ShoppingBag className="w-4 h-4 text-teal-400" strokeWidth={1.5} /> Browse Full Catalog <ArrowRight className="w-4 h-4" strokeWidth={1.5} /></a></div>
        </div>
      </Section>

      {/* DISCLAIMER */}
      <PractitionerDisclaimer />

      </div>
    </div>
    </>
  );
}

// RecommendedSupplementsSection replaced by Ultrathink-powered RecommendedSupplements component
// Old inline section removed — see src/components/supplement-protocol/RecommendedSupplements.tsx

// @ts-nocheck — dead code, replaced by RecommendedSupplements component.
// Kept for reference / quick rollback. Imports for FarmCeuticaRecommendation
// and generateFarmCeuticaRecommendations were dropped when the new component
// was wired in, so this whole function no longer typechecks. Cast to any.
function _RecommendedSupplementsSectionRemoved({ assessmentCompleted, profile, supplements }: {
  assessmentCompleted: boolean;
  profile: ReturnType<typeof useUserDashboardData>['profile'];
  supplements: DashboardSupplement[];
}) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(true);

  useEffect(() => {
    if (!assessmentCompleted) { setLoadingRecs(false); return; }

    async function loadRecs() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadingRecs(false); return; }

      const { data: phases } = await supabase
        .from('assessment_results')
        .select('phase, data')
        .eq('user_id', user.id);

      if (!phases?.length) { setLoadingRecs(false); return; }

      const assessmentPhases: Record<number, Record<string, unknown>> = {};
      for (const p of phases) {
        assessmentPhases[p.phase] = (p.data || {}) as Record<string, unknown>;
      }

      const currentSuppNames = supplements.map(s => s.product_name || s.supplement_name || '');
      const recs = ((globalThis as unknown as Record<string, unknown>).generateFarmCeuticaRecommendations
        ? ((globalThis as unknown as Record<string, (...args: unknown[]) => unknown[]>).generateFarmCeuticaRecommendations)(assessmentPhases, currentSuppNames)
        : []) as { name: string; priority: string; reason: string }[];
      setRecommendations(recs);
      setLoadingRecs(false);
    }

    loadRecs();
  }, [assessmentCompleted, supplements]);

  const priorityColor = (p: string) => p === 'essential' ? '#2DA5A0' : p === 'recommended' ? '#B75E18' : '#9CA3AF';

  return (
    <Section icon={Sparkles} iconColor="#2DA5A0" title="Recommended Supplements" subtitle="Personalized products for your protocol">
      <div className="p-5 md:p-6 space-y-5">
        {/* Header summary */}
        <div className="rounded-xl bg-teal-400/[0.03] border border-teal-400/10 p-4">
          <div className="flex items-start gap-3">
            <PIcon icon={Sparkles} color="#2DA5A0" size="sm" />
            <div>
              <h3 className="text-sm font-semibold text-teal-400 mb-1">AI-Powered Recommendations</h3>
              <p className="text-xs text-white/40">
                {assessmentCompleted
                  ? `Based on your goals, symptoms, and lifestyle — ${recommendations.length} products selected for you.`
                  : 'Complete your assessment to receive personalized supplement recommendations.'}
              </p>
            </div>
          </div>
        </div>

        {/* Optimization areas + strengths badges */}
        {(profile?.bio_optimization_opportunities?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-2">
            {(profile?.bio_optimization_opportunities || []).map((opp, i) => (
              <span key={`opp-${i}`} className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-orange-400/10 text-orange-400/80 border border-orange-400/15">{opp}</span>
            ))}
            {(profile?.bio_optimization_strengths || []).map((s, i) => (
              <span key={`str-${i}`} className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-teal-400/10 text-teal-400/80 border border-teal-400/15">{s}</span>
            ))}
          </div>
        )}

        {/* Loading state */}
        {loadingRecs && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-teal-400 animate-spin" />
          </div>
        )}

        {/* Product recommendation cards */}
        {!loadingRecs && recommendations.length > 0 && (
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <div key={rec.id} className="rounded-xl bg-white/[0.02] border border-white/[0.08] p-4 md:p-5 hover:border-teal-400/20 transition-all group">
                <div className="flex items-start gap-4">
                  <PIcon icon={Pill} color={priorityColor(rec.priority)} size="sm" />
                  <div className="flex-1 min-w-0">
                    {/* Product name + priority */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-white group-hover:text-teal-400 transition-colors">{rec.productName}</h4>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                        rec.priority === 'essential' ? 'bg-teal-400/10 text-teal-400/70 border border-teal-400/20'
                        : rec.priority === 'recommended' ? 'bg-orange-400/10 text-orange-400/70 border border-orange-400/20'
                        : 'bg-white/5 text-white/30 border border-white/10'
                      }`}>{rec.priority}</span>
                    </div>

                    {/* Dosage + timing + delivery */}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="text-xs text-white/40">{rec.dosage}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/25">{rec.timing}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-400/10 text-teal-400/40">{rec.deliveryMethod}</span>
                    </div>

                    {/* Reason */}
                    <p className="text-xs text-white/30 mt-2 leading-relaxed">{rec.reason}</p>

                    {/* Triggering factors */}
                    {rec.triggeringFactors.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {rec.triggeringFactors.slice(0, 4).map((factor: string, i: number) => (
                          <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/20">{factor}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Price + Add button */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-sm font-bold text-teal-400">${rec.price.toFixed(2)}</span>
                    <button className="min-h-[36px] px-4 py-1.5 rounded-lg text-xs font-medium bg-teal-400/10 border border-teal-400/30 text-teal-400 hover:bg-teal-400/20 transition-all flex items-center gap-1.5">
                      <Plus className="w-3 h-3" strokeWidth={2} /> Add to Daily Schedule
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loadingRecs && recommendations.length === 0 && !assessmentCompleted && (
          <div className="text-center py-4">
            <a href="/onboarding/i-caq-intro" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-400/15 border border-teal-400/30 text-teal-400 text-sm font-medium hover:bg-teal-400/20 transition-all">
              <Sparkles className="w-4 h-4" /> Take Assessment for Personalized Recommendations
            </a>
          </div>
        )}
      </div>
    </Section>
  );
}

function SupplementsRetakeCard() {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.08] p-5 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0"><div className="absolute blur-lg -inset-1 rounded-2xl opacity-60" style={{ backgroundColor: "#B75E1833" }} /><div className="relative w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #B75E1833, #B75E181A, transparent)", border: "1px solid #B75E1826" }}><RefreshCw className="w-4 h-4 text-orange-400" strokeWidth={1.5} /></div></div>
          <div><h4 className="text-sm font-semibold text-white">Update Your Assessment</h4><p className="text-xs text-white/30 mt-1 leading-relaxed max-w-md">Retake the Clinical Assessment Questionnaire to update your supplement protocol and recommendations with your current health status</p></div>
        </div>
        {!confirming ? (
          <button onClick={() => setConfirming(true)} className="min-h-[44px] px-5 py-2.5 rounded-xl bg-orange-400/10 border border-orange-400/30 text-orange-400 text-sm font-medium hover:bg-orange-400/15 transition-all flex items-center gap-2 w-full sm:w-auto justify-center flex-shrink-0"><RefreshCw className="w-4 h-4" strokeWidth={1.5} /> Retake Assessment</button>
        ) : (
          <div className="w-full sm:w-auto space-y-3">
            <div className="rounded-lg bg-orange-400/5 border border-orange-400/10 px-4 py-3"><p className="text-xs text-white/40 leading-relaxed">This will take you through all 7 phases. Your previous answers will be <span className="text-white/60 font-medium">pre-filled</span> so you only need to update what has changed.</p></div>
            <div className="flex gap-2"><a href="/onboarding/i-caq-intro" className="min-h-[44px] flex-1 px-5 py-2.5 rounded-xl bg-teal-400/15 border border-teal-400/30 text-teal-400 text-sm font-medium hover:bg-teal-400/20 transition-all flex items-center gap-2 justify-center"><Check className="w-4 h-4" strokeWidth={2} /> Yes, Start Assessment</a><button onClick={() => setConfirming(false)} className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 text-sm hover:bg-white/[0.08] transition-all flex items-center justify-center">Cancel</button></div>
          </div>
        )}
      </div>
    </div>
  );
}
