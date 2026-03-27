'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Lightbulb } from 'lucide-react';
import toast from 'react-hot-toast';
import { WearableCard } from '@/components/ui/WearableCard';

const popularWearables = [
  {
    name: 'Apple Watch',
    icon: '\u231A',
    description: 'Heart rate \u00B7 HRV \u00B7 Sleep \u00B7 Activity \u00B7 ECG \u00B7 SpO2',
    connectionMethod: 'via Apple Health',
    dataTypes: ['heart_rate', 'hrv', 'sleep', 'activity', 'spo2', 'ecg'],
    geneticContext: 'All-day HRV + COMT/MAOA variants = real-time stress adaptation',
  },
  {
    name: 'Oura Ring',
    icon: '\uD83D\uDC8D',
    description: 'Sleep staging \u00B7 HRV \u00B7 Temperature \u00B7 Readiness',
    connectionMethod: 'via Oura Cloud API',
    dataTypes: ['sleep', 'hrv', 'temperature', 'readiness'],
    geneticContext: 'Sleep data + CLOCK gene variants = chronotype-aware coaching',
  },
  {
    name: 'Garmin',
    icon: '\u231A',
    description: 'Activity \u00B7 Sleep \u00B7 Stress \u00B7 Body Battery \u00B7 Pulse Ox',
    connectionMethod: 'via Garmin Health API',
    dataTypes: ['activity', 'sleep', 'stress', 'body_battery', 'spo2'],
  },
  {
    name: 'WHOOP',
    icon: '\uD83D\uDD34',
    description: 'Recovery \u00B7 Strain \u00B7 Sleep \u00B7 HRV \u00B7 Journal',
    connectionMethod: 'via WHOOP Developer Platform',
    dataTypes: ['recovery', 'strain', 'sleep', 'hrv'],
  },
  {
    name: 'Fitbit',
    icon: '\u231A',
    description: 'Heart rate \u00B7 Sleep \u00B7 SpO2 \u00B7 Activity \u00B7 Skin temp',
    connectionMethod: 'via Fitbit Web API',
    dataTypes: ['heart_rate', 'sleep', 'spo2', 'activity', 'temperature'],
  },
];

const allWearables = [
  { name: 'Polar', icon: '\u231A' },
  { name: 'COROS', icon: '\u231A' },
  { name: 'Suunto', icon: '\u231A' },
  { name: 'Withings', icon: '\u231A' },
  { name: 'Eight Sleep', icon: '\uD83D\uDECF\uFE0F' },
  { name: 'FreeStyle Libre', icon: '\uD83D\uDCC8' },
  { name: 'Dexcom', icon: '\uD83D\uDCC8' },
  { name: 'Aktiia', icon: '\uD83E\uDE78' },
  { name: 'Omron', icon: '\u2764\uFE0F' },
];

export default function WearablesPage() {
  const [search, setSearch] = useState('');

  const filteredPopular = popularWearables.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAll = allWearables.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleConnect = () => {
    toast.success('Connection flow coming soon \u2014 Terra API integration in progress');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <Link
        href="/plugins"
        className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-white"
        style={{ color: 'var(--teal-500)' }}
      >
        <ArrowLeft size={16} />
        Plugins
      </Link>

      {/* Title */}
      <h1 className="text-heading-2" style={{ color: 'var(--text-heading-orange)' }}>
        Connect Wearable
      </h1>

      {/* Search input */}
      <div className="glass-v2 flex items-center gap-3 px-4 py-3 rounded-xl">
        <Search size={18} className="shrink-0" style={{ color: 'var(--text-secondary)' }} />
        <input
          type="text"
          placeholder="Search devices..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent outline-none w-full text-sm text-white placeholder:text-white/40"
        />
      </div>

      {/* Popular section */}
      <div className="flex flex-col gap-4">
        <p className="text-overline">POPULAR</p>
        <div className="flex flex-col gap-4">
          {filteredPopular.map((w) => (
            <WearableCard
              key={w.name}
              name={w.name}
              icon={w.icon}
              description={w.description}
              connectionMethod={w.connectionMethod}
              status="available"
              dataTypes={w.dataTypes}
              geneticContext={w.geneticContext}
              onConnect={handleConnect}
            />
          ))}
        </div>
      </div>

      {/* All Wearables section */}
      <div className="flex flex-col gap-4">
        <p className="text-overline">ALL WEARABLES</p>
        <div className="grid grid-cols-3 gap-3">
          {filteredAll.map((w) => (
            <button
              key={w.name}
              onClick={handleConnect}
              className="glass-v2 flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:brightness-110 active:scale-[0.97] cursor-pointer"
            >
              <span className="text-2xl">{w.icon}</span>
              <span className="text-xs font-medium text-white/80 text-center leading-tight">
                {w.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Info note */}
      <div
        className="glass-v2 flex items-start gap-3 p-4 rounded-xl"
        style={{ borderLeft: '3px solid #B75E18' }}
      >
        <Lightbulb size={18} className="shrink-0 mt-0.5" style={{ color: '#B75E18' }} />
        <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
          Don&apos;t see your device? If it syncs to Apple Health or Google Health Connect, it
          works with ViaConnect automatically.
        </p>
      </div>
    </div>
  );
}
