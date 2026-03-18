"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Plus, Eye, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SearchInput } from "@/components/ui/search-input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

type PatientStatus = "active" | "pending_review" | "inactive"
type GeneX360Status = "Complete" | "Pending" | "Not Ordered"

interface PatientRow {
  id: string
  firstName: string
  lastName: string
  dob: string
  conditions: string[]
  lastVisit: string
  status: PatientStatus
  geneXStatus: GeneX360Status
}

const PATIENTS: PatientRow[] = [
  {
    id: "pt-001",
    firstName: "Maria",
    lastName: "Gonzalez",
    dob: "1985-04-12",
    conditions: ["MTHFR C677T homozygous", "Methylation disorder"],
    lastVisit: "2026-03-10",
    status: "active",
    geneXStatus: "Complete",
  },
  {
    id: "pt-002",
    firstName: "James",
    lastName: "Chen",
    dob: "1972-11-03",
    conditions: ["Hypothyroidism", "Vitamin D deficiency"],
    lastVisit: "2026-03-08",
    status: "active",
    geneXStatus: "Complete",
  },
  {
    id: "pt-003",
    firstName: "Aisha",
    lastName: "Patel",
    dob: "1990-07-22",
    conditions: ["COMT Val158Met", "Anxiety disorder"],
    lastVisit: "2026-02-28",
    status: "pending_review",
    geneXStatus: "Pending",
  },
  {
    id: "pt-004",
    firstName: "Robert",
    lastName: "Williams",
    dob: "1968-01-15",
    conditions: ["APOE e4/e4", "Hyperlipidemia", "Hypertension"],
    lastVisit: "2026-03-14",
    status: "active",
    geneXStatus: "Complete",
  },
  {
    id: "pt-005",
    firstName: "Yuki",
    lastName: "Tanaka",
    dob: "1995-09-30",
    conditions: ["CYP2D6 poor metabolizer", "Chronic fatigue"],
    lastVisit: "2026-03-01",
    status: "active",
    geneXStatus: "Complete",
  },
  {
    id: "pt-006",
    firstName: "David",
    lastName: "Okafor",
    dob: "1980-06-18",
    conditions: ["Type 2 diabetes", "FTO rs9939609"],
    lastVisit: "2026-02-15",
    status: "inactive",
    geneXStatus: "Complete",
  },
  {
    id: "pt-007",
    firstName: "Sarah",
    lastName: "Mitchell",
    dob: "1988-12-05",
    conditions: ["Hashimoto's thyroiditis", "VDR Taq polymorphism"],
    lastVisit: "2026-03-12",
    status: "active",
    geneXStatus: "Pending",
  },
  {
    id: "pt-008",
    firstName: "Ahmed",
    lastName: "Hassan",
    dob: "1975-03-27",
    conditions: ["Coronary artery disease", "CYP2C19 intermediate metabolizer"],
    lastVisit: "2026-03-05",
    status: "pending_review",
    geneXStatus: "Complete",
  },
  {
    id: "pt-009",
    firstName: "Elena",
    lastName: "Rossi",
    dob: "1992-08-14",
    conditions: ["Iron deficiency anemia", "Celiac disease"],
    lastVisit: "2026-02-20",
    status: "active",
    geneXStatus: "Not Ordered",
  },
  {
    id: "pt-010",
    firstName: "Michael",
    lastName: "Abrams",
    dob: "1963-05-09",
    conditions: ["Chronic kidney disease stage 3", "MTHFR A1298C heterozygous"],
    lastVisit: "2026-03-16",
    status: "active",
    geneXStatus: "Complete",
  },
]

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

const STATUS_LABELS: Record<PatientStatus, string> = {
  active: "Active",
  pending_review: "Pending Review",
  inactive: "Inactive",
}

const FILTER_OPTIONS: Array<{ value: PatientStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "pending_review", label: "Pending Review" },
  { value: "inactive", label: "Inactive" },
]

function geneXBadgeVariant(status: GeneX360Status) {
  switch (status) {
    case "Complete":
      return "success" as const
    case "Pending":
      return "warning" as const
    case "Not Ordered":
      return "secondary" as const
  }
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

const PAGE_SIZE = 5

export default function PatientsPage() {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<PatientStatus | "all">("all")
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    let list = PATIENTS

    if (filter !== "all") {
      list = list.filter((p) => p.status === filter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          p.conditions.some((c) => c.toLowerCase().includes(q))
      )
    }

    return list
  }, [search, filter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Patient Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {filtered.length} patient{filtered.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <Link href="/patients/new">
          <Button>
            <Plus className="h-4 w-4" />
            Add Patient
          </Button>
        </Link>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Search patients by name or condition..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          onClear={() => {
            setSearch("")
            setPage(1)
          }}
          className="w-full sm:max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setFilter(opt.value)
                setPage(1)
              }}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                filter === opt.value
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>DOB / Age</TableHead>
                <TableHead>Conditions</TableHead>
                <TableHead>Last Visit</TableHead>
                <TableHead>GeneX360 Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-gray-500"
                  >
                    No patients match your search criteria.
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs">
                            {getInitials(patient.firstName, patient.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-900">
                            {patient.lastName}, {patient.firstName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {STATUS_LABELS[patient.status]}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-900">
                        {formatDate(patient.dob)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {calculateAge(patient.dob)} yrs
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {patient.conditions.slice(0, 2).map((c) => (
                          <Badge
                            key={c}
                            variant="outline"
                            className="text-[11px] font-normal"
                          >
                            {c}
                          </Badge>
                        ))}
                        {patient.conditions.length > 2 && (
                          <Badge
                            variant="secondary"
                            className="text-[11px] font-normal"
                          >
                            +{patient.conditions.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {formatDate(patient.lastVisit)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={geneXBadgeVariant(patient.geneXStatus)}>
                        {patient.geneXStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/patients/${patient.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(safePage - 1) * PAGE_SIZE + 1}&ndash;
            {Math.min(safePage * PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={`h-8 w-8 rounded-md text-sm font-medium transition-colors ${
                  n === safePage
                    ? "bg-emerald-500 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {n}
              </button>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
