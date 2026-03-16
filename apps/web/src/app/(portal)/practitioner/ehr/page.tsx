'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Badge,
  Button,
  glassClasses,
} from '@genex360/ui';

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */
type ConnectionStatus = 'connected' | 'pending' | 'disconnected';

interface EHRSystem {
  name: string;
  status: ConnectionStatus;
  lastSync: string;
  logoLetter: string;
  action?: string;
}

const ehrSystems: EHRSystem[] = [
  { name: 'Epic MyChart', status: 'connected', lastSync: '2 min ago', logoLetter: 'E' },
  { name: 'Cerner / Oracle Health', status: 'connected', lastSync: '5 min ago', logoLetter: 'C' },
  { name: 'Allscripts', status: 'pending', lastSync: 'Never', logoLetter: 'A', action: 'Configure' },
  { name: 'Custom FHIR Endpoint', status: 'disconnected', lastSync: 'Never', logoLetter: 'F', action: 'Add Endpoint' },
];

type SyncDirection = 'bidirectional' | 'pull' | 'push';

interface FHIRResource {
  name: string;
  description: string;
  direction: SyncDirection;
  count: number;
  active: boolean;
}

const fhirResources: FHIRResource[] = [
  { name: 'Patient', description: 'Demographics, identifiers', direction: 'bidirectional', count: 1247, active: true },
  { name: 'Observation', description: 'Lab results, vitals', direction: 'pull', count: 8934, active: true },
  { name: 'MedicationStatement', description: 'Current medications', direction: 'pull', count: 3412, active: true },
  { name: 'MedicationRequest', description: 'Supplement regimen', direction: 'push', count: 892, active: true },
  { name: 'CarePlan', description: 'Treatment protocols', direction: 'push', count: 456, active: true },
  { name: 'DiagnosticReport', description: 'Genomic reports', direction: 'push', count: 234, active: true },
];

type SyncStatus = 'success' | 'failed' | 'pending';

interface SyncEntry {
  id: number;
  timestamp: string;
  direction: 'in' | 'out';
  resource: string;
  patient: string;
  status: SyncStatus;
}

const syncLog: SyncEntry[] = [
  { id: 1, timestamp: '14:32:08', direction: 'in', resource: 'Observation', patient: 'Sarah Mitchell', status: 'success' },
  { id: 2, timestamp: '14:31:55', direction: 'out', resource: 'CarePlan', patient: 'James Rivera', status: 'success' },
  { id: 3, timestamp: '14:30:42', direction: 'in', resource: 'MedicationStatement', patient: 'Emily Chen', status: 'failed' },
  { id: 4, timestamp: '14:29:18', direction: 'out', resource: 'DiagnosticReport', patient: 'Robert Kim', status: 'success' },
  { id: 5, timestamp: '14:28:05', direction: 'in', resource: 'Patient', patient: 'Maria Lopez', status: 'pending' },
  { id: 6, timestamp: '14:27:31', direction: 'out', resource: 'MedicationRequest', patient: 'David Park', status: 'success' },
];

type InteractionStatus = 'clear' | 'warning' | 'critical';

interface ImportedMedication {
  name: string;
  source: string;
  dosage: string;
  lastVerified: string;
  interaction: InteractionStatus;
}

const importedMedications: ImportedMedication[] = [
  { name: 'Lisinopril', source: 'Epic MyChart', dosage: '10 mg daily', lastVerified: '2 min ago', interaction: 'clear' },
  { name: 'Atorvastatin', source: 'Epic MyChart', dosage: '20 mg daily', lastVerified: '2 min ago', interaction: 'warning' },
  { name: 'Metformin', source: 'Cerner', dosage: '500 mg BID', lastVerified: '5 min ago', interaction: 'clear' },
  { name: 'Levothyroxine', source: 'Epic MyChart', dosage: '50 mcg daily', lastVerified: '2 min ago', interaction: 'clear' },
  { name: 'Amlodipine', source: 'Cerner', dosage: '5 mg daily', lastVerified: '5 min ago', interaction: 'clear' },
  { name: 'Omeprazole', source: 'Epic MyChart', dosage: '20 mg daily', lastVerified: '2 min ago', interaction: 'clear' },
  { name: 'Sertraline', source: 'Cerner', dosage: '50 mg daily', lastVerified: '5 min ago', interaction: 'clear' },
  { name: 'Warfarin', source: 'Epic MyChart', dosage: '5 mg daily', lastVerified: '2 min ago', interaction: 'critical' },
];

