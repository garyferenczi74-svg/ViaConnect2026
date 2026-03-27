'use client';

import { Check } from 'lucide-react';

interface Supplement {
  name: string;
  dosage: string;
  taken: boolean;
}

interface ProtocolCardProps {
  name: string;
  supplements: Supplement[];
  compliance: number;
  streak: number;
  tokensEarned: number;
}

export function ProtocolCard({
  name,
  supplements,
  compliance,
  streak,
  tokensEarned,
}: ProtocolCardProps) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const progress = (compliance / 100) * circumference;
  const strokeColor =
    compliance >= 70 ? '#27AE60' : compliance >= 40 ? '#F2994A' : '#E74C3C';

  return (
    <div className="glass-v2 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3
          style={{ fontSize: '22px', fontWeight: 600 }}
          className="text-white"
        >
          {name}
        </h3>

        {/* Compliance ring */}
        <div className="relative" style={{ width: 40, height: 40 }}>
          <svg width="40" height="40" viewBox="0 0 40 40">
            <circle
              cx="20"
              cy="20"
              r={radius}
              fill="none"
              stroke="#1A2744"
              strokeWidth="3"
            />
            <circle
              cx="20"
              cy="20"
              r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              strokeLinecap="round"
              transform="rotate(-90 20 20)"
            />
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white"
          >
            {compliance}
          </span>
        </div>
      </div>

      {/* Supplement list */}
      <div className="flex flex-col gap-2">
        {supplements.map((supplement, index) => (
          <div key={index} className="flex items-center gap-3">
            {/* Checkbox */}
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 20,
                height: 20,
                borderRadius: 6,
                border: supplement.taken ? 'none' : '1.5px solid #1E3A5F',
                backgroundColor: supplement.taken ? '#2DA5A0' : 'transparent',
              }}
            >
              {supplement.taken && (
                <Check size={14} color="white" strokeWidth={3} />
              )}
            </div>

            {/* Name */}
            <span
              className={
                supplement.taken
                  ? 'text-sm text-gray-400'
                  : 'text-sm text-white'
              }
            >
              {supplement.name}
            </span>

            {/* Dosage */}
            <span className="text-xs text-gray-500 ml-auto">
              {supplement.dosage}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center mt-4">
        <span className="text-xs text-gray-400">
          🔥 {streak} day streak
        </span>
        <span className="text-xs" style={{ color: '#2DA5A0' }}>
          🪙 {tokensEarned} VT earned
        </span>
      </div>
    </div>
  );
}
