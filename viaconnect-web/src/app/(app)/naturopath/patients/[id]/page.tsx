"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Edit,
  Leaf,
  Activity,
  Shield,
  Calendar,
  Beaker,
  Clock,
  FileText,
  Heart,
  Plus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Card,
  Button,
  Badge,
  StatCard,
  Avatar,
  Tabs,
  TabContent,
  Progress,
} from "@/components/ui";

// ─── Mock Patient Data ───────────────────────────────────────────────────────

const patient = {
  id: "p-001",
  name: "Elena Vasquez",
  email: "elena.v@email.com",
  initials: "EV",
  age: 42,
  dob: "1983-09-14",
  gender: "Female",
  phone: "(716) 555-0142",
  constitutionalType: "Vata-Pitta",
  consentStatus: "active",
  memberSince: "2025-08-20",
};

const vitals = [
  { label: "Blood Pressure", value: "118/76 mmHg" },
  { label: "Heart Rate", value: "72 bpm" },
  { label: "Temperature", value: "98.4 F" },
  { label: "Weight", value: "138 lbs" },
  { label: "BMI", value: "22.8" },
];

const constitutionalTraits = [
  { category: "Physical Build", description: "Slender frame, prominent joints, dry skin, light bone structure" },
  { category: "Temperament", description: "Quick-minded, enthusiastic, creative; can become anxious under stress" },
  { category: "Digestion", description: "Variable appetite, tendency toward gas and bloating; aggravated by cold/raw foods" },
  { category: "Sleep Patterns", description: "Light sleeper, tends toward insomnia; benefits from calming evening routine" },
  { category: "Energy", description: "Bursts of energy followed by fatigue; responds well to routine and warmth" },
  { category: "Skin & Hair", description: "Dry, thin skin; fine hair with tendency toward early graying" },
];

const formulas = [
  {
    id: "f-001",
    name: "Nervine Calm Blend",
    herbs: ["Passionflower (Passiflora incarnata)", "Skullcap (Scutellaria lateriflora)", "Milky Oat Tops (Avena sativa)", "Lemon Balm (Melissa officinalis)"],
    doses: ["2 mL", "1.5 mL", "2 mL", "1 mL"],
    preparation: "Liquid tincture",
    created: "2026-03-01",
    status: "active",
  },
  {
    id: "f-002",
    name: "Digestive Harmony Formula",
    herbs: ["Ginger (Zingiber officinale)", "Fennel (Foeniculum vulgare)", "Chamomile (Matricaria chamomilla)", "Peppermint (Mentha piperita)"],
    doses: ["1.5 mL", "1 mL", "2 mL", "1 mL"],
    preparation: "Liquid tincture",
    created: "2026-02-15",
    status: "active",
  },
  {
    id: "f-003",
    name: "Adrenal Support Tincture",
    herbs: ["Ashwagandha (Withania somnifera)", "Rhodiola (Rhodiola rosea)", "Licorice (Glycyrrhiza glabra)", "Holy Basil (Ocimum tenuiflorum)"],
    doses: ["2 mL", "1.5 mL", "0.5 mL", "1 mL"],
    preparation: "Liquid tincture",
    created: "2026-01-20",
    status: "active",
  },
];

const protocols = [
  {
    id: "pr-001",
    name: "Stress & Adrenal Recovery",
    status: "active" as const,
    startDate: "2026-01-20",
    supplements: ["Ashwagandha 600mg", "Magnesium Glycinate 400mg", "B-Complex"],
    description: "8-week adrenal recovery protocol with adaptogenic herbs, mineral support, and lifestyle modifications.",
  },
  {
    id: "pr-002",
    name: "Digestive Restoration",
    status: "active" as const,
    startDate: "2026-02-15",
    supplements: ["L-Glutamine 5g", "Probiotic 50B CFU", "Digestive Enzymes"],
    description: "12-week gut healing protocol addressing Vata-type digestive imbalances.",
  },
  {
    id: "pr-003",
    name: "Sleep Optimization",
    status: "pending" as const,
    startDate: "2025-10-01",
    supplements: ["Melatonin 0.5mg", "Magnesium L-Threonate 2g", "Passionflower extract"],
    description: "Completed 8-week sleep hygiene and supplementation protocol.",
  },
];

const clinicalNotes = [
  {
    id: "n-001",
    date: "2026-03-19",
    practitioner: "Dr. Sarah Thompson, ND",
    summary: "Follow-up: Patient reports improved sleep quality since starting Nervine Calm Blend. Reduced anxiety episodes from 4x/week to 1x/week. Digestion improved with warm food emphasis. Continue current protocol.",
  },
  {
    id: "n-002",
    date: "2026-03-05",
    practitioner: "Dr. Sarah Thompson, ND",
    summary: "Constitutional reassessment confirms Vata-Pitta dominance. Added digestive formula to address bloating. Recommended abhyanga (oil massage) 3x/week.",
  },
  {
    id: "n-003",
    date: "2026-02-15",
    practitioner: "Dr. Sarah Thompson, ND",
    summary: "New patient intake completed. Comprehensive health history reviewed. Primary concerns: chronic stress, digestive irregularity, insomnia. Constitutional typing performed. Initial treatment plan established.",
  },
];