interface Supplement {
  name: string;
  dosage: string;
  frequency: string;
}

const supplements: Supplement[] = [
  { name: 'Vitamin D3', dosage: '5000 IU', frequency: 'Daily' },
  { name: 'Omega-3 Fish Oil', dosage: '2000 mg', frequency: 'Daily' },
  { name: 'Magnesium Glycinate', dosage: '400 mg', frequency: 'Nightly' },
  { name: 'Methylfolate (5-MTHF)', dosage: '1000 mcg', frequency: 'Daily' },
  { name: 'CoQ10 (Ubiquinol)', dosage: '200 mg', frequency: 'Daily' },
];

interface Alert {
  id: number;
  message: string;
  detail: string;
  source: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
}

const initialAlerts: Alert[] = [
  {
    id: 1,
    message: 'New medication added in EHR: Lisinopril 10mg',
    detail: 'Triggers interaction check with current supplement regimen',
    source: 'Epic MyChart',
    timestamp: '14:32:08',
    severity: 'warning',
  },
  {
    id: 2,
    message: 'Medication discontinued: Metformin 500mg',
    detail: 'Protocol update suggested — review active CarePlans',
    source: 'Cerner / Oracle Health',
    timestamp: '14:28:41',
    severity: 'info',
  },
  {
    id: 3,
    message: 'Lab result received: Vitamin D 25-OH = 28 ng/mL',
    detail: 'Dosage adjustment recommended — current D3 at 5000 IU',
    source: 'Epic MyChart',
    timestamp: '14:25:19',
    severity: 'critical',
  },
];

const fhirSampleJson = `{
  "resourceType": "MedicationStatement",
  "id": "genex360-supp-001",
  "status": "active",
  "medicationCodeableConcept": {
    "coding": [
      {
        "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
        "code": "11253",
        "display": "Vitamin D3 (Cholecalciferol)"
      }
    ],
    "text": "Vitamin D3 5000 IU"
  },
  "subject": {
    "reference": "Patient/ex-pat-001",
    "display": "Sarah Mitchell"
  },
  "effectivePeriod": {
    "start": "2026-01-15"
  },
  "dosage": [
    {
      "text": "5000 IU once daily",
      "timing": {
        "repeat": { "frequency": 1, "period": 1, "periodUnit": "d" }
      },
      "route": {
        "coding": [
          { "system": "http://snomed.info/sct", "code": "26643006", "display": "Oral" }
        ]
      },
      "doseAndRate": [
        {
          "doseQuantity": { "value": 5000, "unit": "IU", "system": "http://unitsofmeasure.org", "code": "[IU]" }
        }
      ]
    }
  ]
}`;

/* ------------------------------------------------------------------ */
/*  Small reusable pieces                                              */
/* ------------------------------------------------------------------ */

