'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Brain,
  AlertTriangle,
  Shield,
  Trophy,
  Radio,
  X,
  ChevronRight,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

type InsightType = 'plan_adjustment' | 'prediction' | 'interaction' | 'milestone' | 'briefing';
type Urgency = 'normal' | 'attention' | 'critical';

interface ProactiveInsightCardProps {
  type: InsightType;
  title: string;
  summary: string;
  urgency?: Urgency;
  actions?: Array<{ label: string; route: string }>;
  geneticBadge?: { gene: string; variant: string };
  dismissable?: boolean;
  onDismiss?: () => void;
}

// ── Icon Map ─────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<InsightType, React.ElementType> = {
  plan_adjustment: Brain,
  prediction: AlertTriangle,
  interaction: Shield,
  milestone: Trophy,
  briefing: Radio,
};

// ── Urgency Styles ───────────────────────────────────────────────────────────

function getUrgencyBorder(urgency: Urgency): React.CSSProperties {
  switch (urgency) {
    case 'critical':
      return {
        borderLeft: '3px solid #EF4444',
        boxShadow: '0 0 12px rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 0.25)',
      };
    case 'attention':
      return {
        borderLeft: '3px solid #F59E0B',
      };
    case 'normal':
    default:
      return {
        borderLeft: '3px solid #2DA5A0',
      };
  }
}

function getCardClass(urgency: Urgency): string {
  if (urgency === 'critical') {
    return 'glass-v2';
  }
  return 'glass-v2';
}

// ── Component ────────────────────────────────────────────────────────────────

export function ProactiveInsightCard({
  type,
  title,
  summary,
  urgency = 'normal',
  actions,
  geneticBadge,
  dismissable = true,
  onDismiss,
}: ProactiveInsightCardProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const Icon = TYPE_ICONS[type];
  const cardClass = getCardClass(urgency);
  const borderStyle = getUrgencyBorder(urgency);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={`${cardClass} p-4 rounded-xl`}
      style={{
        ...borderStyle,
      }}
    >
      {/* Top row */}
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-full"
          style={{
            width: 32,
            height: 32,
            background: 'rgba(45, 165, 160, 0.15)',
            color: '#2DA5A0',
          }}
        >
          <Icon className="w-4 h-4" />
        </div>

        <span className="flex-1 text-sm font-semibold text-white leading-snug pt-1">
          {title}
        </span>

        {dismissable && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-300 transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Summary */}
      <p className="text-body-sm text-secondary mt-2 leading-relaxed">
        {summary}
      </p>

      {/* Genetic badge */}
      {geneticBadge && (
        <div className="mt-2">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono"
            style={{ background: 'rgba(45,165,160,0.1)', color: '#2DA5A0' }}
          >
            {geneticBadge.gene} {geneticBadge.variant}
          </span>
        </div>
      )}

      {/* Action links */}
      {actions && actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mt-3">
          {actions.map((action) => (
            <Link
              key={action.route}
              href={action.route}
              className="flex items-center gap-1 text-xs font-medium transition-colors hover:brightness-110"
              style={{ color: '#2DA5A0' }}
            >
              {action.label}
              <ChevronRight className="w-3 h-3" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