const recentActivity = [
  { action: "Formula created", detail: "Nervine Calm Blend", time: "Mar 1, 2026" },
  { action: "Follow-up visit", detail: "Compliance check and vitals", time: "Mar 19, 2026" },
  { action: "Protocol started", detail: "Digestive Restoration", time: "Feb 15, 2026" },
  { action: "Lab results uploaded", detail: "Micronutrient panel", time: "Feb 10, 2026" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PatientDetailPage() {
  void useParams();
  const [expandedFormula, setExpandedFormula] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const tabList = [
    { value: "overview", label: "Overview" },
    { value: "constitutional", label: "Constitutional Type" },
    { value: "botanicals", label: "Botanicals" },
    { value: "protocols", label: "Protocols" },
    { value: "notes", label: "Notes" },
  ];

  return (
    <div className="min-h-screen bg-dark-bg px-6 py-10">
      <div className="mx-auto max-w-7xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/naturopath/patients" className="hover:text-sage transition-colors">
            Patients
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-white">{patient.name}</span>
        </nav>

        {/* Patient Header */}
        <Card hover={false} className="p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <Avatar fallback={patient.initials} size="lg" className="w-16 h-16 text-lg" />
              <div>
                <h1 className="text-2xl font-bold text-white">{patient.name}</h1>
                <p className="text-sm text-gray-400 mt-0.5">{patient.email} &middot; {patient.phone}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-gray-500">Age {patient.age} &middot; DOB {formatDate(patient.dob)} &middot; {patient.gender}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="info">{patient.constitutionalType}</Badge>
                  <Badge variant="active">Consent Active</Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm">
                <Edit className="w-3.5 h-3.5 mr-1.5" />
                Edit Patient
              </Button>
              <Link href="/naturopath/botanical/formula-builder">
                <Button size="sm" className="bg-sage hover:bg-sage/80 text-white shadow-lg shadow-sage/20">
                  <Leaf className="w-3.5 h-3.5 mr-1.5" />
                  New Formula
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview" tabs={tabList}>
          {/* ──── Overview Tab ──── */}
          <TabContent value="overview">
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Shield} label="Compliance Score" value="92%" trend="up" trendLabel="+3% this month" />
                <StatCard icon={Beaker} label="Active Formulas" value="3" />
                <StatCard icon={FileText} label="Active Protocols" value="2" />
                <StatCard icon={Calendar} label="Days Since Last Visit" value="7" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Key Vitals */}
                <Card hover={false} className="p-6">
                  <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
                    <Heart className="w-4 h-4 text-sage" />
                    Key Vitals
                  </h3>
                  <div className="space-y-3">
                    {vitals.map((v, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                        <span className="text-sm text-gray-400">{v.label}</span>
                        <span className="text-sm font-medium text-white font-mono">{v.value}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Recent Activity Timeline */}
                <Card hover={false} className="p-6">
                  <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
                    <Activity className="w-4 h-4 text-sage" />
                    Recent Activity
                  </h3>
                  <div className="space-y-4">
                    {recentActivity.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 relative">
                        {i < recentActivity.length - 1 && (
                          <div className="absolute left-[11px] top-6 bottom-0 w-px bg-white/[0.06]" />
                        )}
                        <div className="w-6 h-6 rounded-full bg-sage/10 border border-sage/20 flex items-center justify-center shrink-0">
                          <div className="w-2 h-2 rounded-full bg-sage" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{item.action}</p>
                          <p className="text-xs text-gray-500">{item.detail}</p>
                          <p className="text-[11px] text-gray-600 mt-0.5">{item.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </TabContent>

          {/* ──── Constitutional Type Tab ──── */}
          <TabContent value="constitutional">
            <div className="space-y-6">
              {/* Dominant Type Visual */}
              <Card hover={false} className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Constitutional Profile</h3>
                    <p className="text-sm text-gray-400 mt-1">Ayurvedic-Western hybrid assessment</p>
                  </div>
                  <Button variant="secondary" size="sm">
                    <Activity className="w-3.5 h-3.5 mr-1.5" />
                    Re-assess
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="rounded-xl bg-sage/10 border border-sage/20 p-5 text-center">
                    <p className="text-xs uppercase tracking-wider text-sage mb-2">Primary Type</p>
                    <p className="text-2xl font-bold text-white">Vata</p>
                    <div className="mt-3">
                      <Progress value={72} color="bg-sage" />
                      <p className="text-xs text-gray-500 mt-1">72% dominance</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-copper/10 border border-copper/20 p-5 text-center">
                    <p className="text-xs uppercase tracking-wider text-copper mb-2">Secondary Type</p>
                    <p className="text-2xl font-bold text-white">Pitta</p>
                    <div className="mt-3">
                      <Progress value={55} color="bg-copper" />
                      <p className="text-xs text-gray-500 mt-1">55% influence</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 text-center">
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Tertiary Type</p>
                    <p className="text-2xl font-bold text-white">Kapha</p>
                    <div className="mt-3">
                      <Progress value={20} color="bg-gray-500" />
                      <p className="text-xs text-gray-500 mt-1">20% influence</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Trait Breakdown */}
              <Card hover={false} className="p-6">
                <h3 className="text-base font-semibold text-white mb-4">Trait Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-48">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {constitutionalTraits.map((trait, i) => (
                        <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3">
                            <span className="text-sage font-medium">{trait.category}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-300">{trait.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </TabContent>

          {/* ──── Botanicals Tab ──── */}
          <TabContent value="botanicals">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Active Herbal Formulas</h3>
                <Link href="/naturopath/botanical/formula-builder">
                  <Button size="sm" className="bg-sage hover:bg-sage/80 text-white shadow-lg shadow-sage/20">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Create New Formula
                  </Button>
                </Link>
              </div>

              {formulas.map((formula) => {
                const isExpanded = expandedFormula === formula.id;
                return (
                  <Card key={formula.id} hover={false} className="overflow-hidden">
                    <button
                      onClick={() => setExpandedFormula(isExpanded ? null : formula.id)}
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-sage/10 flex items-center justify-center">
                          <Leaf className="w-5 h-5 text-sage" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{formula.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formula.preparation} &middot; {formula.herbs.length} herbs &middot; Created {formatDate(formula.created)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="active">Active</Badge>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-white/[0.06] px-5 py-4 bg-white/[0.01]">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-white/[0.06]">
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Herb</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Dose</th>
                            </tr>
                          </thead>
                          <tbody>
                            {formula.herbs.map((herb, i) => (
                              <tr key={i} className="border-b border-white/[0.04]">
                                <td className="px-3 py-2 text-gray-300">{herb}</td>
                                <td className="px-3 py-2 text-sage font-mono">{formula.doses[i]}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </TabContent>

          {/* ──── Protocols Tab ──── */}
          <TabContent value="protocols">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Naturopathic Protocols</h3>

              {/* Active Protocols */}
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Active</p>
                {protocols
                  .filter((p) => p.status === "active")
                  .map((protocol) => (
                    <Card key={protocol.id} hover={false} className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-white">{protocol.name}</h4>
                            <Badge variant="active">Active</Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Started {formatDate(protocol.startDate)}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 mb-3">{protocol.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {protocol.supplements.map((supp, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-md bg-sage/10 text-sage border border-sage/20"
                          >
                            {supp}
                          </span>
                        ))}
                      </div>
                    </Card>
                  ))}
              </div>

              {/* Protocol History */}
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">History</p>
                {protocols
                  .filter((p) => p.status !== "active")
                  .map((protocol) => (
                    <Card key={protocol.id} hover={false} className="p-5 opacity-60">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-white">{protocol.name}</h4>
                            <Badge variant="pending">Completed</Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Started {formatDate(protocol.startDate)}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 mb-3">{protocol.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {protocol.supplements.map((supp, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-md bg-white/[0.04] text-gray-500 border border-white/[0.06]"
                          >
                            {supp}
                          </span>
                        ))}
                      </div>
                    </Card>
                  ))}
              </div>
            </div>
          </TabContent>

          {/* ──── Notes Tab ──── */}
          <TabContent value="notes">
            <div className="space-y-6">
              {/* Add Note Form */}
              <Card hover={false} className="p-5">
                <h3 className="text-base font-semibold text-white mb-3">Add Clinical Note</h3>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Enter clinical observations, recommendations, or follow-up notes..."
                  rows={4}
                  className="w-full rounded-lg text-sm text-white placeholder:text-gray-600 outline-none transition-colors bg-white/[0.04] border border-white/[0.08] focus:border-sage/50 focus:ring-1 focus:ring-sage/20 p-3 resize-none"
                />
                <div className="flex justify-end mt-3">
                  <Button size="sm" className="bg-sage hover:bg-sage/80 text-white shadow-lg shadow-sage/20">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Save Note
                  </Button>
                </div>
              </Card>

              {/* Notes List */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-white">Clinical Notes</h3>
                {clinicalNotes.map((note) => (
                  <Card key={note.id} hover={false} className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-sage" />
                        <span className="text-sm font-medium text-white">{formatDate(note.date)}</span>
                      </div>
                      <span className="text-xs text-gray-500">{note.practitioner}</span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{note.summary}</p>
                  </Card>
                ))}
              </div>
            </div>
          </TabContent>
        </Tabs>
      </div>
    </div>
  );
}
