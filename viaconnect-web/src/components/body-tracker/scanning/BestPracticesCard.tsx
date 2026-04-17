'use client';

import { Lightbulb, Zap } from 'lucide-react';

interface Tip {
  action: string;
  why: string;
  impact: 'critical' | 'high' | 'medium';
}

const TIPS: Tip[] = [
  { action: 'Input accurate height and weight',      why: 'The AI uses height and weight as the foundation for all predictions.',                                 impact: 'critical' },
  { action: 'Pair with a reliable scale',            why: 'Accurate weight is the single biggest factor in AI composition estimates.',                              impact: 'high' },
  { action: 'Use a tape measure monthly',            why: 'Manual circumference readings calibrate the AI model to YOUR body.',                                     impact: 'high' },
  { action: 'Track trends over weeks and months',    why: 'Individual scans have noise; trends across multiple sessions are highly reliable.',                      impact: 'high' },
  { action: 'Scan under consistent conditions',      why: 'Same time of day, same clothing, same lighting, same distance produce the most comparable results.',     impact: 'medium' },
  { action: 'Get a professional scan annually',      why: 'An InBody or DEXA scan once per year calibrates everything else.',                                       impact: 'medium' },
];

const IMPACT_COLOR: Record<Tip['impact'], string> = {
  critical: '#EF4444',
  high:     '#E8803A',
  medium:   '#2DA5A0',
};

export function BestPracticesCard() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/75 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-4 w-4 text-[#E8803A]" strokeWidth={1.5} />
        <h3 className="text-sm font-semibold text-white">Maximize your accuracy</h3>
      </div>
      <ul className="space-y-2">
        {TIPS.map((t, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-white/75 leading-snug">
            <Zap className="h-3.5 w-3.5 flex-none mt-0.5" strokeWidth={1.5} style={{ color: IMPACT_COLOR[t.impact] }} />
            <div>
              <span className="font-medium text-white">{t.action}. </span>
              <span className="text-white/60">{t.why}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
