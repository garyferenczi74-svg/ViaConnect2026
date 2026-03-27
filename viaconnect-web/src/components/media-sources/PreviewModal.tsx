'use client';

import React from 'react';
import { X } from 'lucide-react';
import { MediaSource } from './sourceData';

interface PreviewModalProps {
  source: MediaSource | null;
  onClose: () => void;
}

export default function PreviewModal({ source, onClose }: PreviewModalProps) {
  if (!source) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
      style={{
        background: 'rgba(13,21,32,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        className="relative w-full max-w-[640px] max-h-[85vh] overflow-auto rounded-3xl border border-[rgba(255,255,255,0.08)]"
        style={{
          background: '#131D2E',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 flex items-center justify-center rounded-[10px] border border-[rgba(255,255,255,0.1)] text-[#718096] hover:text-white transition-colors"
          style={{ width: 36, height: 36 }}
        >
          <X size={18} />
        </button>

        {/* Header Section */}
        <div
          className="px-8 pt-7 pb-5 border-b border-[rgba(255,255,255,0.06)]"
          style={{
            background: `linear-gradient(135deg, ${source.color}0D, ${source.color}05)`,
          }}
        >
          <div className="flex items-center gap-3 mb-2">
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

            <div>
              <div className="text-[22px] font-bold text-white">{source.name}</div>
              <div className="text-[14px] text-[#A0AEC0]">
                Latest headlines &amp; summaries
              </div>
            </div>
          </div>
        </div>

        {/* Headlines Section */}
        <div className="px-8 py-5 space-y-3">
          {source.mockHeadlines.map((headline, index) => (
            <div
              key={index}
              className="p-4 rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[rgba(26,39,68,0.45)]"
            >
              <div className="text-xs font-semibold text-[#718096] mb-1.5">
                {headline.date}
              </div>
              <div className="text-[15px] font-bold text-white leading-snug mb-1.5">
                {headline.title}
              </div>
              <div className="text-[13px] leading-[1.55] text-[#A0AEC0]">
                {headline.summary}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Note */}
        <div className="px-8 pb-6 text-center">
          <p className="text-[13px] text-[#718096]">
            Activate this source to receive daily updates in your Insights feed &rarr;
          </p>
        </div>
      </div>
    </div>
  );
}
