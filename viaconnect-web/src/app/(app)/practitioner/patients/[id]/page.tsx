"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  Card,
  Button,
  Badge,
  StatCard,
  Avatar,
  Tabs,
  TabContent,
  Progress,
  Input,
  DataTable,
} from "@/components/ui";
import type { Column } from "@/components/ui";
import {
  ChevronRight,
  Heart,
  TrendingUp,
  ClipboardList,
  Calendar,
  Edit3,
  Plus,
  Dna,
  FileText,
  Upload,
  Send,
  RefreshCw,
  Activity,
  Pill,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Brain,
  Moon,
  Utensils,
  Dumbbell,
  Zap,
  Shield,
} from "lucide-react";

// ─── Mock Data ───────────────────────────────────────────────────────────────

const patient = {
  id: "pat_001",
  firstName: "Sarah",
  lastName: "Mitchell",
  email: "sarah.mitchell@email.com",
  phone: "(716) 555-0142",
  dateOfBirth: "1991-08-15",
  age: 34,
  gender: "Female",
  consentStatus: "active" as const,
  riskLevel: "moderate" as const,
  avatarUrl: null,
  membership: "Platinum",
  viaTokens: 2450,
};

const genePanel = [
  {
    gene: "MTHFR",
    variant: "C677T",
    genotype: "CT",
    riskLevel: "moderate" as const,
    significance:
      "Reduced folate metabolism (~65% enzyme activity). Recommend methylfolate supplementation.",
  },
  {
    gene: "COMT",
    variant: "Val158Met",
    genotype: "AG",
    riskLevel: "low" as const,
    significance:
      "Intermediate catechol-O-methyltransferase activity. Balanced dopamine clearance.",
  },
  {
    gene: "CYP1A2",
    variant: "rs762551",
    genotype: "AC",
    riskLevel: "moderate" as const,
    significance:
      "Slow caffeine metabolizer. Limit caffeine to <200mg/day for cardiovascular benefit.",
  },
  {
    gene: "APOE",
    variant: "E3/E4",
    genotype: "E3/E4",
    riskLevel: "high" as const,
    significance:
      "Elevated cardiovascular and neurodegeneration risk. Prioritize omega-3, anti-inflammatory protocol.",
  },
  {
    gene: "VDR",
    variant: "TaqI",
    genotype: "Tt",
    riskLevel: "moderate" as const,
    significance:
      "Reduced vitamin D receptor expression. Higher supplementation thresholds required.",
  },
  {
    gene: "CBS",
    variant: "C699T",
    genotype: "CT",
    riskLevel: "low" as const,
    significance:
      "Mildly upregulated CBS enzyme. Monitor sulfur-containing amino acid intake.",
  },
];

const currentProtocol = {
  name: "Methylation Optimization Protocol",
  startDate: "2026-02-01",
  status: "active" as const,
  supplements: [
    { name: "MTHFR+", dose: "1 capsule", frequency: "Daily", timeOfDay: "Morning", adherence: 92 },
    { name: "COMT+", dose: "1 capsule", frequency: "Daily", timeOfDay: "Morning", adherence: 88 },
    { name: "NAD+", dose: "2 capsules", frequency: "Daily", timeOfDay: "Evening", adherence: 74 },
    { name: "FOCUS+", dose: "1 capsule", frequency: "Daily", timeOfDay: "Afternoon", adherence: 65 },
  ],
};

type ProtocolRow = {
  name: string;
  status: string;
  start: string;
  end: string;
  productsCount: number;
  [key: string]: unknown;
};

const protocolHistory: ProtocolRow[] = [
  { name: "Methylation Optimization Protocol", status: "Active", start: "2026-02-01", end: "—", productsCount: 4 },
  { name: "Foundation Wellness Stack", status: "Completed", start: "2025-10-15", end: "2026-01-31", productsCount: 3 },
  { name: "Detox & Recovery Protocol", status: "Completed", start: "2025-07-01", end: "2025-10-14", productsCount: 5 },
];

