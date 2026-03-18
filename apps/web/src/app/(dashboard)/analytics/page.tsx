"use client"

import { useState } from "react"
import {
  Users,
  Activity,
  ClipboardList,
  ShieldCheck,
  Dna,
  TrendingUp,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { StatCard } from "@/components/ui/stat-card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectOption } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"

// ─── Mock Data ───────────────────────────────────────────────────────────────

const ageDistribution = [
  { range: "18-25", patients: 87 },
  { range: "26-35", patients: 214 },
  { range: "36-45", patients: 318 },
  { range: "46-55", patients: 289 },
  { range: "56-65", patients: 221 },
  { range: "65+", patients: 118 },
]

const topConditions = [
  { condition: "MTHFR Variants", count: 312 },
  { condition: "Hypothyroidism", count: 274 },
  { condition: "Vitamin D Deficiency", count: 248 },
  { condition: "COMT Variants", count: 196 },
  { condition: "CYP2D6 PM", count: 171 },
  { condition: "Metabolic Syndrome", count: 158 },
  { condition: "Inflammation Markers Elevated", count: 143 },
  { condition: "Iron Overload", count: 127 },
  { condition: "Histamine Intolerance", count: 104 },
  { condition: "Hormone Imbalance", count: 91 },
]

const protocolOutcomes = [
  { month: "Month 1", improvement: 12, baseline: 0 },
  { month: "Month 2", improvement: 28, baseline: 0 },
  { month: "Month 3", improvement: 45, baseline: 0 },
  { month: "Month 4", improvement: 58, baseline: 0 },
  { month: "Month 5", improvement: 67, baseline: 0 },
  { month: "Month 6", improvement: 74, baseline: 0 },
]

const pathwayDistribution = [
  { name: "Methylation Support", value: 168 },
  { name: "Detoxification", value: 142 },
  { name: "Hormone Optimization", value: 128 },
  { name: "Gut Restoration", value: 115 },
  { name: "Mitochondrial Support", value: 98 },
  { name: "Cardiovascular Health", value: 92 },
  { name: "Neurological Support", value: 87 },
  { name: "Immune Modulation", value: 79 },
  { name: "Bone & Joint", value: 72 },
  { name: "Metabolic Reset", value: 64 },
  { name: "Adrenal Recovery", value: 58 },
  { name: "Thyroid Optimization", value: 144 },
]

const PATHWAY_COLORS = [
  "#10B981", "#14B8A6", "#06B6D4", "#0EA5E9",
  "#6366F1", "#8B5CF6", "#A855F7", "#D946EF",
  "#F43F5E", "#F97316", "#EAB308", "#84CC16",
]

const geneticVariants = [
  { gene: "MTHFR", variant: "C677T", frequency: 38.2, significance: "Reduced methylation capacity" },
  { gene: "MTHFR", variant: "A1298C", frequency: 29.7, significance: "Moderate methylation impact" },
  { gene: "COMT", variant: "Val158Met", frequency: 24.1, significance: "Altered catecholamine metabolism" },
  { gene: "CYP2D6", variant: "*4/*4", frequency: 18.6, significance: "Poor drug metabolizer" },
  { gene: "CYP2C19", variant: "*2/*2", frequency: 15.3, significance: "Poor metabolizer - clopidogrel risk" },
  { gene: "VDR", variant: "Fok1 (T>C)", frequency: 22.8, significance: "Reduced vitamin D receptor activity" },
  { gene: "APOE", variant: "e4/e4", frequency: 3.2, significance: "Elevated Alzheimer's & CVD risk" },
  { gene: "CBS", variant: "C699T", frequency: 12.4, significance: "Upregulated transsulfuration" },
  { gene: "SOD2", variant: "Ala16Val", frequency: 31.5, significance: "Altered mitochondrial antioxidant" },
  { gene: "TNF-alpha", variant: "G308A", frequency: 19.8, significance: "Increased inflammatory response" },
]

// ─── Page Component ──────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState("30")

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Population Health Analytics
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Aggregate insights across your patient population
          </p>
        </div>
        <div className="w-48">
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <SelectOption value="7">Last 7 days</SelectOption>
            <SelectOption value="30">Last 30 days</SelectOption>
            <SelectOption value="90">Last 90 days</SelectOption>
            <SelectOption value="365">Last 1 year</SelectOption>
          </Select>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Patients"
          value="1,247"
          icon={<Users className="h-5 w-5" />}
          change={4.2}
          changeLabel="vs last period"
        />
        <StatCard
          title="Avg Risk Score"
          value="42.3"
          icon={<Activity className="h-5 w-5" />}
          change={-2.1}
          changeLabel="vs last period"
        />
        <StatCard
          title="Active Protocols"
          value={186}
          icon={<ClipboardList className="h-5 w-5" />}
          change={8.7}
          changeLabel="vs last period"
        />
        <StatCard
          title="Compliance Rate"
          value="78%"
          icon={<ShieldCheck className="h-5 w-5" />}
          change={3.4}
          changeLabel="vs last period"
        />
      </div>

      {/* Charts row 1: Demographics + Top Conditions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Patient Demographics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Patient Demographics</CardTitle>
            <p className="text-sm text-gray-500">Age distribution across practice</p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageDistribution} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="range" tick={{ fontSize: 12, fill: "#6b7280" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    }}
                  />
                  <Bar dataKey="patients" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Conditions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Conditions</CardTitle>
            <p className="text-sm text-gray-500">Most prevalent diagnoses in population</p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topConditions}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: "#6b7280" }} />
                  <YAxis
                    type="category"
                    dataKey="condition"
                    width={150}
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    }}
                  />
                  <Bar dataKey="count" fill="#14B8A6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2: Protocol Outcomes + Pathway Distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Protocol Outcomes */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <CardTitle className="text-base">Protocol Outcomes</CardTitle>
            </div>
            <p className="text-sm text-gray-500">
              Average patient improvement over 6-month protocol cycles
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={protocolOutcomes} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b7280" }} />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#6b7280" }}
                    domain={[0, 100]}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, "Improvement"]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="improvement"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ fill: "#10B981", r: 4 }}
                    activeDot={{ r: 6, stroke: "#10B981", strokeWidth: 2, fill: "#fff" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="baseline"
                    stroke="#d1d5db"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pathway Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pathway Distribution</CardTitle>
            <p className="text-sm text-gray-500">
              Patients across clinical pathways
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pathwayDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pathwayDistribution.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PATHWAY_COLORS[index % PATHWAY_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value} patients`,
                      name,
                    ]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    }}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    wrapperStyle={{ fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Genetic Variant Prevalence Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Dna className="h-4 w-4 text-emerald-600" />
            <CardTitle className="text-base">Genetic Variant Prevalence</CardTitle>
          </div>
          <p className="text-sm text-gray-500">
            Most common genetic variants observed in practice population
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gene</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead className="text-right">Frequency (%)</TableHead>
                <TableHead className="hidden md:table-cell">Clinical Significance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {geneticVariants.map((v, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium text-gray-900">{v.gene}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {v.variant}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        v.frequency > 25
                          ? "font-semibold text-emerald-600"
                          : "text-gray-700"
                      }
                    >
                      {v.frequency}%
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-gray-600 md:table-cell">
                    {v.significance}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
