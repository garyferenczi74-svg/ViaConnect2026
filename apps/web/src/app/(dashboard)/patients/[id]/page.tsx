"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  Heart,
  Pill,
  AlertCircle,
  Activity,
  Dna,
  FileText,
  ClipboardList,
  FlaskConical,
  StickyNote,
  Plus,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  CheckCircle2,
  XCircle,
  BarChart3,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// ---------------------------------------------------------------------------
// Mock patient database
// ---------------------------------------------------------------------------

interface MockPatient {
  id: string
  firstName: string
  lastName: string
  dob: string
  gender: "Male" | "Female" | "Other"
  mrn: string
  email: string
  phone: string
  address: string
  conditions: string[]
  medications: Array<{ name: string; dosage: string; frequency: string }>
  supplements: Array<{ name: string; dosage: string; frequency: string }>
  allergies: string[]
  vitals: {
    bp: string
    hr: string
    weight: string
    bmi: string
    date: string
  }
  geneXStatus: "Complete" | "Pending" | "Not Ordered"
  snps: Array<{
    gene: string
    variant: string
    rsid: string
    genotype: string
    phenotype: string
    significance: "pathogenic" | "likely_pathogenic" | "uncertain" | "likely_benign" | "benign"
  }>
  pathwayScores: Array<{
    pathway: string
    score: number
    risk: "Low" | "Moderate" | "High" | "Critical"
    summary: string
  }>
  protocols: Array<{
    id: string
    title: string
    pathway: string
    status: "active" | "completed" | "draft"
    startDate: string
    endDate: string | null
    progress: number
  }>
  labs: Array<{
    test: string
    result: string
    unit: string
    range: string
    flag: "normal" | "high" | "low" | "critical"
    date: string
  }>
  notes: Array<{
    id: string
    date: string
    author: string
    type: string
    content: string
  }>
}

