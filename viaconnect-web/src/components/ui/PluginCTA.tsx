'use client';

import Link from 'next/link';
import { Watch, Smartphone, ChevronRight, Check, Plus } from 'lucide-react';

interface ConnectedDevice {
  name: string;
  icon?: string; // emoji
}

interface PluginCTAProps {
  type: 'wearable' | 'app';
  navigateTo: string;
  connectedCount?: number;
  connectedDevices?: ConnectedDevice[];
  variant?: 'hero' | 'compact' | 'empty-state' | 'inline';
}

export function PluginCTA({
  type,
  navigateTo,
  connectedCount = 0,
  connectedDevices = [],
  variant = 'hero',
}: PluginCTAProps) {
  const isWearable = type === 'wearable';
  const Icon = isWearable ? Watch : Smartphone;
  const label = isWearable ? 'Connect Wearable' : 'Connect App';
  const accentColor = isWearable ? 'var(--teal-500)' : 'var(--text-heading-orange)';
  const isConnected = connectedCount > 0;

  // ── Hero variant ──
  if (variant === 'hero') {
    return (
      <Link href={navigateTo} className="block flex-1">
        <div
          className="glass-v2 flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all hover:scale-[1.01] hover:brightness-110"
          style={{ borderLeft: `3px solid ${isConnected ? '#27AE60' : accentColor}` }}
        >
          {isConnected ? (
            <>
              {/* Connected state — show device icons + "Connected" */}
              <div className="flex-1 min-w-0">
                {/* Device icon row */}
                <div className="flex items-center gap-1.5 mb-1">
                  {connectedDevices.length > 0 ? (
                    connectedDevices.map((device, i) => (
                      <span
                        key={i}
                        className="flex items-center justify-center w-7 h-7 rounded-lg text-sm"
                        style={{ background: 'rgba(39, 174, 96, 0.12)' }}
                        title={device.name}
                      >
                        {device.icon || (isWearable ? '⌚' : '📱')}
                      </span>
                    ))
                  ) : (
                    <span
                      className="flex items-center justify-center w-7 h-7 rounded-lg"
                      style={{ background: 'rgba(39, 174, 96, 0.12)' }}
                    >
                      <Icon size={16} style={{ color: '#27AE60' }} />
                    </span>
                  )}
                  {/* Green check badge */}
                  <span
                    className="flex items-center justify-center w-5 h-5 rounded-full"
                    style={{ background: '#27AE60' }}
                  >
                    <Check size={12} color="white" strokeWidth={3} />
                  </span>
                </div>

                {/* Status text */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold" style={{ color: '#27AE60' }}>
                    {connectedCount} Connected
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>·</span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {connectedDevices.map(d => d.name).join(', ') || `${connectedCount} ${type}${connectedCount > 1 ? 's' : ''}`}
                  </span>
                </div>
              </div>

              {/* Connect more / Manage arrow */}
              <div
                className="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
                style={{ background: 'rgba(45, 165, 160, 0.1)' }}
              >
                <Plus size={16} style={{ color: 'var(--teal-400)' }} />
              </div>
            </>
          ) : (
            <>
              {/* Disconnected state — original CTA */}
              <div
                className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
                style={{ backgroundColor: isWearable ? 'rgba(45,165,160,0.12)' : 'rgba(183,94,24,0.12)' }}
              >
                <Icon size={22} style={{ color: accentColor }} />
              </div>

              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-white">{label}</span>
              </div>

              <ChevronRight size={18} className="text-white/50 shrink-0" />
            </>
          )}
        </div>
      </Link>
    );
  }

  // ── Compact variant ──
  if (variant === 'compact') {
    return (
      <Link href={navigateTo} className="flex items-center gap-2 py-1 group">
        <Icon size={16} style={{ color: accentColor }} />
        <span className="text-xs text-white/70">
          {connectedCount} {type}s connected
        </span>
        <span
          className="text-xs font-medium group-hover:underline"
          style={{ color: 'var(--teal-500)' }}
        >
          Manage →
        </span>
      </Link>
    );
  }

  // ── Empty-state variant ──
  if (variant === 'empty-state') {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 px-6 py-8 rounded-2xl text-center"
        style={{ border: '2px dashed rgba(45,165,160,0.3)' }}
      >
        <Icon size={32} className="text-white/30" />
        <p className="text-sm text-white/50">
          No {type}s connected yet. Link your first {type} to unlock deeper insights.
        </p>
        <Link
          href={navigateTo}
          className="text-sm font-medium hover:underline"
          style={{ color: 'var(--teal-500)' }}
        >
          Connect {isWearable ? 'Wearable' : 'App'} →
        </Link>
      </div>
    );
  }

  // ── Inline variant ──
  return (
    <Link
      href={navigateTo}
      className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
      style={{ color: 'var(--teal-500)' }}
    >
      {isWearable ? '⌚' : '📱'} Connect a {isWearable ? 'Wearable' : 'App'} →
    </Link>
  );
}