const labResults = [
  { marker: "Vitamin D (25-OH)", value: "38 ng/mL", range: "30-100 ng/mL", status: "normal" as const },
  { marker: "Homocysteine", value: "11.2 \u00B5mol/L", range: "5-15 \u00B5mol/L", status: "normal" as const },
  { marker: "Ferritin", value: "18 ng/mL", range: "20-200 ng/mL", status: "low" as const },
  { marker: "TSH", value: "3.8 mIU/L", range: "0.4-4.0 mIU/L", status: "normal" as const },
  { marker: "Free T3", value: "2.1 pg/mL", range: "2.3-4.2 pg/mL", status: "low" as const },
  { marker: "DHEA-S", value: "410 \u00B5g/dL", range: "65-380 \u00B5g/dL", status: "high" as const },
  { marker: "Cortisol (AM)", value: "18.5 \u00B5g/dL", range: "6-23 \u00B5g/dL", status: "normal" as const },
  { marker: "hs-CRP", value: "1.8 mg/L", range: "0-3 mg/L", status: "normal" as const },
];

const messages = [
  {
    id: 1,
    sender: "practitioner",
    text: "Hi Sarah, I\u2019ve reviewed your latest lab results. Your ferritin is a bit low \u2014 let\u2019s discuss iron supplementation at our next check-in.",
    time: "Mar 18, 10:22 AM",
  },
  {
    id: 2,
    sender: "patient",
    text: "Thanks Dr. Rivera! I\u2019ve been feeling more fatigued lately, could that be related?",
    time: "Mar 18, 11:05 AM",
  },
  {
    id: 3,
    sender: "practitioner",
    text: "Absolutely \u2014 low ferritin is one of the most common causes of fatigue, especially with your MTHFR variant. I\u2019m adding a gentle iron bisglycinate to your protocol.",
    time: "Mar 18, 11:30 AM",
  },
  {
    id: 4,
    sender: "patient",
    text: "That makes sense. Should I take it with my MTHFR+ in the morning or separately?",
    time: "Mar 18, 2:15 PM",
  },
  {
    id: 5,
    sender: "practitioner",
    text: "Take them separately \u2014 iron in the afternoon with vitamin C for best absorption. I\u2019ll update your protocol schedule.",
    time: "Mar 18, 2:45 PM",
  },
];

const assessmentDomains = [
  { domain: "Sleep", score: 72, icon: Moon, color: "bg-indigo-500" },
  { domain: "Nutrition", score: 85, icon: Utensils, color: "bg-portal-green" },
  { domain: "Exercise", score: 68, icon: Dumbbell, color: "bg-copper" },
  { domain: "Stress", score: 78, icon: Shield, color: "bg-portal-yellow" },
  { domain: "Cognition", score: 91, icon: Brain, color: "bg-portal-purple" },
  { domain: "Energy", score: 80, icon: Zap, color: "bg-portal-pink" },
];

const recentActivity = [
  { id: 1, action: "Lab results uploaded", detail: "Hormone panel \u2014 Quest Diagnostics", time: "Mar 18, 2026", icon: FileText },
  { id: 2, action: "Protocol updated", detail: "Added NAD+ to Methylation Protocol", time: "Mar 15, 2026", icon: Pill },
  { id: 3, action: "Appointment completed", detail: "30-min video consultation", time: "Mar 10, 2026", icon: Calendar },
  { id: 4, action: "Assessment completed", detail: "Vitality Score: 82/100", time: "Mar 7, 2026", icon: ClipboardList },
  { id: 5, action: "Genetic report generated", detail: "GENEX360 6-panel analysis", time: "Feb 28, 2026", icon: Dna },
];

