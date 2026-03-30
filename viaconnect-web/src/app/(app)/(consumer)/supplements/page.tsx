"use client";

import { useState } from "react";
import {
  Pill, CalendarClock, Sparkles, ShieldAlert, UserSearch, ShoppingBag,
  Stethoscope, Leaf, ArrowRight, Check, Search, FlaskConical, Droplets,
  Dna, Activity, TestTubes, Clock, Sunrise, Sun, Moon,
  AlertTriangle, Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ProtocolConfidenceBadge } from "@/components/protocol/ProtocolConfidenceBadge";
import { PractitionerDisclaimer } from "@/components/protocol/PractitionerDisclaimer";
import { DataSourceTag } from "@/components/protocol/DataSourceTag";

function PIcon({ icon: Icon, color, size = "md" }: { icon: LucideIcon; color: string; size?: "sm" | "md" | "lg" }) {
  const s = size === "lg" ? { box: "w-14 h-14", ico: "w-7 h-7", glow: "blur-2xl -inset-2" } : size === "sm" ? { box: "w-9 h-9", ico: "w-4 h-4", glow: "blur-lg -inset-1" } : { box: "w-12 h-12", ico: "w-5 h-5", glow: "blur-xl -inset-1.5" };
  return (<div className="relative flex-shrink-0"><div className={`absolute ${s.glow} rounded-2xl opacity-60 pointer-events-none`} style={{ backgroundColor: `${color}33` }} /><div className={`relative ${s.box} rounded-xl flex items-center justify-center`} style={{ background: `linear-gradient(135deg, ${color}33, ${color}1A, transparent)`, border: `1px solid ${color}26` }}><Icon className={s.ico} style={{ color }} strokeWidth={1.5} /></div></div>);
}

/* ═══ DATA ═══ */
const PROTOCOL = {
  morning: [
    { id: "1", productName: "BioB Fusion\u2122 Methylated B Complex", dosage: "1 capsule", deliveryMethod: "Liposomal", priority: "essential" as const, dataSourceTag: "caq", takenToday: true },
    { id: "2", productName: "Liposomal Vitamin D3 + K2 (MK-7)", dosage: "5000 IU", deliveryMethod: "Liposomal", priority: "essential" as const, dataSourceTag: "caq", takenToday: false },
    { id: "3", productName: "Algal Omega-3 DHA/EPA", dosage: "1000mg", priority: "essential" as const, dataSourceTag: "caq", takenToday: false },
  ],
  afternoon: [{ id: "4", productName: "Liposomal CoQ10 (Ubiquinol)", dosage: "200mg", deliveryMethod: "Liposomal", priority: "recommended" as const, dataSourceTag: "caq", takenToday: false }],
  evening: [
    { id: "5", productName: "Liposomal Magnesium L-Threonate", dosage: "400mg", deliveryMethod: "Liposomal", priority: "essential" as const, dataSourceTag: "caq", takenToday: false },
    { id: "6", productName: "Melatonin (Extended Release)", dosage: "3mg", priority: "optional" as const, dataSourceTag: "caq", takenToday: false },
  ],
  asNeeded: [{ id: "7", productName: "L-Theanine", dosage: "200mg", priority: "optional" as const, dataSourceTag: "caq", takenToday: false }],
};
const GAPS = [{ nutrient: "Vitamin D", deficit: "38% below" }, { nutrient: "Omega-3", deficit: "55% gap" }, { nutrient: "Magnesium", deficit: "25% below" }];
const RECS = [
  { id: "r1", productName: "Liposomal NAC", dosage: "600mg", timing: "Morning", deliveryMethod: "Liposomal", priority: "recommended" as const, reason: "Glutathione precursor for detoxification", evidenceLevel: "strong", dataSourceTag: "caq" },
  { id: "r2", productName: "Micellar Ashwagandha (KSM-66\u00ae)", dosage: "600mg", timing: "Afternoon", deliveryMethod: "Micellar", priority: "recommended" as const, reason: "Adaptogenic stress support", evidenceLevel: "strong", dataSourceTag: "caq" },
];
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