const PATIENT_DB: Record<string, MockPatient> = {
  "pt-001": {
    id: "pt-001",
    firstName: "Maria",
    lastName: "Gonzalez",
    dob: "1985-04-12",
    gender: "Female",
    mrn: "MRN-2024-00147",
    email: "maria.gonzalez@email.com",
    phone: "(415) 555-0182",
    address: "742 Evergreen Ave, San Francisco, CA 94110",
    conditions: ["MTHFR C677T homozygous", "Methylation disorder", "Folate deficiency", "Chronic fatigue"],
    medications: [
      { name: "Levothyroxine", dosage: "50 mcg", frequency: "Once daily" },
    ],
    supplements: [
      { name: "L-Methylfolate", dosage: "15 mg", frequency: "Once daily" },
      { name: "Methylcobalamin (B12)", dosage: "5,000 mcg", frequency: "Once daily" },
      { name: "Riboflavin (B2)", dosage: "400 mg", frequency: "Once daily" },
      { name: "Magnesium Glycinate", dosage: "400 mg", frequency: "Twice daily" },
    ],
    allergies: ["Penicillin", "Sulfa drugs"],
    vitals: { bp: "118/76", hr: "72", weight: "143 lbs", bmi: "24.1", date: "2026-03-10" },
    geneXStatus: "Complete",
    snps: [
      { gene: "MTHFR", variant: "C677T", rsid: "rs1801133", genotype: "T/T", phenotype: "Reduced enzyme activity (~30%)", significance: "pathogenic" },
      { gene: "MTHFR", variant: "A1298C", rsid: "rs1801131", genotype: "A/C", phenotype: "Mildly reduced activity", significance: "likely_benign" },
      { gene: "COMT", variant: "Val158Met", rsid: "rs4680", genotype: "A/G", phenotype: "Intermediate catechol metabolism", significance: "uncertain" },
      { gene: "CYP2D6", variant: "*4/*1", rsid: "rs3892097", genotype: "G/A", phenotype: "Intermediate metabolizer", significance: "likely_pathogenic" },
      { gene: "VDR", variant: "Taq1", rsid: "rs731236", genotype: "T/C", phenotype: "Reduced vitamin D receptor expression", significance: "uncertain" },
      { gene: "APOE", variant: "e3/e3", rsid: "rs429358", genotype: "T/T", phenotype: "Normal lipid metabolism", significance: "benign" },
      { gene: "FTO", variant: "rs9939609", rsid: "rs9939609", genotype: "A/T", phenotype: "Moderate obesity risk increase", significance: "uncertain" },
    ],
    pathwayScores: [
      { pathway: "Methylation", score: 82, risk: "High", summary: "Significantly impaired folate metabolism due to homozygous MTHFR C677T. Requires active folate supplementation." },
      { pathway: "Detoxification", score: 45, risk: "Moderate", summary: "Intermediate phase II detoxification capacity. Consider glutathione support." },
      { pathway: "Neurotransmitter", score: 38, risk: "Moderate", summary: "COMT heterozygous status indicates intermediate catecholamine metabolism." },
      { pathway: "Cardiovascular", score: 22, risk: "Low", summary: "APOE e3/e3 normal variant. Monitor homocysteine given MTHFR status." },
      { pathway: "Inflammation", score: 55, risk: "Moderate", summary: "Moderate inflammatory pathway activation. Omega-3 and curcumin may be beneficial." },
      { pathway: "Mitochondrial", score: 30, risk: "Low", summary: "Adequate mitochondrial function markers. CoQ10 support recommended for fatigue." },
    ],
    protocols: [
      { id: "prot-001", title: "Methylation Optimization Protocol", pathway: "Methylation", status: "active", startDate: "2026-01-15", endDate: "2026-04-15", progress: 65 },
      { id: "prot-002", title: "Fatigue Recovery Program", pathway: "Mitochondrial", status: "active", startDate: "2026-02-01", endDate: "2026-05-01", progress: 40 },
      { id: "prot-003", title: "Phase II Detoxification Support", pathway: "Detoxification", status: "completed", startDate: "2025-09-01", endDate: "2025-12-01", progress: 100 },
    ],
    labs: [
      { test: "Homocysteine", result: "8.2", unit: "umol/L", range: "5.0-15.0", flag: "normal", date: "2026-03-10" },
      { test: "Methylmalonic Acid", result: "0.18", unit: "umol/L", range: "0.07-0.27", flag: "normal", date: "2026-03-10" },
      { test: "Serum Folate", result: "22.4", unit: "ng/mL", range: "3.0-17.0", flag: "high", date: "2026-03-10" },
      { test: "Vitamin B12", result: "892", unit: "pg/mL", range: "200-900", flag: "normal", date: "2026-03-10" },
      { test: "Vitamin D, 25-OH", result: "38", unit: "ng/mL", range: "30-100", flag: "normal", date: "2026-03-10" },
      { test: "Ferritin", result: "42", unit: "ng/mL", range: "12-150", flag: "normal", date: "2026-03-10" },
      { test: "TSH", result: "2.8", unit: "mIU/L", range: "0.4-4.0", flag: "normal", date: "2026-03-10" },
      { test: "hs-CRP", result: "2.4", unit: "mg/L", range: "0.0-3.0", flag: "normal", date: "2026-03-10" },
    ],
    notes: [
      { id: "n-001", date: "2026-03-10", author: "Dr. Sarah Mitchell, ND", type: "Follow-up Visit", content: "Patient reports improved energy levels after 8 weeks on methylation protocol. Homocysteine normalized at 8.2. Continue current supplement regimen. Folate levels elevated as expected with L-methylfolate supplementation. Recommend follow-up labs in 6 weeks." },
      { id: "n-002", date: "2026-02-01", author: "Dr. Sarah Mitchell, ND", type: "Protocol Initiation", content: "Initiated fatigue recovery program targeting mitochondrial support. Added CoQ10 200mg daily and PQQ 20mg daily. Patient educated on dietary modifications including increased cruciferous vegetable intake for detoxification support." },
      { id: "n-003", date: "2026-01-15", author: "Dr. Sarah Mitchell, ND", type: "Genomic Review", content: "Reviewed GeneX360 panel results with patient. Discussed MTHFR C677T homozygous finding and clinical implications. Started methylation optimization protocol with L-methylfolate 15mg, methylcobalamin 5000mcg, riboflavin 400mg. Baseline homocysteine was 14.8 umol/L." },
      { id: "n-004", date: "2025-12-15", author: "Dr. James Chen, MD", type: "Referral Note", content: "Patient referred for functional medicine evaluation of chronic fatigue and suspected methylation disorder. Previous workup unremarkable except borderline elevated homocysteine. Recommend comprehensive genomic panel." },
    ],
  },
}

