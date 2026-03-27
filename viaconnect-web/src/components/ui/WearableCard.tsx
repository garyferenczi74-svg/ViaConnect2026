'use client';

import { Dna } from 'lucide-react';

interface WearableCardProps {
  name: string;
  description: string;
  connectionMethod: string;
  status: 'available' | 'connected' | 'error';
  dataTypes: string[];
  geneticContext?: string;
  onConnect: () => void;
  onDisconnect?: () => void;
  icon: string;
}

export function WearableCard({
  name,
  description,
  connectionMethod,
  status,
  dataTypes,
  geneticContext,
  onConnect,
  onDisconnect,
  icon,
}: WearableCardProps) {
  return (
    <div className="glass-v2 p-5 rounded-2xl flex flex-col gap-4">
      {/* Top row: icon + name + status dot */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--navy-600)] text-2xl shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[22px] font-semibold text-white leading-tight truncate">
              {name}
            </h3>
            {status === 'connected' && (
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 shrink-0" />
            )}
            {status === 'error' && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
            )}
          </div>
          <p className="text-sm text-white/60 truncate">{description}</p>
        </div>
      </div>

      {/* Data type pills */}
      <div className="flex flex-wrap gap-1.5">
        {dataTypes.map((dt) => (
          <span
            key={dt}
            className="text-xs font-medium px-2.5 py-0.5 rounded-full"
            style={{
              backgroundColor: 'rgba(45,165,160,0.1)',
              color: 'var(--teal-500)',
            }}
          >
            {dt}
          </span>
        ))}
      </div>

      {/* Connection method */}
      <p className="text-xs text-white/40">{connectionMethod}</p>

      {/* Genetic context (optional) */}
      {geneticContext && (
        <div className="glass-v2 flex items-start gap-2 px-3 py-2.5 rounded-xl">
          <Dna size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--teal-500)' }} />
          <p className="text-xs text-white/60 leading-relaxed">{geneticContext}</p>
        </div>
      )}

      {/* Bottom: action button */}
      <div className="pt-1">
        {status === 'available' && (
          <button
            onClick={onConnect}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, var(--teal-500), #1a8a85)',
            }}
          >
            Connect
          </button>
        )}

        {status === 'connected' && (
          <button
            onClick={onDisconnect ?? (() => {})}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #27AE60, #1e8a4d)',
            }}
          >
            Connected ✓
          </button>
        )}

        {status === 'error' && (
          <button
            onClick={onConnect}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #D4A017, #b8890f)',
            }}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
