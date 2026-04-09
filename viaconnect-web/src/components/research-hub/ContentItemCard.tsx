'use client';

// ContentItemCard — single research item card with relevance + actions.

import { motion } from 'framer-motion';
import { Bookmark, BookmarkCheck, Clock, ExternalLink, X } from 'lucide-react';
import type { ScoredItem } from '@/lib/research-hub/types';
import { RelevanceBadge } from './RelevanceBadge';
import { SherlockInsightAttribution } from './SherlockInsightAttribution';

interface ContentItemCardProps {
  item: ScoredItem;
  onBookmark: (item: ScoredItem) => void;
  onDismiss: (item: ScoredItem) => void;
  onRead?: (item: ScoredItem) => void;
}

const formatRelative = (iso: string | null): string => {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const hours = diff / (1000 * 60 * 60);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export function ContentItemCard({ item, onBookmark, onDismiss, onRead }: ContentItemCardProps) {
  const handleOpen = () => {
    if (onRead) onRead(item);
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={`group flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#1E3054] p-4 transition-all hover:border-white/20 sm:p-5 ${
        item.is_read ? 'opacity-70' : ''
      }`}
    >
      {/* Header: relevance + meta */}
      <div className="flex items-start justify-between gap-3">
        <RelevanceBadge score={item.relevance_score} />
        <div className="flex flex-shrink-0 items-center gap-1 text-[10px] text-white/35">
          <Clock className="h-3 w-3" strokeWidth={1.5} />
          {formatRelative(item.published_at)}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-bold leading-snug text-white sm:text-base">
        {item.title}
      </h3>

      {/* Summary */}
      {item.summary && (
        <p className="line-clamp-3 text-xs leading-relaxed text-white/55 sm:text-[13px]">
          {item.summary}
        </p>
      )}

      {/* Source + matched domains */}
      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-semibold text-white/60">
          {item.source_name}
        </span>
        {item.matched_domains.slice(0, 3).map((d) => (
          <span
            key={d}
            className="rounded-full border border-[#2DA5A0]/20 bg-[#2DA5A0]/10 px-2 py-0.5 text-[#2DA5A0]"
          >
            {d}
          </span>
        ))}
      </div>

      {/* Reasons */}
      {item.relevance_reasons.length > 0 && (
        <div className="rounded-xl border border-[#2DA5A0]/15 bg-[#2DA5A0]/[0.04] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2DA5A0]/80">
            Why it matters to you
          </p>
          <ul className="mt-1 space-y-0.5">
            {item.relevance_reasons.slice(0, 2).map((r, i) => (
              <li key={i} className="text-[11px] leading-snug text-white/55">
                · {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="mt-1 flex items-center gap-2">
        {item.original_url && (
          <a
            href={item.original_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleOpen}
            className="inline-flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-3 py-2 text-xs font-medium text-[#2DA5A0] hover:bg-[#2DA5A0]/20"
          >
            Read
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
          </a>
        )}
        <button
          type="button"
          onClick={() => onBookmark(item)}
          aria-label={item.is_bookmarked ? 'Remove bookmark' : 'Save for later'}
          className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
            item.is_bookmarked
              ? 'border-[#FBBF24]/40 bg-[#FBBF24]/15 text-[#FBBF24]'
              : 'border-white/10 bg-white/[0.04] text-white/40 hover:border-white/20 hover:text-white'
          }`}
        >
          {item.is_bookmarked ? (
            <BookmarkCheck className="h-4 w-4" strokeWidth={1.5} />
          ) : (
            <Bookmark className="h-4 w-4" strokeWidth={1.5} />
          )}
        </button>
        <button
          type="button"
          onClick={() => onDismiss(item)}
          aria-label="Dismiss"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/40 transition-all hover:border-white/20 hover:text-white"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Sherlock attribution (additive — single line, no layout impact) */}
      <SherlockInsightAttribution scoredAt={item.created_at} className="mt-1" />
    </motion.article>
  );
}
