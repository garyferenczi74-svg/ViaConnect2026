'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, ExternalLink } from 'lucide-react';
import type { Citation } from '@/lib/ai/hannah/ultrathink/evidence';

interface EvidenceFooterProps {
  citations: Citation[];
  sessionId?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  pubmed: 'PubMed',
  internal_protocol: 'FarmCeutica Protocol',
  caq: 'CAQ Assessment',
  gene_panel: 'GeneX360 Panel',
  supplement_db: 'Supplement Database',
  interaction_rule: 'Interaction Rule',
  other: 'Source',
};

export function EvidenceFooter({ citations }: EvidenceFooterProps) {
  const [expanded, setExpanded] = useState(false);

  if (citations.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
      >
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-[#2DA5A0]" strokeWidth={1.5} />
          <span className="text-xs font-medium text-white/60">
            {citations.length} source{citations.length !== 1 ? 's' : ''} cited
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-white/40" strokeWidth={1.5} />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-white/40" strokeWidth={1.5} />
        )}
      </button>

      {expanded && (
        <div className="border-t border-white/[0.04] px-3 py-2 space-y-2">
          {citations.map((c, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.03]"
            >
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-[#2DA5A0]/10 text-[10px] font-semibold text-[#2DA5A0]">
                {c.rank}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-white/70">
                  {c.title || 'Untitled source'}
                </p>
                <p className="text-[10px] text-white/35">
                  {SOURCE_LABELS[c.type] || c.type}
                  {c.id ? ` · ${c.id}` : ''}
                  {c.relevanceScore > 0 ? ` · ${Math.round(c.relevanceScore * 100)}% match` : ''}
                </p>
              </div>
              {c.url && (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 flex-shrink-0 text-white/30 hover:text-[#2DA5A0]"
                  aria-label="Open source"
                >
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
