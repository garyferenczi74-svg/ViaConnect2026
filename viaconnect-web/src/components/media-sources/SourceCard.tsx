'use client';

import React, { useState } from 'react';
import { ArrowRightCircle } from 'lucide-react';
import { MediaSource } from './sourceData';
import TagPill from './TagPill';
import ToggleSwitch from './ToggleSwitch';

interface SourceCardProps {
  source: MediaSource;
  isActive: boolean;
  onToggle: () => void;
  onPreview: () => void;
}

export default function SourceCard({ source, isActive, onToggle, onPreview }: SourceCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative"
      style={{
        padding: 24,
        borderRadius: 20,
        background: isActive
          ? 'linear-gradient(135deg, rgba(26,39,68,0.85), rgba(45,165,160,0.08))'
          : 'var(--glass-bg)',
        border: isActive
          ? `2px solid ${source.color}66`
          : '1.5px solid var(--glass-border)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 12px 40px rgba(0,0,0,0.35)'
          : '0 4px 16px rgba(0,0,0,0.15)',
        transition: 'all 300ms ease',
        cursor: 'default',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Live Badge */}
      {isActive && (
        <div
          className="absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1"
          style={{
            background: 'linear-gradient(135deg, #2DA5A0, #3BBFB9)',
          }}
        >
          <span
            className="block w-1.5 h-1.5 rounded-full bg-white animate-pulse"
          />
          <span className="text-[11px] font-bold uppercase tracking-wider text-white">
            Live
          </span>
        </div>
      )}

      {/* Header Row */}
      <div className="flex gap-3 items-start mb-3">
        {/* Icon Circle */}
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: `linear-gradient(135deg, ${source.color}33, ${source.color}59)`,
            border: `1.5px solid ${source.color}4D`,
          }}
        >
          <span
            className="text-[14px] font-extrabold"
            style={{ color: source.color }}
          >
            {source.icon}
          </span>
        </div>

        {/* Name & Category */}
        <div>
          <div className="text-[17px] font-bold text-white">{source.name}</div>
          <div
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: source.color }}
          >
            {source.category}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-[14px] leading-[1.55] text-[#A0AEC0] mb-3.5">
        {source.description}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {source.tags.map((tag) => (
          <TagPill key={tag} label={tag} />
        ))}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-4 mt-4 border-t border-[rgba(255,255,255,0.06)]">
        {/* Left: Toggle + Label */}
        <div className="flex items-center gap-2">
          <ToggleSwitch checked={isActive} onChange={onToggle} />
          <span
            className="text-xs font-semibold"
            style={{ color: isActive ? '#2DA5A0' : '#718096' }}
          >
            {isActive ? 'Activated' : 'Off'}
          </span>
        </div>

        {/* Right: Preview Button */}
        <button
          onClick={onPreview}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] border border-[rgba(255,255,255,0.1)] bg-[rgba(26,39,68,0.5)] text-[#A0AEC0] text-[13px] font-semibold hover:text-white transition-colors"
        >
          Preview
          <ArrowRightCircle size={15} />
        </button>
      </div>
    </div>
  );
}
