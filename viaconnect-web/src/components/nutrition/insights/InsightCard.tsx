'use client';

// Prompt 192 Task 4: one insight card on /nutrition/insights. Renders the
// type icon, title, confidence chip, relative timestamp, body, the optional
// CLEARLY SEPARATED product suggestion block, the expandable "Why am I seeing
// this" snapshot rows, and the Save / Dismiss / Helpful actions. The severity
// accent is a left border and icon tint: brand Orange for 'attention' ONLY,
// brand Teal for 'positive', neutral for 'info' (the token hexes live in the
// two maps below); the surface itself stays on the Card #1E3054 token. The
// expander is the established in flow framer motion height auto pattern with
// a reduced motion instant swap.

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bookmark, ChevronDown, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import type { InsightSeverity } from '@/lib/nutrition/insights/types';
import { INSIGHT_TYPE_ICONS } from './insightIcons';
import { relativeTimestamp, snapshotToRows, type InsightRow } from './insightsView';

const SEVERITY_LEFT_BORDER: Record<InsightSeverity, string> = {
  attention: 'border-l-[#B75E18]',
  positive: 'border-l-[#2DA5A0]',
  info: 'border-l-white/15',
};

const SEVERITY_ICON_TINT: Record<InsightSeverity, string> = {
  attention: 'text-[#B75E18]',
  positive: 'text-[#2DA5A0]',
  info: 'text-white/70',
};

export interface InsightCardProps {
  insight: InsightRow;
  onDismiss: (insight: InsightRow) => void;
  onToggleSave: (insight: InsightRow) => void;
  onFeedback: (insight: InsightRow, helpful: boolean) => void;
}

export function InsightCard({ insight, onDismiss, onToggleSave, onFeedback }: InsightCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [voted, setVoted] = useState(false);
  const reduced = useReducedMotion() ?? false;

  const Icon = INSIGHT_TYPE_ICONS[insight.insight_type];
  const saved = insight.status === 'saved';
  const snapshotRows = snapshotToRows(insight.data_snapshot);
  const stamp = relativeTimestamp(insight.generated_at);
  const confidenceLabel = `${insight.confidence.charAt(0).toUpperCase()}${insight.confidence.slice(1)} confidence`;
  const whyId = `insight-why-${insight.id}`;

  return (
    <article
      className={`rounded-xl border border-white/10 border-l-2 ${SEVERITY_LEFT_BORDER[insight.severity]} bg-[#1E3054]/55 p-4 backdrop-blur-md md:p-5`}
    >
      {/* Header: type icon, title, confidence chip, relative timestamp. */}
      <div className="flex items-start gap-3">
        <Icon
          aria-hidden="true"
          className={`mt-0.5 h-5 w-5 flex-none ${SEVERITY_ICON_TINT[insight.severity]}`}
          strokeWidth={1.5}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-[14px] font-semibold leading-snug text-white">{insight.title}</h3>
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-white/65">
              {confidenceLabel}
            </span>
            {stamp ? <span className="text-[11px] tabular-nums text-white/45">{stamp}</span> : null}
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">{insight.body}</p>
        </div>
      </div>

      {/* Product suggestion: a clearly separated secondary block below the
          body, never inline in the body text. Educational framing from the
          stored name + reason; the shop Link renders only when a slug exists. */}
      {insight.product_suggestion ? (
        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
            Related from the shop
          </p>
          <p className="mt-1 text-[13px] font-semibold text-white">
            {insight.product_suggestion.name}
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-white/60">
            {insight.product_suggestion.reason}
          </p>
          {insight.product_suggestion.slug ? (
            <Link
              href={`/shop/product/${insight.product_suggestion.slug}`}
              className="mt-2 inline-flex items-center text-[12px] font-medium text-[#2DA5A0] transition-colors hover:underline"
            >
              View in the shop
            </Link>
          ) : null}
        </div>
      ) : null}

      {/* Why am I seeing this: in flow height auto expand over the humanized
          data_snapshot rows, never raw JSON. */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-controls={whyId}
        className="mt-3 inline-flex items-center gap-1 rounded text-[12px] font-medium text-white/55 transition-colors hover:text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70"
      >
        <span>Why am I seeing this</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none ${
            expanded ? 'rotate-180' : 'rotate-0'
          }`}
          strokeWidth={1.5}
        />
      </button>
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key={whyId}
            id={whyId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.24, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <dl className="mt-2 space-y-1 rounded-lg border border-white/10 bg-[#1A2744]/40 p-3">
              {snapshotRows.map((row, i) => (
                <div key={i} className="flex items-baseline justify-between gap-3">
                  <dt className="text-[11px] text-white/45">{row.label}</dt>
                  <dd className="text-right text-[12px] tabular-nums text-white/80">{row.value}</dd>
                </div>
              ))}
              {snapshotRows.length === 0 ? (
                <div className="text-[12px] text-white/45">No extra detail for this one</div>
              ) : null}
            </dl>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Actions: Save / Unsave, Dismiss (undo handled by the container),
          Helpful yes / no with a quiet thanks after the vote. */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3">
        <button
          type="button"
          onClick={() => onToggleSave(insight)}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70"
        >
          <Bookmark
            aria-hidden="true"
            className={`h-3.5 w-3.5 ${saved ? 'fill-[#2DA5A0] text-[#2DA5A0]' : ''}`}
            strokeWidth={1.5}
          />
          <span>{saved ? 'Unsave' : 'Save'}</span>
        </button>
        <button
          type="button"
          onClick={() => onDismiss(insight)}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70"
        >
          <X aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span>Dismiss</span>
        </button>
        <div className="ml-auto flex items-center gap-1.5">
          {voted ? (
            <span className="text-[11px] text-white/50">Thanks</span>
          ) : (
            <>
              <span className="text-[11px] text-white/40">Helpful?</span>
              <button
                type="button"
                onClick={() => {
                  setVoted(true);
                  onFeedback(insight, true);
                }}
                aria-label="This insight was helpful"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition-colors hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70"
              >
                <ThumbsUp className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setVoted(true);
                  onFeedback(insight, false);
                }}
                aria-label="This insight was not helpful"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition-colors hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70"
              >
                <ThumbsDown className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export default InsightCard;
