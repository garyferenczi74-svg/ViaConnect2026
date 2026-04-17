'use client';

import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

interface ScanQualityIndicatorProps {
  score: number;
  issues: string[];
}

export function ScanQualityIndicator({ score, issues }: ScanQualityIndicatorProps) {
  const tier = score >= 0.8 ? 'excellent' : score >= 0.6 ? 'good' : score >= 0.4 ? 'fair' : 'poor';
  const color = tier === 'excellent' ? '#22C55E' : tier === 'good' ? '#2DA5A0' : tier === 'fair' ? '#E8803A' : '#EF4444';
  const label = tier.charAt(0).toUpperCase() + tier.slice(1);
  const Icon = tier === 'excellent' ? CheckCircle2 : tier === 'poor' ? AlertCircle : AlertTriangle;

  const humanIssues = issues.map(humanize).filter(Boolean);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 flex items-start gap-3">
      <Icon className="h-5 w-5 flex-none mt-0.5" strokeWidth={1.5} style={{ color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Scan quality: {label}</span>
          <span className="text-xs font-mono" style={{ color }}>{Math.round(score * 100)}</span>
        </div>
        {humanIssues.length > 0 && (
          <ul className="mt-1 text-[11px] text-white/60 space-y-0.5 leading-snug list-disc list-inside">
            {humanIssues.slice(0, 3).map((h, i) => <li key={i}>{h}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

function humanize(issue: string): string {
  if (issue.startsWith('missing_landmark_')) {
    const rest = issue.replace('missing_landmark_', '').replace(/_/g, ' ');
    return `Missing ${rest}, retake with that region more visible`;
  }
  if (issue.startsWith('low_visibility_')) {
    const rest = issue.replace('low_visibility_', '').replace(/_/g, ' ');
    return `Low visibility on ${rest}, adjust lighting or clothing`;
  }
  if (issue.startsWith('subject_too_far_')) {
    const pose = issue.replace('subject_too_far_', '');
    return `Subject too far in ${pose} view, move 1 to 2 feet closer`;
  }
  if (issue.startsWith('subject_too_close_')) {
    const pose = issue.replace('subject_too_close_', '');
    return `Subject too close in ${pose} view, step back`;
  }
  if (issue.startsWith('no_scale_')) {
    const pose = issue.replace('no_scale_', '');
    return `Cannot compute scale for ${pose}, verify your height in profile and frame the full body`;
  }
  if (issue === 'insufficient_poses') {
    return 'Capture all 4 poses for the most accurate scan';
  }
  return '';
}
