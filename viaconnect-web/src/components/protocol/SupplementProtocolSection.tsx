"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pill, CalendarClock, Sparkles, ShieldAlert, Sunrise, Sun, Moon, Clock,
  Check, Plus, AlertTriangle, AlertOctagon, Info, Zap, ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ProtocolConfidenceBadge } from "./ProtocolConfidenceBadge";
import { PractitionerDisclaimer } from "./PractitionerDisclaimer";
import { DataSourceTag } from "./DataSourceTag";

/* ═══ PREMIUM ICON ═══ */
function PIcon({ icon: Icon, color, size = "md" }: { icon: LucideIcon; color: string; size?: "sm" | "md" | "lg" }) {
  const s = size === "lg" ? { box: "w-14 h-14", ico: "w-7 h-7", glow: "blur-2xl -inset-2" }
    : size === "sm" ? { box: "w-9 h-9", ico: "w-4 h-4", glow: "blur-lg -inset-1" }
    : { box: "w-12 h-12", ico: "w-5 h-5", glow: "blur-xl -inset-1.5" };
  return (
    <div className="relative flex-shrink-0">
      <div className={`absolute ${s.glow} rounded-2xl opacity-60 pointer-events-none`} style={{ backgroundColor: `${color}33` }} />
      <div className={`relative ${s.box} rounded-xl flex items-center justify-center`} style={{ background: `linear-gradient(135deg, ${color}33, ${color}1A, transparent)`, border: `1px solid ${color}26` }}>
        <Icon className={s.ico} style={{ color }} strokeWidth={1.5} />
      </div>
    </div>
  );
}

/* ═══ TYPES ═══ */
interface ProtocolItem { id: string; productName: string; dosage: string; deliveryMethod?: string; priority: "essential" | "recommended" | "optional"; source?: string; dataSourceTag?: string; reason?: string; evidenceLevel?: string; timing?: string; takenToday?: boolean }
interface Interaction { id: string; medication_name: string; interacts_with_name: string; severity: "major" | "moderate" | "minor" | "synergistic"; mechanism: string; clinical_effect?: string; mitigation?: string; evidence_level?: string; onset_timing?: string }
interface Props {
  supplements: ProtocolItem[];
  protocol: { morning: ProtocolItem[]; afternoon: ProtocolItem[]; evening: ProtocolItem[]; asNeeded: ProtocolItem[]; gapAnalysis?: { gaps: { nutrient: string; deficit: string }[] }; recommendations?: ProtocolItem[] } | null;
  medications: { id: string; name: string; dosage?: string; frequency?: string; hasInteraction?: boolean; interactionSeverity?: string }[];
  allergies: string[];
  adverseReactions: string;
  interactions: Interaction[];
  tier: 1 | 2 | 3;
}

const TABS = [
  { id: "daily" as const, label: "Daily Schedule", short: "Daily", icon: CalendarClock },
  { id: "recommended" as const, label: "Recommended Supplements", short: "Recommended", icon: Sparkles },
  { id: "interactions" as const, label: "Medical & Herbal Interactions", short: "Interactions", icon: ShieldAlert },
];