// ---------------------------------------------------------------------------
// Generate a default patient from the ID
// ---------------------------------------------------------------------------

function getDefaultPatient(id: string): MockPatient {
  return {
    id,
    firstName: "Test",
    lastName: "Patient",
    dob: "1990-06-15",
    gender: "Female",
    mrn: `MRN-2024-${id.replace(/\D/g, "").padStart(5, "0")}`,
    email: "test.patient@email.com",
    phone: "(555) 000-0000",
    address: "100 Main St, Anytown, CA 90210",
    conditions: ["Hypothyroidism", "Vitamin D deficiency"],
    medications: [
      { name: "Levothyroxine", dosage: "75 mcg", frequency: "Once daily" },
    ],
    supplements: [
      { name: "Vitamin D3", dosage: "5,000 IU", frequency: "Once daily" },
      { name: "Omega-3 Fish Oil", dosage: "2,000 mg", frequency: "Once daily" },
    ],
    allergies: ["None known"],
    vitals: { bp: "122/78", hr: "68", weight: "155 lbs", bmi: "25.3", date: "2026-03-01" },
    geneXStatus: "Pending",
    snps: [
      { gene: "MTHFR", variant: "C677T", rsid: "rs1801133", genotype: "C/T", phenotype: "Mildly reduced enzyme activity (~65%)", significance: "likely_pathogenic" },
      { gene: "COMT", variant: "Val158Met", rsid: "rs4680", genotype: "G/G", phenotype: "Fast catechol metabolism (Val/Val)", significance: "benign" },
      { gene: "CYP2D6", variant: "*1/*1", rsid: "rs3892097", genotype: "G/G", phenotype: "Normal (extensive) metabolizer", significance: "benign" },
      { gene: "VDR", variant: "Fok1", rsid: "rs2228570", genotype: "C/T", phenotype: "Intermediate vitamin D receptor activity", significance: "uncertain" },
      { gene: "APOE", variant: "e3/e4", rsid: "rs429358", genotype: "T/C", phenotype: "Elevated cardiovascular & Alzheimer risk", significance: "likely_pathogenic" },
      { gene: "FTO", variant: "rs9939609", rsid: "rs9939609", genotype: "A/A", phenotype: "Increased obesity risk", significance: "likely_pathogenic" },
    ],
    pathwayScores: [
      { pathway: "Methylation", score: 48, risk: "Moderate", summary: "Heterozygous MTHFR C677T with mildly reduced folate metabolism." },
      { pathway: "Detoxification", score: 25, risk: "Low", summary: "Adequate detoxification capacity." },
      { pathway: "Cardiovascular", score: 62, risk: "High", summary: "APOE e3/e4 carrier with elevated lipid risk." },
      { pathway: "Inflammation", score: 35, risk: "Low", summary: "Low inflammatory marker profile." },
      { pathway: "Neurotransmitter", score: 20, risk: "Low", summary: "Normal catecholamine metabolism." },
      { pathway: "Mitochondrial", score: 40, risk: "Moderate", summary: "Mild mitochondrial stress markers." },
    ],
    protocols: [
      { id: "prot-d01", title: "Thyroid Optimization Protocol", pathway: "Hormonal", status: "active", startDate: "2026-02-10", endDate: "2026-05-10", progress: 35 },
      { id: "prot-d02", title: "Cardiovascular Risk Mitigation", pathway: "Cardiovascular", status: "draft", startDate: "2026-03-20", endDate: null, progress: 0 },
    ],
    labs: [
      { test: "TSH", result: "5.2", unit: "mIU/L", range: "0.4-4.0", flag: "high", date: "2026-03-01" },
      { test: "Free T4", result: "0.9", unit: "ng/dL", range: "0.8-1.8", flag: "normal", date: "2026-03-01" },
      { test: "Vitamin D, 25-OH", result: "22", unit: "ng/mL", range: "30-100", flag: "low", date: "2026-03-01" },
      { test: "Total Cholesterol", result: "238", unit: "mg/dL", range: "125-200", flag: "high", date: "2026-03-01" },
      { test: "LDL", result: "152", unit: "mg/dL", range: "0-100", flag: "high", date: "2026-03-01" },
      { test: "HDL", result: "54", unit: "mg/dL", range: "40-60", flag: "normal", date: "2026-03-01" },
      { test: "hs-CRP", result: "1.2", unit: "mg/L", range: "0.0-3.0", flag: "normal", date: "2026-03-01" },
      { test: "HbA1c", result: "5.4", unit: "%", range: "4.0-5.6", flag: "normal", date: "2026-03-01" },
    ],
    notes: [
      { id: "n-d01", date: "2026-03-01", author: "Dr. Sarah Mitchell, ND", type: "Initial Evaluation", content: "New patient presenting with fatigue and cold intolerance. TSH mildly elevated at 5.2. Vitamin D insufficient at 22 ng/mL. Started vitamin D3 5,000 IU daily. Ordered GeneX360 panel for comprehensive genomic evaluation. Lipid panel concerning for APOE-related dyslipidemia." },
      { id: "n-d02", date: "2026-02-10", author: "Dr. Sarah Mitchell, ND", type: "Protocol Initiation", content: "Initiated thyroid optimization protocol. Continue current levothyroxine 75mcg. Added selenium 200mcg and zinc 30mg daily for thyroid support. Dietary guidance: increase iodine-rich foods, reduce goitrogenic vegetables when raw." },
    ],
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculateAge(dob: string): number {
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function getInitials(first: string, last: string): string {
  return `${first[0]}${last[0]}`
}

function significanceBadge(sig: string) {
  switch (sig) {
    case "pathogenic":
      return <Badge variant="destructive">Pathogenic</Badge>
    case "likely_pathogenic":
      return <Badge className="border-transparent bg-orange-100 text-orange-800">Likely Pathogenic</Badge>
    case "uncertain":
      return <Badge variant="warning">VUS</Badge>
    case "likely_benign":
      return <Badge variant="info">Likely Benign</Badge>
    case "benign":
      return <Badge variant="success">Benign</Badge>
    default:
      return <Badge variant="secondary">{sig}</Badge>
  }
}

function riskBadge(risk: string) {
  switch (risk) {
    case "Critical":
      return <Badge variant="destructive">Critical</Badge>
    case "High":
      return <Badge className="border-transparent bg-orange-100 text-orange-800">High Risk</Badge>
    case "Moderate":
      return <Badge variant="warning">Moderate</Badge>
    case "Low":
      return <Badge variant="success">Low Risk</Badge>
    default:
      return <Badge variant="secondary">{risk}</Badge>
  }
}

function riskScoreColor(score: number): string {
  if (score >= 70) return "text-red-600"
  if (score >= 50) return "text-orange-500"
  if (score >= 30) return "text-amber-500"
  return "text-emerald-600"
}

function riskBarColor(score: number): string {
  if (score >= 70) return "bg-red-500"
  if (score >= 50) return "bg-orange-500"
  if (score >= 30) return "bg-amber-400"
  return "bg-emerald-500"
}

function labFlagBadge(flag: string) {
  switch (flag) {
    case "high":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
          <TrendingUp className="h-3 w-3" /> High
        </span>
      )
    case "low":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600">
          <TrendingDown className="h-3 w-3" /> Low
        </span>
      )
    case "critical":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 font-bold">
          <AlertCircle className="h-3 w-3" /> Critical
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
          <Minus className="h-3 w-3" /> Normal
        </span>
      )
  }
}

function protocolStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge variant="success">Active</Badge>
    case "completed":
      return <Badge variant="secondary">Completed</Badge>
    case "draft":
      return <Badge variant="info">Draft</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

// ---------------------------------------------------------------------------
// Tab: Overview
// ---------------------------------------------------------------------------

function OverviewTab({ patient }: { patient: MockPatient }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Demographics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-emerald-600" />
            Demographics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Date of Birth</dt>
              <dd className="font-medium text-gray-900">{formatDate(patient.dob)}</dd>
            </div>
            <Separator />
            <div className="flex justify-between">
              <dt className="text-gray-500">Gender</dt>
              <dd className="font-medium text-gray-900">{patient.gender}</dd>
            </div>
            <Separator />
            <div className="flex justify-between">
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium text-gray-900">{patient.email}</dd>
            </div>
            <Separator />
            <div className="flex justify-between">
              <dt className="text-gray-500">Phone</dt>
              <dd className="font-medium text-gray-900">{patient.phone}</dd>
            </div>
            <Separator />
            <div className="flex justify-between">
              <dt className="text-gray-500">Address</dt>
              <dd className="font-medium text-gray-900 text-right max-w-[220px]">{patient.address}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Recent Vitals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-emerald-600" />
            Recent Vitals
          </CardTitle>
          <CardDescription>Recorded {formatDate(patient.vitals.date)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-gray-100 p-3 text-center">
              <p className="text-xs text-gray-500">Blood Pressure</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{patient.vitals.bp}</p>
              <p className="text-xs text-gray-400">mmHg</p>
            </div>
            <div className="rounded-lg border border-gray-100 p-3 text-center">
              <p className="text-xs text-gray-500">Heart Rate</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{patient.vitals.hr}</p>
              <p className="text-xs text-gray-400">bpm</p>
            </div>
            <div className="rounded-lg border border-gray-100 p-3 text-center">
              <p className="text-xs text-gray-500">Weight</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{patient.vitals.weight}</p>
            </div>
            <div className="rounded-lg border border-gray-100 p-3 text-center">
              <p className="text-xs text-gray-500">BMI</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{patient.vitals.bmi}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Conditions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="h-4 w-4 text-emerald-600" />
            Active Conditions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {patient.conditions.map((c) => (
              <li key={c} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                {c}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Allergies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-4 w-4 text-red-500" />
            Allergies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {patient.allergies.map((a) => (
              <Badge key={a} variant="destructive" className="text-xs">
                {a}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Medications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Pill className="h-4 w-4 text-emerald-600" />
            Current Medications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {patient.medications.map((m) => (
              <li key={m.name} className="flex items-start justify-between text-sm">
                <div>
                  <p className="font-medium text-gray-900">{m.name}</p>
                  <p className="text-xs text-gray-500">{m.frequency}</p>
                </div>
                <Badge variant="outline" className="text-xs">{m.dosage}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Current Supplements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="h-4 w-4 text-emerald-600" />
            Current Supplements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {patient.supplements.map((s) => (
              <li key={s.name} className="flex items-start justify-between text-sm">
                <div>
                  <p className="font-medium text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.frequency}</p>
                </div>
                <Badge variant="outline" className="text-xs">{s.dosage}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: Genomics
// ---------------------------------------------------------------------------

function GenomicsTab({ patient }: { patient: MockPatient }) {
  return (
    <div className="space-y-6">
      {/* GeneX360 Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <Dna className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base">GeneX360 Comprehensive Panel</CardTitle>
                <CardDescription>Provider: ViaGene Diagnostics</CardDescription>
              </div>
            </div>
            <Badge
              variant={
                patient.geneXStatus === "Complete"
                  ? "success"
                  : patient.geneXStatus === "Pending"
                    ? "warning"
                    : "secondary"
              }
            >
              {patient.geneXStatus}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Variants Analyzed</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{patient.snps.length}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Pathways Scored</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{patient.pathwayScores.length}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Actionable Findings</p>
              <p className="mt-1 text-lg font-bold text-gray-900">
                {patient.snps.filter((s) => s.significance === "pathogenic" || s.significance === "likely_pathogenic").length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key SNP Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Key SNP Results</CardTitle>
          <CardDescription>Clinically relevant genetic variants</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gene</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead>Genotype</TableHead>
                <TableHead className="hidden md:table-cell">Phenotype</TableHead>
                <TableHead>Clinical Significance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patient.snps.map((snp) => (
                <TableRow key={snp.rsid}>
                  <TableCell className="font-medium text-gray-900">{snp.gene}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{snp.variant}</p>
                      <p className="text-xs text-gray-400">{snp.rsid}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono font-semibold">
                      {snp.genotype}
                    </code>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-gray-600 max-w-[240px]">
                    {snp.phenotype}
                  </TableCell>
                  <TableCell>{significanceBadge(snp.significance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pathway Risk Scores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clinical Pathway Risk Scores</CardTitle>
          <CardDescription>Aggregated risk assessment across metabolic pathways</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {patient.pathwayScores.map((ps) => (
              <div key={ps.pathway} className="rounded-lg border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-900">{ps.pathway}</h4>
                  {riskBadge(ps.risk)}
                </div>
                <div className="flex items-end gap-2 mb-2">
                  <span className={`text-2xl font-bold ${riskScoreColor(ps.score)}`}>
                    {ps.score}
                  </span>
                  <span className="text-xs text-gray-400 mb-1">/ 100</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100 mb-3">
                  <div
                    className={`h-1.5 rounded-full ${riskBarColor(ps.score)}`}
                    style={{ width: `${ps.score}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{ps.summary}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: Protocols
// ---------------------------------------------------------------------------

function ProtocolsTab({ patient }: { patient: MockPatient }) {
  const active = patient.protocols.filter((p) => p.status === "active")
  const history = patient.protocols.filter((p) => p.status !== "active")

  return (
    <div className="space-y-6">
      {/* Active Protocols */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-emerald-600" />
            Active Protocols
          </CardTitle>
          <Button size="sm">
            <Plus className="h-4 w-4" />
            New Protocol
          </Button>
        </CardHeader>
        <CardContent>
          {active.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No active protocols.</p>
          ) : (
            <div className="space-y-4">
              {active.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border border-gray-100 p-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">{p.title}</h4>
                      <p className="text-xs text-gray-500">{p.pathway} pathway</p>
                    </div>
                    {protocolStatusBadge(p.status)}
                  </div>
                  <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(p.startDate)}
                    </span>
                    {p.endDate && (
                      <>
                        <ChevronRight className="h-3 w-3" />
                        <span>{formatDate(p.endDate)}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 flex-1 rounded-full bg-gray-100">
                      <div
                        className="h-1.5 rounded-full bg-emerald-500"
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600">{p.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Protocol History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-gray-400" />
            Protocol History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No previous protocols.</p>
          ) : (
            <div className="space-y-3">
              {history.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-4"
                >
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{p.title}</h4>
                    <p className="text-xs text-gray-500">
                      {p.pathway} &bull; {formatDate(p.startDate)}
                      {p.endDate ? ` - ${formatDate(p.endDate)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {protocolStatusBadge(p.status)}
                    {p.status === "completed" && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: Labs
// ---------------------------------------------------------------------------

function LabsTab({ patient }: { patient: MockPatient }) {
  return (
    <div className="space-y-6">
      {/* Recent Lab Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="h-4 w-4 text-emerald-600" />
            Recent Lab Results
          </CardTitle>
          <CardDescription>
            Last drawn: {patient.labs.length > 0 && patient.labs[0] ? formatDate(patient.labs[0].date) : "N/A"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test</TableHead>
                <TableHead>Result</TableHead>
                <TableHead className="hidden sm:table-cell">Reference Range</TableHead>
                <TableHead>Flag</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patient.labs.map((lab) => (
                <TableRow key={lab.test}>
                  <TableCell className="font-medium text-gray-900">{lab.test}</TableCell>
                  <TableCell>
                    <span
                      className={`font-mono text-sm font-semibold ${
                        lab.flag === "high" || lab.flag === "critical"
                          ? "text-red-600"
                          : lab.flag === "low"
                            ? "text-blue-600"
                            : "text-gray-900"
                      }`}
                    >
                      {lab.result}
                    </span>
                    <span className="ml-1 text-xs text-gray-400">{lab.unit}</span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-gray-500">
                    {lab.range} {lab.unit}
                  </TableCell>
                  <TableCell>{labFlagBadge(lab.flag)}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-gray-500">
                    {formatDate(lab.date)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Trend Charts Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-emerald-600" />
            Lab Trends
          </CardTitle>
          <CardDescription>Track biomarker changes over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/50">
            <div className="text-center">
              <BarChart3 className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">Trend charts will appear here</p>
              <p className="text-xs text-gray-400">Requires 2+ lab results for comparison</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: Notes
// ---------------------------------------------------------------------------

function NotesTab({ patient }: { patient: MockPatient }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Clinical Notes ({patient.notes.length})
        </h3>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Add Note
        </Button>
      </div>

      <div className="space-y-4">
        {patient.notes.map((note) => (
          <Card key={note.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm">{note.type}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <StickyNote className="h-3 w-3" />
                    {note.author}
                  </CardDescription>
                </div>
                <span className="text-xs text-gray-400">{formatDate(note.date)}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-gray-600">{note.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function PatientDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [activeTab, setActiveTab] = useState("overview")

  const patient = PATIENT_DB[id] ?? getDefaultPatient(id)

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/patients">
        <Button variant="ghost" size="sm" className="gap-1 text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" />
          Back to Patients
        </Button>
      </Link>

      {/* Patient Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="text-lg">
                  {getInitials(patient.firstName, patient.lastName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {patient.firstName} {patient.lastName}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(patient.dob)} ({calculateAge(patient.dob)} yrs)
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {patient.gender}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    {patient.mrn}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  patient.geneXStatus === "Complete"
                    ? "success"
                    : patient.geneXStatus === "Pending"
                      ? "warning"
                      : "secondary"
                }
              >
                GeneX360: {patient.geneXStatus}
              </Badge>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {patient.email}
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              {patient.phone}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {patient.address}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="genomics" className="gap-1.5">
            <Dna className="h-3.5 w-3.5" />
            Genomics
          </TabsTrigger>
          <TabsTrigger value="protocols" className="gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            Protocols
          </TabsTrigger>
          <TabsTrigger value="labs" className="gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" />
            Labs
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5">
            <StickyNote className="h-3.5 w-3.5" />
            Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab patient={patient} />
        </TabsContent>

        <TabsContent value="genomics">
          <GenomicsTab patient={patient} />
        </TabsContent>

        <TabsContent value="protocols">
          <ProtocolsTab patient={patient} />
        </TabsContent>

        <TabsContent value="labs">
          <LabsTab patient={patient} />
        </TabsContent>

        <TabsContent value="notes">
          <NotesTab patient={patient} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
