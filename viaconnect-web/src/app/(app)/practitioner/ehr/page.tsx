"use client";

import { useState, useCallback } from "react";
import {
  RefreshCw,
  Upload,
  FileText,
  Database,
  Clock,
  CheckCircle2,
  Plus,
  Trash2,
  Eye,
} from "lucide-react";
import {
  Card,
  Badge,
  Button,
  Input,
  Select,
  DataTable,
  StatCard,
} from "@/components/ui";
import type { Column } from "@/components/ui";

// ─── Data ──────────────────────────────────────────────────────────────────────

interface EHRSystem {
  name: string;
  status: "connected" | "pending" | "disconnected";
  records: number;
  lastSync: string;
  icon: string;
}

const SYSTEMS: EHRSystem[] = [
  {
    name: "Epic MyChart",
    status: "connected",
    records: 142,
    lastSync: "2 hours ago",
    icon: "E",
  },
  {
    name: "Cerner",
    status: "disconnected",
    records: 0,
    lastSync: "Never",
    icon: "C",
  },
  {
    name: "Allscripts",
    status: "pending",
    records: 0,
    lastSync: "Never",
    icon: "A",
  },
  {
    name: "athenahealth",
    status: "disconnected",
    records: 0,
    lastSync: "Never",
    icon: "a",
  },
];

const STATUS_BADGE: Record<string, { variant: "active" | "pending" | "neutral"; label: string }> = {
  connected: { variant: "active", label: "Connected" },
  pending: { variant: "pending", label: "Pending" },
  disconnected: { variant: "neutral", label: "Disconnected" },
};

const ACTION_LABEL: Record<string, string> = {
  connected: "Configure",
  pending: "Authorize",
  disconnected: "Connect",
};

interface UploadedFile {
  name: string;
  size: string;
  status: "uploading" | "parsed" | "error";
}

interface ImportRow extends Record<string, unknown> {
  fileName: string;
  patient: string;
  type: string;
  dateImported: string;
  status: "parsed" | "pending" | "error";
}

const MOCK_IMPORTS: ImportRow[] = [
  {
    fileName: "CBC_JDoe_032126.pdf",
    patient: "John Doe",
    type: "Complete Blood Count",
    dateImported: "2026-03-21",
    status: "parsed",
  },
  {
    fileName: "MetPanel_ASmith_031926.csv",
    patient: "Alice Smith",
    type: "Metabolic Panel",
    dateImported: "2026-03-19",
    status: "parsed",
  },
  {
    fileName: "Hormone_BLee_031826.hl7",
    patient: "Brian Lee",
    type: "Hormone Panel",
    dateImported: "2026-03-18",
    status: "pending",
  },
  {
    fileName: "Thyroid_CWong_031526.pdf",
    patient: "Catherine Wong",
    type: "Thyroid Panel",
    dateImported: "2026-03-15",
    status: "parsed",
  },
  {
    fileName: "Lipid_MJones_031426.fhir",
    patient: "Marcus Jones",
    type: "Lipid Panel",
    dateImported: "2026-03-14",
    status: "error",
  },
];

interface LabMarker {
  id: string;
  name: string;
  value: string;
  unit: string;
  refRange: string;
}

const PATIENTS = [
  { value: "john-doe", label: "John Doe" },
  { value: "alice-smith", label: "Alice Smith" },
  { value: "brian-lee", label: "Brian Lee" },
  { value: "catherine-wong", label: "Catherine Wong" },
  { value: "marcus-jones", label: "Marcus Jones" },
];