/* ═══ MAIN COMPONENT ═══ */
export function SupplementProtocolSection({ supplements, protocol, medications, allergies, adverseReactions, interactions, tier }: Props) {
  const [activeTab, setActiveTab] = useState<"daily" | "recommended" | "interactions">("daily");

  return (
    <section className="relative rounded-2xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#141E33]/35 via-[#1A2744]/35 to-[#1A2744]/35 backdrop-blur-md" />
      <div className="absolute inset-0 rounded-2xl border border-white/[0.08]" />
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-teal-400/[0.08] via-transparent to-orange-400/[0.05] opacity-50 pointer-events-none" />

      {/* HEADER */}
      <div className="relative z-10 p-5 md:p-8 border-b border-white/5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <PIcon icon={Pill} color="#2DA5A0" size="lg" />
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Supplement Protocol</h2>
              <p className="text-sm text-white/40 mt-0.5">Your personalized daily regimen</p>
            </div>
          </div>
          <ProtocolConfidenceBadge tier={tier} />
        </div>

        {/* TAB BAR — canonical compact pills (Prompt #76) */}
        <div className="mt-6 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors duration-200 cursor-pointer"
                style={isActive
                  ? { backgroundColor: 'rgba(59,130,246,0.18)', color: '#3B82F6', borderColor: 'rgba(59,130,246,0.40)' }
                  : { backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.60)', borderColor: 'rgba(255,255,255,0.10)' }}
              >
                <tab.icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.short}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === "daily" && <motion.div key="daily" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <DailyScheduleTab supplements={supplements} protocol={protocol} />
          </motion.div>}
          {activeTab === "recommended" && <motion.div key="recommended" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <RecommendedTab protocol={protocol} />
          </motion.div>}
          {activeTab === "interactions" && <motion.div key="interactions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <InteractionsTab medications={medications} allergies={allergies} adverseReactions={adverseReactions} interactions={interactions} />
          </motion.div>}
        </AnimatePresence>
      </div>

      <div className="relative z-10 px-5 md:px-8 pb-5 md:pb-8">
        <PractitionerDisclaimer />
      </div>
    </section>
  );
}

/* ═══ TAB 1: DAILY SCHEDULE ═══ */
const TIME_SLOTS = [
  { id: "morning", label: "Morning", icon: Sunrise, time: "7:00 AM", color: "#FBBF24" },
  { id: "afternoon", label: "Afternoon", icon: Sun, time: "12:00 PM", color: "#B75E18" },
  { id: "evening", label: "Evening", icon: Moon, time: "7:00 PM", color: "#60A5FA" },
  { id: "asNeeded", label: "As Needed", icon: Clock, time: "Flexible", color: "#9CA3AF" },
];

