'use client';

/**
 * Prompt 215: uniform five-tab product content shell.
 * Deep-link via ?tab= or #tab=
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  FileText,
  ListTree,
  Users,
  FlaskConical,
  Dna,
  type LucideIcon,
} from 'lucide-react';
import {
  PRODUCT_TAB_KEYS,
  PRODUCT_TAB_LABELS,
  type ProductTabContent,
  type ProductTabKey,
  type CompatibilityResult,
} from '@/lib/shop/productTabs/types';
import { GeneticCompatibilityPanel } from './GeneticCompatibilityPanel';

const TAB_ICONS: Record<ProductTabKey, LucideIcon> = {
  full_description: FileText,
  ingredient_breakdown: ListTree,
  who_benefits: Users,
  formulation: FlaskConical,
  genetic_compatibility: Dna,
};

function parseTabParam(raw: string | null | undefined): ProductTabKey | null {
  if (!raw) return null;
  const cleaned = raw.replace(/^#/, '').replace(/^tab=/, '');
  return (PRODUCT_TAB_KEYS as readonly string[]).includes(cleaned)
    ? (cleaned as ProductTabKey)
    : null;
}

function renderSimpleMarkdown(md: string): ReactNode {
  const lines = md.split('\n');
  const nodes: ReactNode[] = [];
  let key = 0;
  let list: string[] = [];

  const flushList = () => {
    if (list.length === 0) return;
    nodes.push(
      <ul key={`ul-${key++}`} className="mt-2 ml-5 list-disc space-y-1.5 text-sm text-white/75 md:text-base">
        {list.map((item, i) => (
          <li key={i} className="leading-relaxed">
            {item.replace(/^\*\*(.+?)\*\*:?\s*/, (_, n) => `${n}: `).replace(/\*\*/g, '')}
          </li>
        ))}
      </ul>,
    );
    list = [];
  };

  for (const line of lines) {
    if (line.startsWith('## ')) {
      flushList();
      nodes.push(
        <h3 key={`h-${key++}`} className="mt-4 text-base font-semibold text-white first:mt-0 md:text-lg">
          {line.slice(3)}
        </h3>,
      );
      continue;
    }
    if (line.startsWith('- ')) {
      list.push(line.slice(2));
      continue;
    }
    flushList();
    if (line.trim()) {
      const html = line
        .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');
      nodes.push(
        <p
          key={`p-${key++}`}
          className="mt-2 text-sm leading-relaxed text-white/75 md:text-base"
          dangerouslySetInnerHTML={{ __html: html }}
        />,
      );
    }
  }
  flushList();
  return <>{nodes}</>;
}

export interface ProductTabsProps {
  productSlug: string;
  tabs: ProductTabContent[];
  compatibility: CompatibilityResult;
  initialTab?: string | null;
}

export function ProductTabs({
  productSlug,
  tabs,
  compatibility,
  initialTab,
}: ProductTabsProps) {
  const byKey = useMemo(() => {
    const m = new Map<ProductTabKey, ProductTabContent>();
    for (const t of tabs) m.set(t.tabKey, t);
    return m;
  }, [tabs]);

  const [active, setActive] = useState<ProductTabKey>(() => {
    return parseTabParam(initialTab) ?? 'full_description';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fromHash = parseTabParam(window.location.hash.slice(1));
    const fromQuery = parseTabParam(
      new URLSearchParams(window.location.search).get('tab'),
    );
    const next = fromQuery ?? fromHash;
    if (next) setActive(next);
  }, []);

  const select = useCallback(
    (key: ProductTabKey) => {
      setActive(key);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', key);
        url.hash = key;
        window.history.replaceState({}, '', url.toString());
      }
    },
    [],
  );

  const activeContent = byKey.get(active);

  return (
    <div
      data-testid="product-tabs"
      data-product-slug={productSlug}
      className="mt-8 rounded-2xl border border-white/[0.08] bg-[#1E3054]/50 overflow-hidden"
    >
      {/* Desktop tab strip */}
      <div
        role="tablist"
        aria-label="Product information"
        className="hidden md:flex flex-wrap gap-1 border-b border-white/[0.08] p-2 bg-[#1A2744]/60"
      >
        {PRODUCT_TAB_KEYS.map((key) => {
          const Icon = TAB_ICONS[key];
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              id={`tab-${key}`}
              onClick={() => select(key)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium min-h-[40px] transition-colors ${
                isActive
                  ? 'bg-[#2DA5A0]/20 text-[#2DA5A0] border border-[#2DA5A0]/40'
                  : 'text-white/55 hover:text-white/80 border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
              {PRODUCT_TAB_LABELS[key]}
            </button>
          );
        })}
      </div>

      {/* Mobile accordion headers */}
      <div className="md:hidden divide-y divide-white/[0.06]">
        {PRODUCT_TAB_KEYS.map((key) => {
          const Icon = TAB_ICONS[key];
          const open = active === key;
          return (
            <div key={key}>
              <button
                type="button"
                onClick={() => select(key)}
                className="w-full flex items-center gap-2 px-4 py-3 min-h-[44px] text-left"
                aria-expanded={open}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${open ? 'text-[#2DA5A0]' : 'text-white/45'}`}
                  strokeWidth={1.5}
                />
                <span className={`text-sm ${open ? 'text-white font-medium' : 'text-white/65'}`}>
                  {PRODUCT_TAB_LABELS[key]}
                </span>
              </button>
              {open && (
                <div className="px-4 pb-4" role="tabpanel" aria-labelledby={`tab-${key}`}>
                  <TabBody
                    tabKey={key}
                    content={byKey.get(key)}
                    compatibility={compatibility}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop panel */}
      <div className="hidden md:block p-5 md:p-6" role="tabpanel" aria-labelledby={`tab-${active}`}>
        <TabBody
          tabKey={active}
          content={activeContent}
          compatibility={compatibility}
        />
      </div>
    </div>
  );
}

function TabBody({
  tabKey,
  content,
  compatibility,
}: {
  tabKey: ProductTabKey;
  content?: ProductTabContent;
  compatibility: CompatibilityResult;
}) {
  if (tabKey === 'genetic_compatibility') {
    return <GeneticCompatibilityPanel result={compatibility} />;
  }

  if (!content) {
    return <p className="text-sm text-white/45">Content being finalized.</p>;
  }

  if (content.gateStatus === 'pending' || content.gateStatus === 'blocked') {
    return (
      <div data-testid={`tab-pending-${tabKey}`} className="space-y-2">
        <p className="text-sm text-white/55">
          Content being finalized. This section is awaiting Marshall approval and is not thin filler.
        </p>
        {content.gateStatus === 'pending' && content.bodyMd && (
          <p className="text-xs text-white/35">
            Draft on file; live educational claims remain gated.
          </p>
        )}
      </div>
    );
  }

  return (
    <div data-testid={`tab-body-${tabKey}`} className="max-w-3xl">
      {renderSimpleMarkdown(content.bodyMd)}
      {content.lastVerifiedAt && (
        <p className="mt-4 text-[11px] text-white/35">
          Last verified: {new Date(content.lastVerifiedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

export default ProductTabs;
