'use client';

// SherlockStatusIndicator — small inline status pill showing Sherlock's
// state (active/idle/paused) plus the last scan time. Designed to be
// dropped into the Research Hub header without altering the layout.

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { getAgentState } from '@/lib/agents/sherlock/service';
import type { SherlockAgentState } from '@/lib/agents/sherlock/types';

const formatRelative = (iso: string | null): string => {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const min = diff / (1000 * 60);
  if (min < 1) return 'just now';
  if (min < 60) return `${Math.round(min)} min ago`;
  const hours = min / 60;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

export function SherlockStatusIndicator() {
  const [state, setState] = useState<SherlockAgentState | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const s = await getAgentState();
      if (!cancelled) setState(s);
    };
    load();
    const t = setInterval(load, 60_000); // refresh every minute
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const isActive = state?.is_active ?? true;
  const isRunning = !!state?.current_task_id;
  const dotColor = !isActive ? 'rgba(255,255,255,0.3)' : isRunning ? '#2DA5A0' : '#2DA5A0';
  const label = !isActive
    ? 'Sherlock paused'
    : isRunning
      ? 'Sherlock is researching…'
      : 'Sherlock is active';

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5"
      title="Sherlock continuously monitors your sources for relevant discoveries"
    >
      <motion.span
        animate={isRunning ? { opacity: [1, 0.4, 1], scale: [1, 1.2, 1] } : {}}
        transition={isRunning ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' } : undefined}
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: dotColor, boxShadow: isActive ? `0 0 8px ${dotColor}` : 'none' }}
      />
      <Search className="h-3.5 w-3.5 text-[#2DA5A0]" strokeWidth={1.5} />
      <span className="text-[11px] font-medium text-white/75">{label}</span>
      {state?.last_heartbeat && (
        <span className="text-[10px] text-white/35">· last scan {formatRelative(state.last_heartbeat)}</span>
      )}
    </div>
  );
}