function StatusDot({ status }: { status: ConnectionStatus }) {
  const color =
    status === 'connected'
      ? 'bg-emerald-400'
      : status === 'pending'
        ? 'bg-amber-400'
        : 'bg-slate-500';
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === 'connected' && (
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-75`} />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
    </span>
  );
}

function DirectionIcon({ direction }: { direction: SyncDirection }) {
  if (direction === 'bidirectional')
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald-400">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      </span>
    );
  if (direction === 'pull')
    return (
      <span className="inline-flex items-center text-blue-400">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
        </svg>
      </span>
    );
  return (
    <span className="inline-flex items-center text-violet-400">
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
      </svg>
    </span>
  );
}

function InteractionIcon({ status }: { status: InteractionStatus }) {
  if (status === 'clear')
    return (
      <span className="text-emerald-400">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </span>
    );
  if (status === 'warning')
    return (
      <span className="text-amber-400">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </span>
    );
  return (
    <span className="text-red-400">
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 0v.008m0-.008h.008M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Toggle component                                                   */
/* ------------------------------------------------------------------ */
function Toggle({ enabled, onChange, label }: { enabled: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onChange}
      className="group inline-flex items-center gap-2.5"
    >
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
          enabled ? 'bg-emerald-500' : 'bg-slate-600'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
      <span className="text-sm text-slate-300">{label}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */
export default function EHRIntegrationPage() {
  const [connections, setConnections] = useState(ehrSystems);
  const [syncing, setSyncing] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [autoInteractionCheck, setAutoInteractionCheck] = useState(true);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [pushConfirm, setPushConfirm] = useState(false);
  const [fhirViewerOpen, setFhirViewerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewSupp, setPreviewSupp] = useState<string | null>(null);

  const glass = glassClasses.dark;

  const handleSyncNow = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2000);
  };

  const handlePushAll = () => {
    setPushConfirm(true);
    setTimeout(() => setPushConfirm(false), 4000);
  };

  const dismissAlert = (id: number) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const copyJson = () => {
    navigator.clipboard.writeText(fhirSampleJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusBadge = (s: ConnectionStatus) => {
    if (s === 'connected') return <Badge variant="success" dot>Connected</Badge>;
    if (s === 'pending') return <Badge variant="warning" dot>Pending Setup</Badge>;
    return <Badge variant="default" dot>Not Connected</Badge>;
  };

  const syncStatusBadge = (s: SyncStatus) => {
    if (s === 'success') return <Badge variant="success">Success</Badge>;
    if (s === 'failed') return <Badge variant="error">Failed</Badge>;
    return <Badge variant="warning">Pending</Badge>;
  };

  const directionLabel = (d: SyncDirection) => {
    if (d === 'bidirectional') return 'Bi-directional';
    if (d === 'pull') return 'Pull from EHR';
    return 'Push to EHR';
  };

  /* ---------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        className="mx-auto max-w-7xl space-y-10"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {/* ===== 1. Header ===== */}
        <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-white">EHR Integration</h1>
              <Badge variant="primary" dot>FHIR R4 Compliant</Badge>
            </div>
            <p className="mt-1.5 text-slate-400">
              Bi-directional data exchange between GeneX360 and connected electronic health record systems
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Toggle enabled={autoSync} onChange={() => setAutoSync(!autoSync)} label="Auto-sync every 15 min" />
          </div>
        </motion.div>

        {/* ===== 2. Connection Status Panel ===== */}
        <motion.section variants={fadeUp}>
          <h2 className="mb-4 text-lg font-semibold text-slate-200">Connection Status</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {connections.map((ehr, i) => (
              <motion.div key={ehr.name} variants={fadeUp}>
                <Card padding="none" className={`${glass} rounded-xl p-5`}>
                  <div className="flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/10 text-lg font-bold text-emerald-400">
                      {ehr.logoLetter}
                    </div>
                    <StatusDot status={ehr.status} />
                  </div>
                  <CardContent className="mt-4 space-y-2">
                    <p className="font-medium text-white">{ehr.name}</p>
                    {statusBadge(ehr.status)}
                    <p className="text-xs text-slate-500">
                      Last sync: {ehr.lastSync}
                    </p>
                  </CardContent>
                  {ehr.action && (
                    <CardFooter className="mt-3 pt-3 border-t border-white/5">
                      <Button variant="outline" size="sm">
                        {ehr.action}
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ===== 3. FHIR R4 Resource Types ===== */}
        <motion.section variants={fadeUp}>
          <h2 className="mb-4 text-lg font-semibold text-slate-200">FHIR R4 Resource Types</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fhirResources.map((r) => (
              <motion.div key={r.name} variants={fadeUp}>
                <Card padding="none" className={`${glass} rounded-xl p-5`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DirectionIcon direction={r.direction} />
                      <p className="font-semibold text-white">{r.name}</p>
                    </div>
                    <Badge variant={r.active ? 'success' : 'default'} dot>
                      {r.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{r.description}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
                    <span className="text-xs text-slate-500">{directionLabel(r.direction)}</span>
                    <span className="text-xs font-medium text-slate-300">{r.count.toLocaleString()} records</span>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ===== 4. Data Sync Dashboard ===== */}
        <motion.section variants={fadeUp}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-200">Data Sync Dashboard</h2>
            <Button variant="primary" size="sm" loading={syncing} onClick={handleSyncNow}>
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
          <Card padding="none" className={`${glass} rounded-xl overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3">Timestamp</th>
                    <th className="px-5 py-3">Direction</th>
                    <th className="px-5 py-3">Resource</th>
                    <th className="px-5 py-3">Patient</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {syncLog.map((entry) => (
                    <tr key={entry.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-400">{entry.timestamp}</td>
                      <td className="px-5 py-3">
                        {entry.direction === 'in' ? (
                          <span className="inline-flex items-center gap-1 text-blue-400 text-xs">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                            </svg>
                            IN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-violet-400 text-xs">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                            </svg>
                            OUT
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-300">{entry.resource}</td>
                      <td className="px-5 py-3 text-slate-300">{entry.patient}</td>
                      <td className="px-5 py-3">{syncStatusBadge(entry.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.section>

        {/* ===== 5. Medication Import Panel ===== */}
        <motion.section variants={fadeUp}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-200">Pull Medications from EHR</h2>
              <p className="text-sm text-slate-500">Imported medications are automatically checked for interactions</p>
            </div>
            <Toggle
              enabled={autoInteractionCheck}
              onChange={() => setAutoInteractionCheck(!autoInteractionCheck)}
              label="Auto-trigger interaction check on import"
            />
          </div>

          {/* Banner */}
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3">
            <svg className="h-5 w-5 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-sm text-amber-200">
              <span className="font-semibold">3 medications imported</span> &rarr; 1 interaction detected with current supplements
            </p>
          </div>

          <Card padding="none" className={`${glass} rounded-xl overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3">Medication</th>
                    <th className="px-5 py-3">Source</th>
                    <th className="px-5 py-3">Dosage</th>
                    <th className="px-5 py-3">Last Verified</th>
                    <th className="px-5 py-3 text-center">Interaction Status</th>
                  </tr>
                </thead>
                <tbody>
                  {importedMedications.map((med) => (
                    <tr key={med.name} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="whitespace-nowrap px-5 py-3 font-medium text-slate-200">{med.name}</td>
                      <td className="px-5 py-3 text-slate-400">{med.source}</td>
                      <td className="px-5 py-3 text-slate-400">{med.dosage}</td>
                      <td className="px-5 py-3 text-xs text-slate-500">{med.lastVerified}</td>
                      <td className="px-5 py-3 text-center">
                        <InteractionIcon status={med.interaction} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.section>

        {/* ===== 6. Push to EHR Panel ===== */}
        <motion.section variants={fadeUp}>
          <h2 className="mb-1 text-lg font-semibold text-slate-200">Push Supplement Regimen as MedicationStatement</h2>
          <p className="mb-4 text-sm text-slate-500">Current patient supplements ready to push to connected EHR systems</p>

          {pushConfirm && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3"
            >
              <svg className="h-5 w-5 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-emerald-200">
                <span className="font-semibold">5 MedicationStatement resources</span> successfully pushed to Epic MyChart and Cerner
              </p>
            </motion.div>
          )}

          <Card padding="none" className={`${glass} rounded-xl`}>
            <div className="divide-y divide-white/5">
              {supplements.map((s) => (
                <div key={s.name} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-500/10">
                      <svg className="h-4 w-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.dosage} &middot; {s.frequency}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewSupp(previewSupp === s.name ? null : s.name)}
                  >
                    {previewSupp === s.name ? 'Hide' : 'FHIR Preview'}
                  </Button>
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 px-5 py-4">
              <Button variant="primary" size="sm" onClick={handlePushAll}>
                Push All to EHR
              </Button>
            </div>
          </Card>

          {previewSupp && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3"
            >
              <Card padding="none" className={`${glass} rounded-xl p-4`}>
                <p className="mb-2 text-xs font-medium text-slate-400">FHIR MedicationStatement Preview — {previewSupp}</p>
                <pre className="overflow-x-auto rounded-lg bg-slate-900/80 p-4 text-xs leading-relaxed text-emerald-300 font-mono">
                  {fhirSampleJson}
                </pre>
              </Card>
            </motion.div>
          )}
        </motion.section>

        {/* ===== 7. Bi-directional Alerts ===== */}
        <motion.section variants={fadeUp}>
          <h2 className="mb-4 text-lg font-semibold text-slate-200">Bi-directional Alerts</h2>
          <div className="space-y-3">
            {alerts.length === 0 && (
              <Card padding="md" className={`${glass} rounded-xl`}>
                <p className="text-center text-sm text-slate-500">No active alerts</p>
              </Card>
            )}
            {alerts.map((alert) => {
              const borderColor =
                alert.severity === 'critical'
                  ? 'border-l-red-500'
                  : alert.severity === 'warning'
                    ? 'border-l-amber-500'
                    : 'border-l-blue-500';
              return (
                <motion.div
                  key={alert.id}
                  layout
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                >
                  <Card padding="none" className={`${glass} rounded-xl border-l-4 ${borderColor} p-5`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-slate-200">{alert.message}</p>
                        <p className="text-sm text-slate-400">{alert.detail}</p>
                        <div className="flex items-center gap-3 pt-1">
                          <span className="text-xs text-slate-500">
                            {alert.timestamp} &middot; {alert.source}
                          </span>
                          <Badge
                            variant={
                              alert.severity === 'critical'
                                ? 'error'
                                : alert.severity === 'warning'
                                  ? 'warning'
                                  : 'info'
                            }
                          >
                            {alert.severity}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button variant="outline" size="sm">Review</Button>
                        <Button variant="ghost" size="sm" onClick={() => dismissAlert(alert.id)}>Dismiss</Button>
                        <Button variant="ghost" size="sm">Auto-resolve</Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* ===== 8. FHIR Resource Viewer ===== */}
        <motion.section variants={fadeUp}>
          <button
            type="button"
            onClick={() => setFhirViewerOpen(!fhirViewerOpen)}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-left backdrop-blur-xl transition-colors hover:bg-white/[0.07]"
          >
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
              <span className="font-semibold text-slate-200">FHIR Resource Viewer</span>
            </div>
            <svg
              className={`h-5 w-5 text-slate-400 transition-transform ${fhirViewerOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {fhirViewerOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2"
            >
              <Card padding="none" className={`${glass} rounded-xl overflow-hidden`}>
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                  <p className="text-xs font-medium text-slate-400">MedicationStatement — Vitamin D3 5000 IU</p>
                  <Button variant="ghost" size="sm" onClick={copyJson}>
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <pre className="p-5 text-xs leading-relaxed font-mono">
                    {fhirSampleJson.split('\n').map((line, i) => {
                      // Simple syntax highlighting
                      const highlighted = line
                        .replace(
                          /("(?:[^"\\]|\\.)*")\s*:/g,
                          '<key>$1</key>:'
                        )
                        .replace(
                          /:\s*("(?:[^"\\]|\\.)*")/g,
                          ': <str>$1</str>'
                        );
                      // Parse and render spans
                      const parts = highlighted.split(/(<key>.*?<\/key>|<str>.*?<\/str>)/g);
                      return (
                        <div key={i} className="flex">
                          <span className="mr-4 inline-block w-6 select-none text-right text-slate-600">{i + 1}</span>
                          <span>
                            {parts.map((part, j) => {
                              if (part.startsWith('<key>')) {
                                return (
                                  <span key={j} className="text-violet-400">
                                    {part.replace(/<\/?key>/g, '')}
                                  </span>
                                );
                              }
                              if (part.startsWith('<str>')) {
                                return (
                                  <span key={j} className="text-emerald-300">
                                    {part.replace(/<\/?str>/g, '')}
                                  </span>
                                );
                              }
                              // numbers
                              const numPart = part.replace(
                                /\b(\d+)\b/g,
                                '\u0000NUM$1NUM\u0000'
                              );
                              const numParts = numPart.split('\u0000');
                              return numParts.map((np, k) => {
                                if (np.startsWith('NUM') && np.endsWith('NUM')) {
                                  return (
                                    <span key={`${j}-${k}`} className="text-amber-300">
                                      {np.slice(3, -3)}
                                    </span>
                                  );
                                }
                                return (
                                  <span key={`${j}-${k}`} className="text-slate-400">
                                    {np}
                                  </span>
                                );
                              });
                            })}
                          </span>
                        </div>
                      );
                    })}
                  </pre>
                </div>
              </Card>
            </motion.div>
          )}
        </motion.section>
      </motion.div>
    </div>
  );
}
