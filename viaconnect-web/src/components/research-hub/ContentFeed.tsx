'use client';

// ContentFeed — feed list of scored research items with empty state.

import { AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import type { ScoredItem } from '@/lib/research-hub/types';
import { ContentItemCard } from './ContentItemCard';

interface ContentFeedProps {
  items: ScoredItem[];
  onBookmark: (item: ScoredItem) => void;
  onDismiss: (item: ScoredItem) => void;
  onRead: (item: ScoredItem) => void;
}

export function ContentFeed({ items, onBookmark, onDismiss, onRead }: ContentFeedProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center">
        <Search className="h-8 w-8 text-white/30" strokeWidth={1.5} />
        <p className="text-sm font-semibold text-white">No items match your filters</p>
        <p className="max-w-xs text-xs text-white/40">
          Try lowering the relevance threshold or activating more sources.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <AnimatePresence>
        {items.map((item) => (
          <ContentItemCard
            key={item.id}
            item={item}
            onBookmark={onBookmark}
            onDismiss={onDismiss}
            onRead={onRead}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
