'use client';

// SourceCard — chip-style display of a single user source with toggle + remove.

import { motion } from 'framer-motion';
import { Bell, BellOff, ExternalLink, X } from 'lucide-react';
import type { UserSource } from '@/lib/research-hub/types';

interface SourceCardProps {
  source: UserSource;
  onToggleActive: (id: string, isActive: boolean) => void;
  onToggleAlerts: (id: string, notify: boolean) => void;
  onRemove: (id: string) => void;
}

export function SourceCard({ source, onToggleActive, onToggleAlerts, onRemove }: SourceCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-all ${
        source.is_active
          ? 'border-[#2DA5A0]/40 bg-[#2DA5A0]/10 text-white'
          : 'border-white/10 bg-white/[0.04] text-white/40'
      }`}
    >
      <button
        type="button"
        onClick={() => onToggleActive(source.id, !source.is_active)}
        className="flex items-center gap-1.5"
        title={source.is_active ? 'Click to deactivate' : 'Click to activate'}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            source.is_active ? 'bg-[#2DA5A0]' : 'bg-white/30'
          }`}
        />
        <span className="font-medium">{source.source_name}</span>
        {source.is_custom && (
          <span className="rounded-full border border-orange-400/30 bg-orange-400/10 px-1.5 text-[9px] font-semibold uppercase tracking-wider text-orange-300">
            custom
          </span>
        )}
      </button>

      {source.source_url && (
        <a
          href={source.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/30 hover:text-white/70"
          title="Open source"
        >
          <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
        </a>
      )}

      <button
        type="button"
        onClick={() => onToggleAlerts(source.id, !source.notify_alerts)}
        className={`text-white/30 hover:text-white/70 ${source.notify_alerts ? 'text-[#2DA5A0]/70' : ''}`}
        title={source.notify_alerts ? 'Alerts on' : 'Alerts off'}
      >
        {source.notify_alerts ? (
          <Bell className="h-3 w-3" strokeWidth={1.5} />
        ) : (
          <BellOff className="h-3 w-3" strokeWidth={1.5} />
        )}
      </button>

      <button
        type="button"
        onClick={() => onRemove(source.id)}
        className="text-white/30 hover:text-[#F87171]"
        title="Remove source"
      >
        <X className="h-3 w-3" strokeWidth={1.5} />
      </button>
    </motion.div>
  );
}
