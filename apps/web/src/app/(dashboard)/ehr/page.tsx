"use client"

import { useState } from "react"
import {
  Server,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpDown,
  Database,
  Shield,
  Settings2,
  Link2,
  FileText,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"

// ─── Types ───────────────────────────────────────────────────────────────────

interface EHRSystem {
  id: string
  name: string
  fhirVersion: string
  connected: boolean
  lastSync: string | null
  recordsSynced: number
  logo: string
}

interface SyncRecord {
  id: string
  date: string
  system: string
  recordsSynced: number
  direction: "Import" | "Export"
  status: "Completed" | "Failed" | "In Progress"
  duration: string
}

interface FHIRMapping {
  resource: string
  localField: string
  fhirPath: string
  status: "Mapped" | "Partial" | "Unmapped"
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const ehrSystems: EHRSystem[] = [
  {
    id: "epic",
    name: "Epic",
    fhirVersion: "FHIR R4",
    connected: true,
    lastSync: "2026-03-18 09:45 AM",
    recordsSynced: 12847,
    logo: "E",
  },
  {
    id: "cerner",
    name: "Cerner",
    fhirVersion: "FHIR R4",
    connected: false,
    lastSync: null,
    recordsSynced: 0,
    logo: "C",
  },
  {
    id: "athena",
    name: "Athena Health",
    fhirVersion: "FHIR R4",
    connected: false,
    lastSync: null,
    recordsSynced: 0,
    logo: "A",
  },
  {
    id: "allscripts",
    name: "AllScripts",
    fhirVersion: "FHIR R4",
    connected: false,
    lastSync: null,
    recordsSynced: 0,
    logo: "AS",
  },
]

const syncHistory: SyncRecord[] = [
  { id: "s1", date: "2026-03-18 09:45 AM", system: "Epic", recordsSynced: 234, direction: "Import", status: "Completed", duration: "2m 14s" },
  { id: "s2", date: "2026-03-17 03:30 PM", system: "Epic", recordsSynced: 189, direction: "Export", status: "Completed", duration: "1m 48s" },
  { id: "s3", date: "2026-03-17 09:00 AM", system: "Epic", recordsSynced: 312, direction: "Import", status: "Completed", duration: "3m 02s" },
  { id: "s4", date: "2026-03-16 04:15 PM", system: "Epic", recordsSynced: 0, direction: "Import", status: "Failed", duration: "0m 32s" },
  { id: "s5", date: "2026-03-16 09:00 AM", system: "Epic", recordsSynced: 276, direction: "Import", status: "Completed", duration: "2m 37s" },
  { id: "s6", date: "2026-03-15 02:00 PM", system: "Epic", recordsSynced: 145, direction: "Export", status: "Completed", duration: "1m 22s" },
]

const fhirMappings: FHIRMapping[] = [
  { resource: "Patient", localField: "patient_demographics", fhirPath: "Patient/{id}", status: "Mapped" },
  { resource: "Observation", localField: "lab_results", fhirPath: "Observation?patient={id}", status: "Mapped" },
  { resource: "MedicationRequest", localField: "prescriptions", fhirPath: "MedicationRequest?patient={id}", status: "Mapped" },
  { resource: "DiagnosticReport", localField: "diagnostic_reports", fhirPath: "DiagnosticReport?patient={id}", status: "Partial" },
  { resource: "CarePlan", localField: "treatment_protocols", fhirPath: "CarePlan?patient={id}", status: "Partial" },
  { resource: "AllergyIntolerance", localField: "allergies", fhirPath: "AllergyIntolerance?patient={id}", status: "Mapped" },
  { resource: "Condition", localField: "conditions", fhirPath: "Condition?patient={id}", status: "Mapped" },
  { resource: "Immunization", localField: "immunizations", fhirPath: "Immunization?patient={id}", status: "Unmapped" },
]

const fhirScopes = [
  { id: "patient", label: "Patient", description: "Read/write patient demographics" },
  { id: "observation", label: "Observation", description: "Lab results and vital signs" },
  { id: "medication", label: "MedicationRequest", description: "Prescription and medication data" },
  { id: "diagnostic", label: "DiagnosticReport", description: "Diagnostic and imaging reports" },
  { id: "careplan", label: "CarePlan", description: "Treatment plans and care protocols" },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function EHRIntegrationPage() {
  const [fhirServerUrl, setFhirServerUrl] = useState("https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4")
  const [clientId, setClientId] = useState("viaconnect-prod-2026")
  const [clientSecret, setClientSecret] = useState("")
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["patient", "observation", "medication"])
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionTestResult, setConnectionTestResult] = useState<"success" | "error" | null>(null)

  const handleToggleScope = (scopeId: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scopeId) ? prev.filter((s) => s !== scopeId) : [...prev, scopeId]
    )
  }

  const handleTestConnection = () => {
    setTestingConnection(true)
    setConnectionTestResult(null)
    setTimeout(() => {
      setTestingConnection(false)
      setConnectionTestResult("success")
    }, 2000)
  }

  const connectedCount = ehrSystems.filter((s) => s.connected).length

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">EHR Integration</h1>
        <p className="mt-1 text-gray-500">Connect and manage Electronic Health Record systems</p>
      </div>

      {/* Connection Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <Server className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle>Connection Status</CardTitle>
                <CardDescription>Current integration overview</CardDescription>
              </div>
            </div>
            <Badge variant={connectedCount > 0 ? "success" : "secondary"}>
              {connectedCount} of {ehrSystems.length} Connected
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-gray-100 p-4">
              <p className="text-sm text-gray-500">Connected Systems</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{connectedCount}</p>
            </div>
            <div className="rounded-lg border border-gray-100 p-4">
              <p className="text-sm text-gray-500">Records Synced</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {ehrSystems.reduce((sum, s) => sum + s.recordsSynced, 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-gray-100 p-4">
              <p className="text-sm text-gray-500">Last Sync</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">Today, 9:45 AM</p>
            </div>
            <div className="rounded-lg border border-gray-100 p-4">
              <p className="text-sm text-gray-500">Sync Health</p>
              <div className="mt-2">
                <Progress value={96} />
                <p className="mt-1 text-xs text-gray-500">96% success rate</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supported EHR Systems */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Supported EHR Systems</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ehrSystems.map((system) => (
            <Card key={system.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-lg font-bold text-gray-700">
                    {system.logo}
                  </div>
                  <Badge variant={system.connected ? "success" : "secondary"}>
                    {system.connected ? "Connected" : "Not Connected"}
                  </Badge>
                </div>
                <CardTitle className="mt-3 text-lg">{system.name}</CardTitle>
                <CardDescription>{system.fhirVersion}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {system.connected && (
                  <>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Last sync: {system.lastSync}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Database className="h-3.5 w-3.5" />
                      <span>{system.recordsSynced.toLocaleString()} records synced</span>
                    </div>
                  </>
                )}
                {!system.connected && (
                  <p className="text-sm text-gray-400">No connection established</p>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  variant={system.connected ? "outline" : "default"}
                  className="w-full"
                  size="sm"
                >
                  {system.connected ? (
                    <>
                      <Settings2 className="h-4 w-4" />
                      Configure
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4" />
                      Connect
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* FHIR Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>FHIR Configuration</CardTitle>
              <CardDescription>Configure your FHIR server connection parameters</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                id="fhir-server-url"
                label="FHIR Server URL"
                value={fhirServerUrl}
                onChange={(e) => setFhirServerUrl(e.target.value)}
                placeholder="https://fhir.example.com/api/FHIR/R4"
              />
            </div>
            <Input
              id="client-id"
              label="Client ID"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Enter client ID"
            />
            <Input
              id="client-secret"
              label="Client Secret"
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="Enter client secret"
            />
          </div>

          <Separator />

          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-700">FHIR Scopes</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {fhirScopes.map((scope) => (
                <label
                  key={scope.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50 has-[:checked]:border-emerald-300 has-[:checked]:bg-emerald-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope.id)}
                    onChange={() => handleToggleScope(scope.id)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-500 accent-emerald-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{scope.label}</p>
                    <p className="text-xs text-gray-500">{scope.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {connectionTestResult === "success" && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Connection test successful. FHIR server is reachable and responding.
            </div>
          )}
          {connectionTestResult === "error" && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <XCircle className="h-4 w-4" />
              Connection test failed. Please verify your credentials and server URL.
            </div>
          )}
        </CardContent>
        <CardFooter className="gap-3">
          <Button variant="outline" onClick={handleTestConnection} disabled={testingConnection}>
            {testingConnection ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Test Connection
              </>
            )}
          </Button>
          <Button>Save Configuration</Button>
        </CardFooter>
      </Card>

      {/* Sync History */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <ArrowUpDown className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>Sync History</CardTitle>
              <CardDescription>Recent data synchronization activity</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>EHR System</TableHead>
                <TableHead>Records Synced</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {syncHistory.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="text-gray-600">{record.date}</TableCell>
                  <TableCell className="font-medium text-gray-900">{record.system}</TableCell>
                  <TableCell>{record.recordsSynced.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {record.direction === "Import" ? (
                        <ArrowDownToLine className="h-3.5 w-3.5 text-blue-500" />
                      ) : (
                        <ArrowUpFromLine className="h-3.5 w-3.5 text-amber-500" />
                      )}
                      <span>{record.direction}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        record.status === "Completed"
                          ? "success"
                          : record.status === "Failed"
                            ? "destructive"
                            : "warning"
                      }
                    >
                      {record.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-500">{record.duration}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Data Mapping */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <FileText className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle>Data Mapping</CardTitle>
              <CardDescription>FHIR resource to local data field mappings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>FHIR Resource</TableHead>
                <TableHead>Local Field</TableHead>
                <TableHead>FHIR Path</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fhirMappings.map((mapping) => (
                <TableRow key={mapping.resource}>
                  <TableCell className="font-medium text-gray-900">{mapping.resource}</TableCell>
                  <TableCell>
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
                      {mapping.localField}
                    </code>
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                      {mapping.fhirPath}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        mapping.status === "Mapped"
                          ? "success"
                          : mapping.status === "Partial"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {mapping.status}
                    </Badge>
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