function DailyScheduleTab({ supplements, protocol }: { supplements: ProtocolItem[]; protocol: Props["protocol"] }) {
  const allItems = protocol
    ? [...(protocol.morning || []), ...(protocol.afternoon || []), ...(protocol.evening || []), ...(protocol.asNeeded || [])]
    : supplements || [];
  const total = allItems.length;
  const taken = allItems.filter((i) => i.takenToday).length;
  const pct = total > 0 ? Math.round((taken / total) * 100) : 0;

  function getSlotItems(slotId: string) {
    if (protocol) {
      if (slotId === "asNeeded") return protocol.asNeeded || [];
      return ((protocol as unknown) as Record<string, ProtocolItem[]>)[slotId] || [];
    }
    return supplements || [];
  }

  return (
    <div className="p-5 md:p-8 space-y-6">
      {/* Adherence */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Today&apos;s Schedule</h3>
          <p className="text-xs text-white/30 mt-0.5">{taken}/{total} taken today</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full bg-teal-400 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs font-medium text-teal-400">{pct}%</span>
        </div>
      </div>

      {/* Time Slots */}
      {TIME_SLOTS.map((slot) => {
        const items = getSlotItems(slot.id);
        if (items.length === 0) return null;
        return (
          <div key={slot.id} className="rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden">
            <div className="flex items-center gap-3 px-4 md:px-5 py-3 border-b border-white/5">
              <PIcon icon={slot.icon} color={slot.color} size="sm" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-white">{slot.label}</h4>
                <p className="text-[10px] text-white/25">{slot.time}</p>
              </div>
              <span className="text-xs text-white/20">{items.length} item{items.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="divide-y divide-white/[0.03]">
              {items.map((item, i) => <ItemRow key={item.id || i} item={item} />)}
            </div>
          </div>
        );
      })}

      {total === 0 && (
        <div className="text-center py-12">
          <Pill className="w-8 h-8 text-white/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-white/40 mb-2">No supplements added yet</p>
          <p className="text-xs text-white/20">Complete your Clinical Assessment to populate your daily schedule</p>
        </div>
      )}
    </div>
  );
}

function ItemRow({ item }: { item: ProtocolItem }) {
  const [taken, setTaken] = useState(item.takenToday || false);
  return (
    <div className="flex items-center gap-4 px-4 md:px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
      <button onClick={() => setTaken(!taken)} className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center">
        {taken ? (
          <div className="w-6 h-6 rounded-full bg-teal-400/20 border border-teal-400/40 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-teal-400" strokeWidth={2.5} />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full border-2 border-white/15 hover:border-teal-400/30 transition-colors" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium transition-colors ${taken ? "text-white/40 line-through" : "text-white/80"}`}>{item.productName}</p>
        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          <span className="text-[10px] text-white/25">{item.dosage}</span>
          {item.deliveryMethod && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/20">{item.deliveryMethod}</span>}
          {item.dataSourceTag && <DataSourceTag source={item.dataSourceTag as "caq" | "lab_validated" | "genetic_optimized"} />}
        </div>
      </div>
      <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider flex-shrink-0 ${
        item.priority === "essential" ? "bg-teal-400/10 text-teal-400/60 border border-teal-400/15"
        : item.priority === "recommended" ? "bg-orange-400/10 text-orange-400/60 border border-orange-400/15"
        : "bg-white/5 text-white/25 border border-white/[0.08]"
      }`}>{item.priority}</span>
    </div>
  );
}

/* ═══ TAB 2: RECOMMENDED ═══ */
function RecommendedTab({ protocol }: { protocol: Props["protocol"] }) {
  const recs = protocol?.recommendations || [];
  const gaps = protocol?.gapAnalysis?.gaps || [];

  return (
    <div className="p-5 md:p-8 space-y-6">
      <div className="rounded-xl bg-teal-400/[0.03] border border-teal-400/10 p-5">
        <div className="flex items-start gap-3">
          <PIcon icon={Sparkles} color="#2DA5A0" size="sm" />
          <div>
            <h3 className="text-sm font-semibold text-teal-400 mb-1">AI-Powered Recommendations</h3>
            <p className="text-xs text-white/40 leading-relaxed">Based on your Clinical Assessment, we&apos;ve identified {gaps.length} nutrient gap{gaps.length !== 1 ? "s" : ""} and {recs.length} products for your protocol.</p>
          </div>
        </div>
      </div>

      {gaps.length > 0 && (
        <div>
          <h4 className="text-xs text-white/25 uppercase tracking-wider font-semibold mb-3">Nutrient Gaps</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {gaps.map((g, i) => (
              <div key={i} className="rounded-lg bg-orange-400/5 border border-orange-400/10 px-3 py-2.5 text-center">
                <p className="text-xs font-medium text-orange-400/80">{g.nutrient}</p>
                <p className="text-[10px] text-white/20 mt-0.5">{g.deficit}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h4 className="text-xs text-white/25 uppercase tracking-wider font-semibold">Recommended Products For You</h4>
        {recs.map((rec, i) => (
          <div key={rec.id || i} className="rounded-xl bg-white/[0.02] border border-white/[0.08] p-4 md:p-5 hover:border-teal-400/20 hover:bg-white/[0.03] transition-all group">
            <div className="flex items-start gap-4">
              <PIcon icon={Pill} color={rec.priority === "essential" ? "#2DA5A0" : rec.priority === "recommended" ? "#B75E18" : "#9CA3AF"} size="sm" />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-white group-hover:text-teal-400 transition-colors">{rec.productName}</h4>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="text-xs text-white/40">{rec.dosage}</span>
                  {rec.timing && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/25">{rec.timing}</span>}
                  {rec.deliveryMethod && <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-400/10 text-teal-400/40">{rec.deliveryMethod}</span>}
                </div>
                {rec.reason && <p className="text-xs text-white/30 mt-2 leading-relaxed">{rec.reason}</p>}
                <div className="flex items-center gap-2 mt-2">
                  {rec.dataSourceTag && <DataSourceTag source={rec.dataSourceTag as "caq"} />}
                  {rec.evidenceLevel && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/15">Evidence: {rec.evidenceLevel}</span>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                  rec.priority === "essential" ? "bg-teal-400/10 text-teal-400/60 border border-teal-400/15"
                  : rec.priority === "recommended" ? "bg-orange-400/10 text-orange-400/60 border border-orange-400/15"
                  : "bg-white/5 text-white/25 border border-white/[0.08]"
                }`}>{rec.priority}</span>
                <button className="min-h-[36px] px-4 py-1.5 rounded-lg text-xs font-medium bg-teal-400/10 border border-teal-400/30 text-teal-400 hover:bg-teal-400/15 transition-all flex items-center gap-1.5">
                  <Plus className="w-3 h-3" strokeWidth={2} /> Add
                </button>
              </div>
            </div>
          </div>
        ))}
        {recs.length === 0 && (
          <div className="text-center py-12">
            <Sparkles className="w-8 h-8 text-white/15 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-sm text-white/40 mb-2">Recommendations generating...</p>
            <p className="text-xs text-white/20">Your AI protocol is being built from your assessment data</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══ TAB 3: INTERACTIONS ═══ */
function InteractionsTab({ medications, allergies, adverseReactions, interactions }: { medications: Props["medications"]; allergies: string[]; adverseReactions: string; interactions: Interaction[] }) {
  return (
    <div className="p-5 md:p-8 space-y-8">
      {/* Medications */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <PIcon icon={Pill} color="#60A5FA" size="sm" />
          <div>
            <h3 className="text-base font-semibold text-white">Current Medications</h3>
            <p className="text-xs text-white/30">{medications?.length || 0} medication{(medications?.length || 0) !== 1 ? "s" : ""} on file</p>
          </div>
        </div>
        {medications?.length > 0 ? (
          <div className="space-y-2">
            {medications.map((med) => (
              <div key={med.id} className="flex items-center gap-4 rounded-xl bg-white/[0.02] border border-white/5 px-4 md:px-5 py-3.5">
                <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white/80">{med.name}</p>
                  {med.dosage && <p className="text-xs text-white/30 mt-0.5">{med.dosage}{med.frequency ? ` · ${med.frequency}` : ""}</p>}
                </div>
                {med.hasInteraction && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${med.interactionSeverity === "major" ? "bg-red-400/10 text-red-400 border border-red-400/20" : "bg-yellow-400/10 text-yellow-400 border border-yellow-400/20"}`}>
                    {med.interactionSeverity === "major" ? "Major" : "Moderate"}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : <div className="rounded-xl bg-white/[0.02] border border-white/5 p-5 text-center"><p className="text-sm text-white/30">No medications on file</p></div>}
      </div>

      {/* Allergies */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <PIcon icon={AlertTriangle} color="#FBBF24" size="sm" />
          <h3 className="text-base font-semibold text-white">Known Allergies &amp; Adverse Reactions</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
            <p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold mb-3">Allergies</p>
            {allergies?.filter(a => a !== "None").length > 0 ? (
              <div className="flex flex-wrap gap-2">{allergies.filter(a => a !== "None").map((a, i) => <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-red-400/5 border border-red-400/15 text-red-400/70">{a}</span>)}</div>
            ) : <p className="text-xs text-white/25">No known allergies</p>}
          </div>
          <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
            <p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold mb-3">Previous Adverse Reactions</p>
            {adverseReactions ? <p className="text-xs text-white/40 leading-relaxed">{adverseReactions}</p> : <p className="text-xs text-white/25">None reported</p>}
          </div>
        </div>
      </div>

      {/* Interactions */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <PIcon icon={ShieldAlert} color="#2DA5A0" size="sm" />
          <div>
            <h3 className="text-base font-semibold text-white">Interaction Analysis</h3>
            <p className="text-xs text-white/30">Real-time checking across medications, supplements, and recommendations</p>
          </div>
        </div>

        {interactions?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {interactions.filter(i => i.severity === "major").length > 0 && <span className="text-[10px] px-3 py-1.5 rounded-full bg-red-400/10 border border-red-400/20 text-red-400 font-medium">{interactions.filter(i => i.severity === "major").length} Major</span>}
            {interactions.filter(i => i.severity === "moderate").length > 0 && <span className="text-[10px] px-3 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 font-medium">{interactions.filter(i => i.severity === "moderate").length} Moderate</span>}
            {interactions.filter(i => i.severity === "minor").length > 0 && <span className="text-[10px] px-3 py-1.5 rounded-full bg-green-400/10 border border-green-400/20 text-green-400 font-medium">{interactions.filter(i => i.severity === "minor").length} Minor</span>}
            {interactions.filter(i => i.severity === "synergistic").length > 0 && <span className="text-[10px] px-3 py-1.5 rounded-full bg-blue-400/10 border border-blue-400/20 text-blue-400 font-medium">{interactions.filter(i => i.severity === "synergistic").length} Synergistic</span>}
          </div>
        )}

        <div className="space-y-3">
          {interactions?.sort((a, b) => {
            const order = { major: 0, moderate: 1, minor: 2, synergistic: 3 };
            return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
          }).map((ix) => <InteractionCard key={ix.id} ix={ix} />)}
        </div>

        {(!interactions || interactions.length === 0) && (
          <div className="rounded-xl bg-teal-400/[0.03] border border-teal-400/10 p-5 text-center">
            <Check className="w-6 h-6 text-teal-400 mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-sm text-teal-400/80 font-medium">No Interactions Found</p>
            <p className="text-xs text-white/25 mt-1">Your current medications and supplements have been checked</p>
          </div>
        )}
      </div>
    </div>
  );
}

function InteractionCard({ ix }: { ix: Interaction }) {
  const [open, setOpen] = useState(false);
  const cfg = { major: { bg: "bg-red-400/5", border: "border-red-400/15", text: "text-red-400", Icon: AlertOctagon }, moderate: { bg: "bg-yellow-400/5", border: "border-yellow-400/15", text: "text-yellow-400", Icon: AlertTriangle }, minor: { bg: "bg-green-400/5", border: "border-green-400/15", text: "text-green-400", Icon: Info }, synergistic: { bg: "bg-blue-400/5", border: "border-blue-400/15", text: "text-blue-400", Icon: Zap } }[ix.severity];
  return (
    <div className={`rounded-xl overflow-hidden ${cfg.bg} border ${cfg.border} cursor-pointer transition-all`} onClick={() => setOpen(!open)}>
      <div className="flex items-center gap-4 px-4 md:px-5 py-3.5 min-h-[44px]">
        <cfg.Icon className={`w-5 h-5 ${cfg.text} flex-shrink-0`} strokeWidth={1.5} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white/80">{ix.medication_name} + {ix.interacts_with_name}</p>
          <p className="text-xs text-white/30 mt-0.5 truncate">{ix.mechanism}</p>
        </div>
        <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase ${cfg.text} bg-white/[0.05]`}>{ix.severity}</span>
        <ChevronDown className={`w-4 h-4 text-white/20 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={1.5} />
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 md:px-5 pb-4 pt-2 border-t border-white/5 space-y-3">
              {ix.clinical_effect && <div><p className="text-[10px] text-white/20 uppercase tracking-wider mb-1">Clinical Effect</p><p className="text-xs text-white/50">{ix.clinical_effect}</p></div>}
              {ix.mitigation && <div><p className="text-[10px] text-white/20 uppercase tracking-wider mb-1">Mitigation</p><p className="text-xs text-white/50">{ix.mitigation}</p></div>}
              <div className="flex items-center gap-2">
                {ix.evidence_level && <span className="text-[9px] px-2 py-0.5 rounded bg-white/[0.04] text-white/15">Evidence: {ix.evidence_level}</span>}
                {ix.onset_timing && <span className="text-[9px] px-2 py-0.5 rounded bg-white/[0.04] text-white/15">Onset: {ix.onset_timing}</span>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
