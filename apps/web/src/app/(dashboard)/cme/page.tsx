"use client"

import { useState } from "react"
import {
  GraduationCap,
  Award,
  Clock,
  BookOpen,
  Play,
  Download,
  CheckCircle2,
  Star,
  Calendar,
  Target,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { StatCard } from "@/components/ui/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"

// ─── Mock Data ───────────────────────────────────────────────────────────────

const availableCourses = [
  {
    id: "1",
    title: "Pharmacogenomics in Clinical Practice",
    instructor: "Dr. Sarah Chen",
    credits: 4.0,
    duration: "6 hours",
    difficulty: "Advanced",
    category: "Pharmacogenomics",
    description:
      "Comprehensive review of pharmacogenomic testing and its impact on drug selection, dosing, and adverse event prevention in clinical settings.",
  },
  {
    id: "2",
    title: "Advanced Nutrigenomics",
    instructor: "Dr. Michael Torres",
    credits: 3.5,
    duration: "5 hours",
    difficulty: "Advanced",
    category: "Nutrigenomics",
    description:
      "Deep dive into gene-nutrient interactions, SNP-based supplementation strategies, and personalized nutrition protocols.",
  },
  {
    id: "3",
    title: "Drug-Supplement Interactions Update 2026",
    instructor: "Dr. Lisa Park",
    credits: 2.0,
    duration: "3 hours",
    difficulty: "Intermediate",
    category: "Drug Interactions",
    description:
      "Updated guidelines on clinically significant drug-supplement interactions, including new research on NAC, berberine, and curcumin interactions.",
  },
  {
    id: "4",
    title: "Epigenetics & Biological Age",
    instructor: "Dr. James Wright",
    credits: 3.0,
    duration: "4.5 hours",
    difficulty: "Advanced",
    category: "Epigenetics",
    description:
      "Exploring DNA methylation clocks, epigenetic biomarkers, and interventions that influence biological aging pathways.",
  },
  {
    id: "5",
    title: "MTHFR & Methylation Protocols",
    instructor: "Dr. Amy Rodriguez",
    credits: 2.5,
    duration: "3.5 hours",
    difficulty: "Intermediate",
    category: "Methylation",
    description:
      "Evidence-based methylation support protocols for MTHFR C677T and A1298C variants, including folate pathway optimization.",
  },
  {
    id: "6",
    title: "Clinical Applications of PeptideIQ",
    instructor: "Dr. Robert Kim",
    credits: 3.0,
    duration: "4 hours",
    difficulty: "Intermediate",
    category: "Peptide Therapy",
    description:
      "Practical guide to leveraging PeptideIQ for peptide therapy protocols, including BPC-157, thymosin, and KPV applications.",
  },
]

const completedCourses = [
  {
    id: "c1",
    title: "Foundations of Functional Genomics",
    credits: 4.0,
    completedDate: "Jan 18, 2026",
    score: 94,
    certificateId: "CERT-2026-0118",
  },
  {
    id: "c2",
    title: "CYP450 Enzyme Polymorphisms & Drug Metabolism",
    credits: 3.5,
    completedDate: "Feb 5, 2026",
    score: 88,
    certificateId: "CERT-2026-0205",
  },
  {
    id: "c3",
    title: "Gut Microbiome & Genomic Interactions",
    credits: 3.0,
    completedDate: "Feb 22, 2026",
    score: 91,
    certificateId: "CERT-2026-0222",
  },
  {
    id: "c4",
    title: "Hormonal Optimization Through Genomics",
    credits: 3.5,
    completedDate: "Mar 8, 2026",
    score: 96,
    certificateId: "CERT-2026-0308",
  },
]

const certificates = [
  {
    id: "CERT-2026-0118",
    title: "Foundations of Functional Genomics",
    credits: 4.0,
    issuedDate: "Jan 18, 2026",
    accreditor: "ACCME",
    status: "Verified",
  },
  {
    id: "CERT-2026-0205",
    title: "CYP450 Enzyme Polymorphisms & Drug Metabolism",
    credits: 3.5,
    issuedDate: "Feb 5, 2026",
    accreditor: "ACCME",
    status: "Verified",
  },
  {
    id: "CERT-2026-0222",
    title: "Gut Microbiome & Genomic Interactions",
    credits: 3.0,
    issuedDate: "Feb 22, 2026",
    accreditor: "AAFP",
    status: "Verified",
  },
  {
    id: "CERT-2026-0308",
    title: "Hormonal Optimization Through Genomics",
    credits: 3.5,
    issuedDate: "Mar 8, 2026",
    accreditor: "ACCME",
    status: "Pending",
  },
]

function difficultyVariant(difficulty: string) {
  switch (difficulty) {
    case "Advanced":
      return "default" as const
    case "Intermediate":
      return "info" as const
    case "Beginner":
      return "success" as const
    default:
      return "secondary" as const
  }
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default function CMEPage() {
  const totalCredits = 24.5
  const creditsThisYear = 18.0
  const requiredAnnual = 25.0
  const completionPct = Math.round((creditsThisYear / requiredAnnual) * 100)

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          Continuing Medical Education
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Track your CME credits, complete accredited courses, and manage certificates
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Credits Earned"
          value={totalCredits}
          icon={<GraduationCap className="h-5 w-5" />}
          change={12}
          changeLabel="all time"
        />
        <StatCard
          title="Credits This Year"
          value={creditsThisYear}
          icon={<Calendar className="h-5 w-5" />}
          change={6.5}
          changeLabel="vs last year"
        />
        <StatCard
          title="Required Annual"
          value={requiredAnnual}
          icon={<Target className="h-5 w-5" />}
        />
        {/* Completion progress card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Annual Progress</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold tracking-tight text-gray-900">
              {completionPct}%
            </p>
            <div className="mt-2">
              <Progress value={creditsThisYear} max={requiredAnnual} />
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              {creditsThisYear} of {requiredAnnual} credits completed
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue="available">
        <TabsList>
          <TabsTrigger value="available">Available</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
        </TabsList>

        {/* ── Available Courses ──────────────────────────────────────── */}
        <TabsContent value="available">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {availableCourses.map((course) => (
              <Card key={course.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant={difficultyVariant(course.difficulty)}>
                      {course.difficulty}
                    </Badge>
                    <Badge variant="outline" className="shrink-0">
                      {course.credits} credits
                    </Badge>
                  </div>
                  <CardTitle className="mt-2 text-base leading-snug">
                    {course.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 pb-4">
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {course.description}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      {course.instructor}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {course.duration}
                    </span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" size="sm">
                    <Play className="h-4 w-4" />
                    Start Course
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Completed Courses ──────────────────────────────────────── */}
        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Completed Courses</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead className="text-center">Credits</TableHead>
                    <TableHead className="hidden sm:table-cell">Completed</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-right">Certificate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedCourses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                          <span className="font-medium text-gray-900">
                            {course.title}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{course.credits}</Badge>
                      </TableCell>
                      <TableCell className="hidden text-gray-600 sm:table-cell">
                        {course.completedDate}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="h-3.5 w-3.5 text-amber-400" />
                          <span className="font-medium text-gray-900">
                            {course.score}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                          <span className="hidden sm:inline">Download</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Certificates ───────────────────────────────────────────── */}
        <TabsContent value="certificates">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {certificates.map((cert) => (
              <Card key={cert.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={cert.status === "Verified" ? "success" : "warning"}
                    >
                      {cert.status}
                    </Badge>
                    <span className="text-xs font-mono text-gray-400">
                      {cert.id}
                    </span>
                  </div>
                  <CardTitle className="mt-2 text-base leading-snug">
                    {cert.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Credits</span>
                      <span className="font-medium text-gray-900">{cert.credits}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Issued</span>
                      <span className="font-medium text-gray-900">
                        {cert.issuedDate}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Accreditor</span>
                      <span className="font-medium text-gray-900">
                        {cert.accreditor}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" size="sm">
                    <Download className="h-4 w-4" />
                    Download Certificate
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
