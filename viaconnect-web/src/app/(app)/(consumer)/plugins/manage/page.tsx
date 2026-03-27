'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Settings,
  RefreshCw,
  Trash2,
  Eye,
  Unplug,
  RotateCcw,
  Plus,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Mock data                                                         */
/* ------------------------------------------------------------------ */

interface Wearable {
  id: string;
  name: string;
  emoji: string;
  status: 'connected' | 'error';
  lastSync: string;
  dataTypes: string[];
}

interface AppConnection {
  id: string;
  name: string;
  emoji: string;
  status: 'connected' | 'error';
  lastSync: string;
  dataTypes: string[];
}

const wearables: Wearable[] = [
  {
    id: 'oura',
    name: 'Oura Ring Gen 3',
    emoji: '💍',
    status: 'connected',
    lastSync: '2 minutes ago',
    dataTypes: ['sleep', 'hrv', 'temperature'],
  },
  {
    id: 'apple-watch',
    name: 'Apple Watch S9',
    emoji: '⌚',
    status: 'connected',
    lastSync: '5 minutes ago',
    dataTypes: ['heart_rate', 'activity', 'ecg'],
  },
  {
    id: 'garmin',
    name: 'Garmin Venu 3',
    emoji: '🏃',
    status: 'error',
    lastSync: '2 hours ago',
    dataTypes: ['activity', 'sleep', 'stress'],
  },
];

const apps: AppConnection[] = [
  {
    id: 'myfitnesspal',
    name: 'MyFitnessPal',
    emoji: '🥗',
    status: 'connected',
    lastSync: '1 hr ago',
    dataTypes: ['nutrition', 'calories', 'macros'],
  },
  {
    id: 'strava',
    name: 'Strava',
    emoji: '🚴',
    status: 'connected',
    lastSync: 'today',
    dataTypes: ['workouts', 'activities'],
  },
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function StatusDot({ status }: { status: 'connected' | 'error' }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${
        status === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
      }`}
    />
  );
}

function DataPill({ label }: { label: string }) {
  return (
    <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-medium text-white/90 bg-[#2DA5A0]/30 border border-[#2DA5A0]/40">
      {label}
    </span>
  );
}

function DeviceCard({
  emoji,
  name,
  status,
  lastSync,
  dataTypes,
  onDisconnect,
  onRetry,
}: {
  emoji: string;
  name: string;
  status: 'connected' | 'error';
  lastSync: string;
  dataTypes: string[];
  onDisconnect: () => void;
  onRetry?: () => void;
}) {
  return (
    <div className="glass-v2 flex items-start gap-4 p-4 rounded-2xl">
      {/* Icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl">
        {emoji}
      </div>

      {/* Center info */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="font-semibold text-white">{name}</p>

        <p className="flex items-center gap-1.5 text-sm">
          <StatusDot status={status} />
          {status === 'connected' ? (
            <span className="text-white/60">Connected · Synced {lastSync}</span>
          ) : (
            <span className="text-amber-300">⚠️ Sync error · Last: {lastSync}</span>
          )}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {dataTypes.map((dt) => (
            <DataPill key={dt} label={dt} />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        {status === 'error' && onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-400/10 transition-colors"
          >
            <RotateCcw size={14} />
            Retry
          </button>
        )}
        <button className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white/60 hover:bg-white/5 transition-colors">
          <Settings size={14} />
          Settings
        </button>
        <button
          onClick={onDisconnect}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <Unplug size={14} />
          Disconnect
        </button>
      </div>
    </div>
  );
}

function SectionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#2DA5A0] hover:text-[#2DA5A0]/80 transition-colors"
    >
      <Plus size={16} />
      {label}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function ManageConnectionsPage() {
  const [wearableList, setWearableList] = useState(wearables);
  const [appList, setAppList] = useState(apps);

  function handleDisconnect(
    id: string,
    listSetter: React.Dispatch<React.SetStateAction<typeof wearables>> | React.Dispatch<React.SetStateAction<typeof apps>>,
    label: string,
  ) {
    if (window.confirm(`Disconnect ${label}? You can reconnect later.`)) {
      (listSetter as (fn: (prev: any[]) => any[]) => void)((prev) =>
        prev.filter((item: { id: string }) => item.id !== id),
      );
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/plugins"
          className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/70 transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Back to Plugin Hub
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: '#B75E18' }}>
          My Connections
        </h1>
      </div>

      {/* -------- WEARABLES -------- */}
      <section className="space-y-3">
        <p className="text-overline">WEARABLES</p>

        {wearableList.map((w) => (
          <DeviceCard
            key={w.id}
            emoji={w.emoji}
            name={w.name}
            status={w.status}
            lastSync={w.lastSync}
            dataTypes={w.dataTypes}
            onDisconnect={() => handleDisconnect(w.id, setWearableList, w.name)}
            onRetry={w.status === 'error' ? () => alert('Retrying sync...') : undefined}
          />
        ))}

        <SectionLink href="/plugins" label="Connect Another Wearable" />
      </section>

      {/* -------- APPS -------- */}
      <section className="space-y-3">
        <p className="text-overline">APPS</p>

        {appList.map((a) => (
          <DeviceCard
            key={a.id}
            emoji={a.emoji}
            name={a.name}
            status={a.status}
            lastSync={a.lastSync}
            dataTypes={a.dataTypes}
            onDisconnect={() => handleDisconnect(a.id, setAppList, a.name)}
          />
        ))}

        <SectionLink href="/plugins" label="Connect Another App" />
      </section>

      {/* -------- LABS -------- */}
      <section className="space-y-3">
        <p className="text-overline">LABS</p>

        <div className="glass-v2 flex items-start gap-4 p-4 rounded-2xl">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl">
            🧬
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="font-semibold text-white">Lab Report &mdash; March 15, 2026</p>
            <p className="text-sm text-emerald-400">✅ 23 biomarkers extracted</p>
            <p className="text-sm text-white/50">Source: Quest Diagnostics</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-[#2DA5A0] hover:bg-[#2DA5A0]/10 transition-colors">
              <Eye size={14} />
              View
            </button>
            <button className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-400/10 transition-colors">
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>

        <SectionLink href="/plugins" label="Upload New Lab Report" />
      </section>

      {/* -------- GENETIC DATA IMPORTS -------- */}
      <section className="space-y-3">
        <p className="text-overline">GENETIC DATA IMPORTS</p>

        <div className="glass-v2 flex items-start gap-4 p-4 rounded-2xl">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl">
            🧬
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="font-semibold text-white">23andMe Raw Data Import</p>
            <p className="text-sm text-emerald-400">✅ Processed · 612,000 SNPs</p>
            <p className="text-sm text-white/50">Imported: February 20, 2026</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-400/10 transition-colors">
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>
      </section>

      {/* -------- DATA SYNC STATUS -------- */}
      <section className="space-y-3">
        <p className="text-overline">DATA SYNC STATUS</p>

        <div className="glass-v2 flex items-center justify-between p-4 rounded-2xl">
          <div className="space-y-0.5">
            <p className="text-body-sm text-secondary">Last full sync: 2 minutes ago</p>
            <p className="text-body-sm text-tertiary">Next scheduled: in 13 minutes</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors">
            <RefreshCw size={16} />
            Force Sync Now
          </button>
        </div>
      </section>
    </div>
  );
}