const TEST_TYPES = [
  { value: "cbc", label: "Complete Blood Count" },
  { value: "metabolic", label: "Metabolic Panel" },
  { value: "hormone", label: "Hormone Panel" },
  { value: "thyroid", label: "Thyroid Panel" },
  { value: "custom", label: "Custom" },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function EHRPage() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [syncing, setSyncing] = useState(false);

  // Manual lab entry state
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedTestType, setSelectedTestType] = useState("");
  const [markers, setMarkers] = useState<LabMarker[]>([
    { id: "1", name: "", value: "", unit: "", refRange: "" },
  ]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const newFiles: UploadedFile[] = files.map((f) => ({
      name: f.name,
      size: formatFileSize(f.size),
      status: "parsed" as const,
    }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleFileSelect = useCallback(() => {
    // Simulate file selection
    const mockFile: UploadedFile = {
      name: `LabReport_${Date.now()}.pdf`,
      size: "245 KB",
      status: "parsed",
    };
    setUploadedFiles((prev) => [...prev, mockFile]);
  }, []);

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  function handleSync() {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2000);
  }

  // Marker management
  function addMarker() {
    setMarkers((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: "",
        value: "",
        unit: "",
        refRange: "",
      },
    ]);
  }

  function removeMarker(id: string) {
    setMarkers((prev) => prev.filter((m) => m.id !== id));
  }

  function updateMarker(id: string, field: keyof LabMarker, val: string) {
    setMarkers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: val } : m))
    );
  }

  // DataTable columns
  const importColumns: Column<ImportRow>[] = [
    {
      key: "fileName",
      header: "File Name",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <span className="text-white font-mono text-xs">{row.fileName}</span>
        </div>
      ),
    },
    { key: "patient", header: "Patient", sortable: true },
    {
      key: "type",
      header: "Type",
      render: (row) => (
        <Badge variant="info">{row.type as string}</Badge>
      ),
    },
    { key: "dateImported", header: "Date Imported", sortable: true },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const st = row.status as string;
        return (
          <Badge
            variant={
              st === "parsed" ? "active" : st === "pending" ? "pending" : "danger"
            }
          >
            {st === "parsed" ? "Parsed" : st === "pending" ? "Pending" : "Error"}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: () => (
        <button className="text-portal-green hover:text-portal-green/80 transition-colors">
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-dark-bg p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">EHR Integration Hub</h1>
            <p className="text-gray-400 mt-1">
              Connect, sync, and manage Electronic Health Record systems
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={handleSync}
            disabled={syncing}
            className="!bg-portal-green/20 !text-portal-green border border-portal-green/30 hover:!bg-portal-green/30 !shadow-none"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`}
            />
            {syncing ? "Syncing..." : "Sync Now"}
          </Button>
        </div>

        {/* Connected Systems */}
        <Card className="p-6 space-y-4" hover={false}>
          <h2 className="text-lg font-semibold text-white">Connected Systems</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SYSTEMS.map((sys) => {
              const badge = STATUS_BADGE[sys.status];
              return (
                <div
                  key={sys.name}
                  className="glass rounded-xl p-4 space-y-3 border border-white/[0.06]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                          sys.status === "connected"
                            ? "bg-portal-green/15 text-portal-green"
                            : sys.status === "pending"
                            ? "bg-portal-yellow/15 text-portal-yellow"
                            : "bg-white/[0.06] text-gray-500"
                        }`}
                      >
                        {sys.icon}
                      </div>
                      <div>
                        <h3 className="text-white font-medium text-sm">
                          {sys.name}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                  {sys.status === "connected" && (
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>
                        <span className="text-gray-400">{sys.records}</span>{" "}
                        records synced
                      </p>
                      <p>Last sync: {sys.lastSync}</p>
                    </div>
                  )}
                  <button
                    className={`w-full py-2 rounded-lg text-xs font-medium transition-colors ${
                      sys.status === "connected"
                        ? "bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-white border border-white/[0.08]"
                        : sys.status === "pending"
                        ? "bg-portal-yellow/15 text-portal-yellow hover:bg-portal-yellow/25 border border-portal-yellow/20"
                        : "bg-portal-green/15 text-portal-green hover:bg-portal-green/25 border border-portal-green/20"
                    }`}
                  >
                    {ACTION_LABEL[sys.status]}
                  </button>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Data Sync Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={Database}
            label="Total Records Synced"
            value={142}
            trend="up"
            trendLabel="+12 today"
          />
          <StatCard
            icon={Clock}
            label="Last Sync"
            value="2 hours ago"
          />
          <StatCard
            icon={CheckCircle2}
            label="Sync Errors"
            value={0}
            className="[&_p:first-of-type]:text-portal-green"
          />
        </div>

        {/* Lab Result Upload Zone */}
        <Card className="p-6 space-y-4" hover={false}>
          <h2 className="text-lg font-semibold text-white">Upload Lab Results</h2>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-xl border-2 border-dashed p-10 text-center transition-all duration-200 ${
              isDragOver
                ? "border-portal-green bg-portal-green/5"
                : "border-white/[0.12] hover:border-white/[0.2]"
            }`}
          >
            <Upload
              className={`w-10 h-10 mx-auto mb-3 ${
                isDragOver ? "text-portal-green" : "text-gray-600"
              }`}
            />
            <p
              className={`text-sm font-medium ${
                isDragOver ? "text-portal-green" : "text-gray-400"
              }`}
            >
              {isDragOver
                ? "Drop files here..."
                : "Drag & drop lab results here"}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Supports PDF, CSV, HL7, FHIR formats
            </p>
            <button
              onClick={handleFileSelect}
              className="mt-4 px-5 py-2 rounded-lg text-sm font-medium bg-white/[0.06] border border-white/[0.1] text-gray-300 hover:bg-white/[0.1] hover:text-white transition-colors"
            >
              Browse Files
            </button>
          </div>

          {/* Uploaded files list */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                Uploaded Files
              </p>
              {uploadedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-4 py-3 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-white font-mono">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-600">{file.size}</p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      file.status === "parsed"
                        ? "active"
                        : file.status === "uploading"
                        ? "pending"
                        : "danger"
                    }
                  >
                    {file.status === "parsed"
                      ? "Parsed"
                      : file.status === "uploading"
                      ? "Uploading..."
                      : "Error"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Imports Table */}
        <Card className="p-6 space-y-4" hover={false}>
          <h2 className="text-lg font-semibold text-white">Recent Imports</h2>
          <DataTable columns={importColumns} data={MOCK_IMPORTS} pageSize={10} />
        </Card>

        {/* Manual Lab Entry Form */}
        <Card className="p-6 space-y-5" hover={false}>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">Manual Lab Entry</h2>
            <Badge variant="info">Form</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Patient"
              placeholder="Select patient..."
              value={selectedPatient}
              onValueChange={setSelectedPatient}
              options={PATIENTS}
            />
            <Select
              label="Test Type"
              placeholder="Select test type..."
              value={selectedTestType}
              onValueChange={setSelectedTestType}
              options={TEST_TYPES}
            />
          </div>

          {/* Dynamic Marker Rows */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-400">Lab Markers</p>
              <button
                onClick={addMarker}
                className="inline-flex items-center gap-1 text-xs text-portal-green hover:text-portal-green/80 font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Marker
              </button>
            </div>

            {/* Column Headers */}
            <div className="hidden md:grid md:grid-cols-[1fr_0.7fr_0.5fr_0.8fr_auto] gap-3 text-xs text-gray-500 font-medium uppercase tracking-wider px-1">
              <span>Marker Name</span>
              <span>Value</span>
              <span>Unit</span>
              <span>Reference Range</span>
              <span className="w-8" />
            </div>

            {markers.map((marker, idx) => (
              <div
                key={marker.id}
                className="grid grid-cols-1 md:grid-cols-[1fr_0.7fr_0.5fr_0.8fr_auto] gap-3 items-end"
              >
                <Input
                  placeholder={
                    idx === 0 ? "e.g., Hemoglobin" : "Marker name"
                  }
                  value={marker.name}
                  onChange={(e) =>
                    updateMarker(marker.id, "name", e.target.value)
                  }
                />
                <Input
                  placeholder="e.g., 14.2"
                  value={marker.value}
                  onChange={(e) =>
                    updateMarker(marker.id, "value", e.target.value)
                  }
                />
                <Input
                  placeholder="g/dL"
                  value={marker.unit}
                  onChange={(e) =>
                    updateMarker(marker.id, "unit", e.target.value)
                  }
                />
                <Input
                  placeholder="12.0 - 17.5"
                  value={marker.refRange}
                  onChange={(e) =>
                    updateMarker(marker.id, "refRange", e.target.value)
                  }
                />
                <button
                  onClick={() => removeMarker(marker.id)}
                  disabled={markers.length === 1}
                  className="h-10 w-10 flex items-center justify-center rounded-lg text-gray-500 hover:text-rose hover:bg-rose/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              disabled={!selectedPatient || !selectedTestType}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150
                bg-portal-green/20 text-portal-green border border-portal-green/30
                hover:bg-portal-green/30 hover:shadow-lg hover:shadow-portal-green/10
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-portal-green/20 disabled:hover:shadow-none"
            >
              Submit Results
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