const keyBiomarkers = [
  { name: "Vitamin D", value: 38, target: 60, unit: "ng/mL" },
  { name: "Homocysteine", value: 11.2, target: 8, unit: "\u00B5mol/L", inverse: true },
  { name: "Ferritin", value: 18, target: 50, unit: "ng/mL" },
  { name: "hs-CRP", value: 1.8, target: 1, unit: "mg/L", inverse: true },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function riskBadge(level: "low" | "moderate" | "high") {
  const map = {
    low: { variant: "active" as const, label: "Low Risk" },
    moderate: { variant: "warning" as const, label: "Moderate Risk" },
    high: { variant: "danger" as const, label: "High Risk" },
  };
  const { variant, label } = map[level];
  return <Badge variant={variant}>{label}</Badge>;
}

function labStatusBadge(status: "normal" | "low" | "high") {
  const map = {
    normal: { variant: "active" as const, label: "Normal" },
    low: { variant: "info" as const, label: "Low" },
    high: { variant: "danger" as const, label: "High" },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

function labStatusIcon(status: "normal" | "low" | "high") {
  switch (status) {
    case "normal":
      return <Minus className="w-3 h-3 text-portal-green" />;
    case "low":
      return <ArrowDownRight className="w-3 h-3 text-cyan-400" />;
    case "high":
      return <ArrowUpRight className="w-3 h-3 text-rose" />;
  }
}

// ─── Tab & Column Config ─────────────────────────────────────────────────────

const tabsList = [
  { value: "overview", label: "Overview" },
  { value: "genetics", label: "Genetics" },
  { value: "protocol", label: "Protocol" },
  { value: "labs", label: "Labs" },
  { value: "messages", label: "Messages" },
  { value: "assessment", label: "Assessment" },
];

const protocolColumns: Column<ProtocolRow>[] = [
  { key: "name", header: "Protocol", sortable: true },
  {
    key: "status",
    header: "Status",
    render: (row: ProtocolRow) => (
      <Badge variant={row.status === "Active" ? "active" : "neutral"}>
        {row.status}
      </Badge>
    ),
  },
  { key: "start", header: "Start Date", sortable: true },
  { key: "end", header: "End Date" },
  { key: "productsCount", header: "Products", sortable: true },
];

// ─── Page Component ──────────────────────────────────────────────────────────

export default function PatientDetailPage() {
  const params = useParams();
  void params.id; // patient ID from route
  const [messageInput, setMessageInput] = useState("");

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link
            href="/practitioner/patients"
            className="hover:text-white transition-colors"
          >
            Patients
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-white font-medium">
            {patient.firstName} {patient.lastName}
          </span>
        </nav>

        {/* Patient Header */}
        <Card hover={false} className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <Avatar
              src={patient.avatarUrl}
              fallback={`${patient.firstName[0]}${patient.lastName[0]}`}
              size="lg"
              className="!w-16 !h-16 !text-lg"
            />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-white">
                  {patient.firstName} {patient.lastName}
                </h1>
                <Badge variant={patient.consentStatus === "active" ? "active" : "warning"}>
                  {patient.consentStatus === "active" ? "Consent Active" : "Consent Pending"}
                </Badge>
                {riskBadge(patient.riskLevel)}
              </div>
              <p className="text-sm text-gray-400">{patient.email}</p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                <span>Age {patient.age}</span>
                <span className="w-px h-3 bg-white/10" />
                <span>DOB {patient.dateOfBirth}</span>
                <span className="w-px h-3 bg-white/10" />
                <span>{patient.gender}</span>
                <span className="w-px h-3 bg-white/10" />
                <span>{patient.membership} Member</span>
                <span className="w-px h-3 bg-white/10" />
                <span>{patient.viaTokens.toLocaleString()} ViaTokens</span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Button variant="secondary" size="md">
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Patient
              </Button>
              <Button
                size="md"
                className="!bg-portal-green hover:!bg-portal-green/90 !text-gray-900 !shadow-lg !shadow-portal-green/20 !from-portal-green !to-portal-green/80"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Protocol
              </Button>
            </div>
          </div>
        </Card>

        {/* Tabbed Interface */}
        <Tabs defaultValue="overview" tabs={tabsList}>
          {/* ── Tab 1: Overview ─────────────────────────────────────────── */}
          <TabContent value="overview" className="space-y-6 outline-none">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={Heart}
                label="Vitality Score"
                value="82/100"
                trend="up"
                trendLabel="+4 pts"
              />
              <StatCard
                icon={TrendingUp}
                label="Adherence Rate"
                value="78%"
                trend="up"
                trendLabel="+3%"
              />
              <StatCard
                icon={ClipboardList}
                label="Active Protocols"
                value={2}
              />
              <StatCard
                icon={Calendar}
                label="Days Since Last Visit"
                value={14}
              />
            </div>

            {/* Key Biomarkers */}
            <Card hover={false} className="p-6">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-portal-green" />
                Key Biomarkers
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {keyBiomarkers.map((bm) => {
                  const pct = bm.inverse
                    ? Math.max(
                        0,
                        Math.min(100, ((bm.target * 2 - bm.value) / (bm.target * 2)) * 100)
                      )
                    : Math.min(100, (bm.value / bm.target) * 100);
                  const color =
                    pct >= 80
                      ? "bg-portal-green"
                      : pct >= 50
                      ? "bg-portal-yellow"
                      : "bg-rose";
                  return (
                    <div key={bm.name} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-300">{bm.name}</span>
                        <span className="text-white font-medium">
                          {bm.value}{" "}
                          <span className="text-gray-500 text-xs">{bm.unit}</span>
                        </span>
                      </div>
                      <Progress value={pct} color={color} />
                      <p className="text-[11px] text-gray-600">
                        Target: {bm.target} {bm.unit}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Recent Activity */}
            <Card hover={false} className="p-6">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-copper" />
                Recent Activity
              </h3>
              <div className="space-y-0">
                {recentActivity.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      className={`flex items-start gap-4 py-3 ${
                        idx < recentActivity.length - 1
                          ? "border-b border-white/[0.04]"
                          : ""
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">{item.action}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>
                      </div>
                      <span className="text-[11px] text-gray-600 shrink-0">
                        {item.time}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabContent>

          {/* ── Tab 2: Genetics ─────────────────────────────────────────── */}
          <TabContent value="genetics" className="space-y-6 outline-none">
            <Card hover={false} className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Dna className="w-4 h-4 text-portal-purple" />
                  Gene Panel Summary — GENEX360
                </h3>
                <Button variant="secondary" size="sm">
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  Full Genetic Report
                </Button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-portal-purple/20">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-portal-purple/10 bg-portal-purple/[0.04]">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-portal-purple uppercase tracking-wider">
                        Gene
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-portal-purple uppercase tracking-wider">
                        Variant
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-portal-purple uppercase tracking-wider">
                        Genotype
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-portal-purple uppercase tracking-wider">
                        Risk
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-portal-purple uppercase tracking-wider">
                        Clinical Significance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {genePanel.map((gene, idx) => (
                      <tr
                        key={gene.gene}
                        className={`${
                          idx < genePanel.length - 1
                            ? "border-b border-white/[0.04]"
                            : ""
                        } hover:bg-portal-purple/[0.02] transition-colors`}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-portal-purple">
                            {gene.gene}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-300 font-mono text-xs">
                          {gene.variant}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-portal-purple/10 text-portal-purple text-xs font-mono font-semibold border border-portal-purple/20">
                            {gene.genotype}
                          </span>
                        </td>
                        <td className="px-4 py-3">{riskBadge(gene.riskLevel)}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs max-w-xs">
                          {gene.significance}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabContent>

          {/* ── Tab 3: Protocol ─────────────────────────────────────────── */}
          <TabContent value="protocol" className="space-y-6 outline-none">
            {/* Current Active Protocol */}
            <Card hover={false} className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Pill className="w-4 h-4 text-portal-pink" />
                    {currentProtocol.name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>Started {currentProtocol.startDate}</span>
                    <Badge variant="active">Active</Badge>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                {currentProtocol.supplements.map((supp) => (
                  <div
                    key={supp.name}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-portal-pink/10 flex items-center justify-center shrink-0">
                        <Pill className="w-4 h-4 text-portal-pink" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{supp.name}</p>
                        <p className="text-xs text-gray-500">
                          {supp.dose} &middot; {supp.frequency} &middot; {supp.timeOfDay}
                        </p>
                      </div>
                    </div>
                    <div className="sm:w-48 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Adherence</span>
                        <span
                          className={`font-semibold ${
                            supp.adherence >= 85
                              ? "text-portal-green"
                              : supp.adherence >= 70
                              ? "text-portal-yellow"
                              : "text-rose"
                          }`}
                        >
                          {supp.adherence}%
                        </span>
                      </div>
                      <Progress
                        value={supp.adherence}
                        color={
                          supp.adherence >= 85
                            ? "bg-portal-green"
                            : supp.adherence >= 70
                            ? "bg-portal-yellow"
                            : "bg-rose"
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Protocol History */}
            <Card hover={false} className="p-6">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-gray-400" />
                Protocol History
              </h3>
              <DataTable<ProtocolRow>
                columns={protocolColumns}
                data={protocolHistory}
                pageSize={5}
              />
            </Card>
          </TabContent>

          {/* ── Tab 4: Labs ─────────────────────────────────────────────── */}
          <TabContent value="labs" className="space-y-6 outline-none">
            <Card hover={false} className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-portal-green" />
                  Recent Lab Results — Hormone Panel
                </h3>
                <Button variant="secondary" size="sm">
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Upload Lab Results
                </Button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Marker
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Value
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Reference Range
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {labResults.map((lab, idx) => (
                      <tr
                        key={lab.marker}
                        className={`${
                          idx < labResults.length - 1
                            ? "border-b border-white/[0.04]"
                            : ""
                        } hover:bg-white/[0.02] transition-colors`}
                      >
                        <td className="px-4 py-3 text-gray-300 font-medium">
                          {lab.marker}
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-2 text-white font-mono text-xs">
                            {labStatusIcon(lab.status)}
                            {lab.value}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{lab.range}</td>
                        <td className="px-4 py-3">{labStatusBadge(lab.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Lab History Timeline */}
            <Card hover={false} className="p-6">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                Lab History
              </h3>
              <div className="space-y-0">
                {[
                  { date: "Mar 18, 2026", label: "Hormone Panel", provider: "Quest Diagnostics", markers: 8 },
                  { date: "Jan 05, 2026", label: "Comprehensive Metabolic Panel", provider: "LabCorp", markers: 14 },
                  { date: "Oct 20, 2025", label: "Vitamin & Mineral Panel", provider: "Quest Diagnostics", markers: 10 },
                  { date: "Jul 12, 2025", label: "Baseline Blood Panel", provider: "LabCorp", markers: 22 },
                ].map((entry, idx, arr) => (
                  <div
                    key={entry.date}
                    className={`flex items-center gap-4 py-3 ${
                      idx < arr.length - 1 ? "border-b border-white/[0.04]" : ""
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full bg-portal-green shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{entry.label}</p>
                      <p className="text-xs text-gray-500">
                        {entry.provider} &middot; {entry.markers} markers
                      </p>
                    </div>
                    <span className="text-[11px] text-gray-600 shrink-0">
                      {entry.date}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </TabContent>

          {/* ── Tab 5: Messages ─────────────────────────────────────────── */}
          <TabContent value="messages" className="space-y-4 outline-none">
            <Card hover={false} className="p-6 flex flex-col" style={{ minHeight: 480 }}>
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Send className="w-4 h-4 text-portal-green" />
                Secure Messages
              </h3>

              {/* Message History */}
              <div className="flex-1 space-y-3 overflow-y-auto mb-4 pr-1">
                {messages.map((msg) => {
                  const isSent = msg.sender === "practitioner";
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isSent ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-3 space-y-1 ${
                          isSent
                            ? "bg-portal-green/10 border border-portal-green/20 rounded-br-md"
                            : "bg-dark-surface border border-dark-border rounded-bl-md"
                        }`}
                      >
                        <p className="text-sm text-gray-200 leading-relaxed">
                          {msg.text}
                        </p>
                        <p
                          className={`text-[10px] ${
                            isSent ? "text-portal-green/60" : "text-gray-600"
                          }`}
                        >
                          {msg.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input Area */}
              <div className="flex items-center gap-3 pt-3 border-t border-white/[0.06]">
                <div className="flex-1">
                  <Input
                    placeholder="Type a secure message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                  />
                </div>
                <Button
                  size="md"
                  className="!bg-portal-green hover:!bg-portal-green/90 !text-gray-900 !shadow-none !from-portal-green !to-portal-green/80 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </TabContent>

          {/* ── Tab 6: Assessment ───────────────────────────────────────── */}
          <TabContent value="assessment" className="space-y-6 outline-none">
            {/* Overall Vitality Score */}
            <Card hover={false} className="p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative w-28 h-28 shrink-0">
                  <svg
                    className="w-28 h-28 -rotate-90"
                    viewBox="0 0 120 120"
                  >
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="rgba(255,255,255,0.04)"
                      strokeWidth="10"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="#4ADE80"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${
                        (82 / 100) * 2 * Math.PI * 52
                      } ${2 * Math.PI * 52}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-white">82</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                      / 100
                    </span>
                  </div>
                </div>
                <div className="flex-1 text-center sm:text-left space-y-2">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 justify-center sm:justify-start">
                    <Heart className="w-5 h-5 text-portal-green" />
                    Overall Vitality Score
                  </h3>
                  <p className="text-sm text-gray-400">
                    Based on the latest clinical assessment questionnaire
                    completed on{" "}
                    <span className="text-gray-300">March 7, 2026</span>.
                  </p>
                  <div className="flex items-center gap-3 justify-center sm:justify-start">
                    <Badge variant="active">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Good
                    </Badge>
                    <Badge variant="warning">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      2 areas need attention
                    </Badge>
                  </div>
                </div>
                <div className="shrink-0">
                  <Button variant="secondary" size="md">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Request New Assessment
                  </Button>
                </div>
              </div>
            </Card>

            {/* Domain Breakdown */}
            <Card hover={false} className="p-6">
              <h3 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
                <Brain className="w-4 h-4 text-portal-purple" />
                Vitality Breakdown by Domain
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {assessmentDomains.map((d) => {
                  const DomainIcon = d.icon;
                  return (
                    <div
                      key={d.domain}
                      className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-md bg-white/[0.04] flex items-center justify-center">
                            <DomainIcon className="w-3.5 h-3.5 text-gray-300" />
                          </div>
                          <span className="text-sm font-medium text-gray-300">
                            {d.domain}
                          </span>
                        </div>
                        <span
                          className={`text-lg font-bold ${
                            d.score >= 80
                              ? "text-portal-green"
                              : d.score >= 65
                              ? "text-portal-yellow"
                              : "text-rose"
                          }`}
                        >
                          {d.score}
                        </span>
                      </div>
                      <Progress
                        value={d.score}
                        color={
                          d.score >= 80
                            ? "bg-portal-green"
                            : d.score >= 65
                            ? "bg-portal-yellow"
                            : "bg-rose"
                        }
                      />
                      <p className="text-[11px] text-gray-600 text-right">
                        {d.score}/100
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabContent>
        </Tabs>
      </div>
    </div>
  );
}