function ItemRow({ item }: { item: typeof PROTOCOL.morning[0] }) {
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
      <div className="absolute inset-0 bg-gradient-to-b from-[#141E33] via-[#1A2744] to-[#1A2744]" />
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
  const all = [...PROTOCOL.morning, ...PROTOCOL.afternoon, ...PROTOCOL.evening, ...PROTOCOL.asNeeded];
  const taken = all.filter(i => i.takenToday).length;
  const pct = Math.round((taken / all.length) * 100);

  return (
    <div className="min-h-screen px-2 sm:px-4 md:px-8 py-4 md:py-6 space-y-6" style={{ background: "linear-gradient(180deg, #0F1520, #1A2744)" }}>

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
          <div className="space-y-4">
            {SLOTS.map((slot) => {
              const items = (PROTOCOL as Record<string, typeof PROTOCOL.morning>)[slot.id] || [];
              if (!items.length) return null;
              return (
                <div key={slot.id} className="rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden">
                  <div className="flex items-center gap-3 px-4 md:px-5 py-3 border-b border-white/5">
                    <PIcon icon={slot.icon} color={slot.color} size="sm" />
                    <div className="flex-1"><h4 className="text-sm font-semibold text-white">{slot.label}</h4><p className="text-[10px] text-white/25">{slot.time}</p></div>
                    <span className="text-xs text-white/20">{items.length} item{items.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="divide-y divide-white/[0.03]">{items.map((item) => <ItemRow key={item.id} item={item} />)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ═══ 2. RECOMMENDED SUPPLEMENTS ═══ */}
      <Section icon={Sparkles} iconColor="#2DA5A0" title="Recommended Supplements" subtitle="AI-powered FarmCeutica product recommendations">
        <div className="p-5 md:p-6 space-y-5">
          <div className="rounded-xl bg-teal-400/[0.03] border border-teal-400/10 p-4">
            <div className="flex items-start gap-3"><PIcon icon={Sparkles} color="#2DA5A0" size="sm" /><div><h3 className="text-sm font-semibold text-teal-400 mb-1">AI-Powered Recommendations</h3><p className="text-xs text-white/40">Based on your Clinical Assessment, we identified {GAPS.length} nutrient gaps and {RECS.length} products for your protocol.</p></div></div>
          </div>
          {GAPS.length > 0 && (
            <div><h4 className="text-xs text-white/25 uppercase tracking-wider font-semibold mb-3">Nutrient Gaps</h4><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">{GAPS.map((g, i) => <div key={i} className="rounded-lg bg-orange-400/5 border border-orange-400/10 px-3 py-2.5 text-center"><p className="text-xs font-medium text-orange-400/80">{g.nutrient}</p><p className="text-[10px] text-white/20 mt-0.5">{g.deficit}</p></div>)}</div></div>
          )}
          <div className="space-y-3">
            {RECS.map((rec) => (
              <div key={rec.id} className="rounded-xl bg-white/[0.02] border border-white/[0.08] p-4 md:p-5 hover:border-teal-400/20 transition-all group">
                <div className="flex items-start gap-4">
                  <PIcon icon={Pill} color={rec.priority === "essential" ? "#2DA5A0" : "#B75E18"} size="sm" />
                  <div className="flex-1 min-w-0"><h4 className="text-sm font-semibold text-white group-hover:text-teal-400 transition-colors">{rec.productName}</h4><div className="flex flex-wrap items-center gap-2 mt-1.5"><span className="text-xs text-white/40">{rec.dosage}</span>{rec.timing && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/25">{rec.timing}</span>}{rec.deliveryMethod && <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-400/10 text-teal-400/40">{rec.deliveryMethod}</span>}</div><p className="text-xs text-white/30 mt-2">{rec.reason}</p></div>
                  <button className="min-h-[36px] px-4 py-1.5 rounded-lg text-xs font-medium bg-teal-400/10 border border-teal-400/30 text-teal-400 hover:bg-teal-400/15 transition-all flex items-center gap-1.5 flex-shrink-0"><Plus className="w-3 h-3" strokeWidth={2} /> Add</button>
                </div>
              </div>
            ))}
          </div>
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
          <div className="rounded-xl bg-orange-400/5 border border-orange-400/15 p-5">
            <div className="flex items-start gap-3">
              <PIcon icon={ShieldAlert} color="#B75E18" size="sm" />
              <div><h3 className="text-sm font-semibold text-orange-400 mb-1">Important: Consult Before Starting</h3><p className="text-xs text-white/40 leading-relaxed">Your supplement protocol has been generated by AI. We strongly recommend consulting with a healthcare practitioner or naturopath before starting any new supplement regimen.</p></div>
            </div>
          </div>
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
      <Section icon={ShoppingBag} iconColor="#B75E18" title="Browse & Build Protocol" subtitle="Search the FarmCeutica catalog and add to your protocol">
        <div className="p-5 md:p-6 space-y-6">
          <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/25 pointer-events-none" strokeWidth={1.5} /><input type="text" placeholder="Browse the catalog and add supplements to build your daily protocol" className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white text-base placeholder:text-white/25 focus:border-teal-400/40 focus:ring-1 focus:ring-teal-400/20 focus:outline-none transition-all" autoComplete="off" /></div>
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
  );
}
