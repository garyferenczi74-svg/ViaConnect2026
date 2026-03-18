"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Dna,
  Apple,
  Activity,
  Clock,
  FlaskConical,
  Leaf,
  ArrowRight,
  Eye,
  FileDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SearchInput } from "@/components/ui/search-input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"

// ---------------------------------------------------------------------------
// Panel definitions
// ---------------------------------------------------------------------------

interface GenomicPanel {
  id: string
  name: string
  description: string
  icon: React.ElementType
  resultCount: number
  color: string
  bgColor: string
}

const PANELS: GenomicPanel[] = [
  {
    id: "genex-m",
    name: "GENEX-M\u2122",
    description:
      "Methylation & Core SNPs \u2014 25+ SNPs including MTHFR, COMT, CYP450, VDR, APOE, and FTO analysis",
    icon: Dna,
    resultCount: 47,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  {
    id: "nutrigen-dx",
    name: "NUTRIGEN-DX\u2122",
    description:
      "Nutrigenomic Profile \u2014 Genetic variants affecting vitamin, mineral, macronutrient, and fatty acid metabolism",
    icon: Apple,
    resultCount: 32,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  {
    id: "hormone-iq",
    name: "HormoneIQ\u2122",
    description:
      "Hormone Metabolism \u2014 40+ hormones and metabolites via DUTCH Complete analysis",
    icon: Activity,
    resultCount: 28,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    id: "epigen-hq",
    name: "EpigenHQ\u2122",
    description:
      "Epigenetic Age Analysis \u2014 853,307 CpG sites for biological age determination and aging markers",
    icon: Clock,
    resultCount: 15,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    id: "peptide-iq",
    name: "PeptideIQ\u2122",
    description:
      "Peptide Response Optimization \u2014 BPC-157, Thymosin Beta-4, CJC-1295, Ipamorelin response profiling",
    icon: FlaskConical,
    resultCount: 19,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
  },
  {
    id: "cannabis-iq",
    name: "CannabisIQ\u2122",
    description:
      "Cannabinoid Response Profile \u2014 Endocannabinoid system genetics including CNR1, FAAH, and MGLL variants",
    icon: Leaf,
    resultCount: 12,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
]

// ---------------------------------------------------------------------------
// Recent results mock data
// ---------------------------------------------------------------------------

type ResultStatus = "completed" | "in_progress" | "pending" | "review"

interface RecentResult {
  id: string
  patientName: string
  panel: string
  panelId: string
  dateOrdered: string
  dateCompleted: string | null
  status: ResultStatus
}

const STATUS_MAP: Record<ResultStatus, { label: string; variant: "success" | "warning" | "info" | "secondary" }> = {
  completed: { label: "Completed", variant: "success" },
  in_progress: { label: "In Progress", variant: "info" },
  pending: { label: "Pending", variant: "warning" },
  review: { label: "Needs Review", variant: "secondary" },
}

const RECENT_RESULTS: RecentResult[] = [
  {
    id: "gr-001",
    patientName: "Maria Gonzalez",
    panel: "GENEX-M\u2122",
    panelId: "genex-m",
    dateOrdered: "2026-02-28",
    dateCompleted: "2026-03-10",
    status: "completed",
  },
  {
    id: "gr-002",
    patientName: "James Chen",
    panel: "NUTRIGEN-DX\u2122",
    panelId: "nutrigen-dx",
    dateOrdered: "2026-03-01",
    dateCompleted: "2026-03-12",
    status: "completed",
  },
  {
    id: "gr-003",
    patientName: "Aisha Patel",
    panel: "HormoneIQ\u2122",
    panelId: "hormone-iq",
    dateOrdered: "2026-03-05",
    dateCompleted: "2026-03-15",
    status: "review",
  },
  {
    id: "gr-004",
    patientName: "Robert Williams",
    panel: "GENEX-M\u2122",
    panelId: "genex-m",
    dateOrdered: "2026-03-08",
    dateCompleted: "2026-03-16",
    status: "completed",
  },
  {
    id: "gr-005",
    patientName: "Elena Vasquez",
    panel: "EpigenHQ\u2122",
    panelId: "epigen-hq",
    dateOrdered: "2026-03-10",
    dateCompleted: null,
    status: "in_progress",
  },
  {
    id: "gr-006",
    patientName: "David Nakamura",
    panel: "PeptideIQ\u2122",
    panelId: "peptide-iq",
    dateOrdered: "2026-03-12",
    dateCompleted: null,
    status: "pending",
  },
  {
    id: "gr-007",
    patientName: "Sarah Thompson",
    panel: "CannabisIQ\u2122",
    panelId: "cannabis-iq",
    dateOrdered: "2026-03-13",
    dateCompleted: "2026-03-17",
    status: "completed",
  },
  {
    id: "gr-008",
    patientName: "Michael O'Brien",
    panel: "GENEX-M\u2122",
    panelId: "genex-m",
    dateOrdered: "2026-03-14",
    dateCompleted: null,
    status: "in_progress",
  },
]

// ---------------------------------------------------------------------------
// Page metadata (exported for Next.js)
// ---------------------------------------------------------------------------

// Note: metadata export requires a server component; since this is "use client",
// metadata is set via the <title> approach in layout or a separate metadata file.

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GeneX360Page() {
  const [search, setSearch] = useState("")

  const filteredResults = useMemo(() => {
    if (!search.trim()) return RECENT_RESULTS
    const q = search.toLowerCase()
    return RECENT_RESULTS.filter(
      (r) =>
        r.patientName.toLowerCase().includes(q) ||
        r.panel.toLowerCase().includes(q)
    )
  }, [search])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          GeneX360 Genomic Results
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Comprehensive genomic panel analysis across 6 diagnostic panels
        </p>
      </div>

      {/* Panel Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {PANELS.map((panel) => {
          const Icon = panel.icon
          return (
            <Card key={panel.id} className="flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${panel.bgColor}`}
                  >
                    <Icon className={`h-5 w-5 ${panel.color}`} />
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {panel.resultCount} results
                  </Badge>
                </div>
                <CardTitle className="mt-3 text-lg">{panel.name}</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  {panel.description}
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Link href={`/genex360/${panel.id}`} className="w-full">
                  <Button variant="outline" className="w-full gap-2">
                    View Results
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      <Separator />

      {/* Recent Results */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Results
          </h2>
          <SearchInput
            placeholder="Search patient or panel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch("")}
            className="w-full sm:w-72"
          />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Panel</TableHead>
                  <TableHead>Date Ordered</TableHead>
                  <TableHead>Date Completed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.map((result) => {
                  const statusInfo = STATUS_MAP[result.status]
                  return (
                    <TableRow key={result.id}>
                      <TableCell className="font-medium text-gray-900">
                        {result.patientName}
                      </TableCell>
                      <TableCell>{result.panel}</TableCell>
                      <TableCell className="text-gray-500">
                        {result.dateOrdered}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {result.dateCompleted ?? "\u2014"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/genex360/${result.panelId}`}>
                            <Button variant="ghost" size="icon" title="View">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Download"
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filteredResults.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-gray-400"
                    >
                      No results match your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
