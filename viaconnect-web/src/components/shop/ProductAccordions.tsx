'use client';

/**
 * Prompt 215a: five product accordion sections, always mounted.
 * Pattern matches #152p Accordion (chevron, multi-open, SSR expand).
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Accordion } from './Accordion';
import { GeneticCompatibilityPanel } from './GeneticCompatibilityPanel';
import type { ProductTabContent, ProductTabKey, CompatibilityResult } from '@/lib/shop/productTabs/types';
import { PRODUCT_TAB_KEYS } from '@/lib/shop/productTabs/types';
import {
  SECTION_HEADERS,
  TAB_KEY_TO_HASH,
  resolveSectionHash,
  type SectionHashId,
} from '@/lib/shop/productTabs/resolveSlug';

function renderSimpleMarkdown(md: string): ReactNode {
  const lines = md.split('\n');
  const nodes: ReactNode[] = [];
  let key = 0;
  let list: string[] = [];

  const flushList = () => {
    if (list.length === 0) return;
    nodes.push(
      <ul
        key={`ul-${key++}`}
        className="mt-2 ml-5 list-disc space-y-1.5 text-sm text-white/75 md:text-base"
      >
        {list.map((item, i) => (
          <li key={i} className="leading-relaxed">
            {item.replace(/^\*\*(.+?)\*\*:?\s*/, '$1: ').replace(/\*\*/g, '')}
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
        <h3
          key={`h-${key++}`}
          className="mt-4 text-base font-semibold text-white first:mt-0 md:text-lg"
        >
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
      const html = line.replace(
        /\*\*(.+?)\*\*/g,
        '<strong class="font-semibold text-white">$1</strong>',
      );
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

export interface ProductAccordionsProps {
  productSlug: string;
  sections: ProductTabContent[];
  compatibility: CompatibilityResult;
  /** Initial hash or tab key from server */
  initialHash?: string | null;
}

const KEY_TO_HEADER: Record<ProductTabKey, string> = {
  full_description: SECTION_HEADERS[0],
  ingredient_breakdown: SECTION_HEADERS[1],
  who_benefits: SECTION_HEADERS[2],
  formulation: SECTION_HEADERS[3],
  genetic_compatibility: SECTION_HEADERS[4],
};

export function ProductAccordions({
  productSlug,
  sections,
  compatibility,
  initialHash,
}: ProductAccordionsProps) {
  const byKey = useMemo(() => {
    const m = new Map<ProductTabKey, ProductTabContent>();
    for (const s of sections) m.set(s.tabKey, s);
    return m;
  }, [sections]);

  const [forceHash, setForceHash] = useState<SectionHashId | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw =
      window.location.hash.replace(/^#/, '') ||
      initialHash?.replace(/^#/, '') ||
      new URLSearchParams(window.location.search).get('tab') ||
      '';
    // Prompt 215b: #description primary; #full-description aliased
    const resolved = resolveSectionHash(raw);
    if (resolved) {
      setForceHash(resolved);
      requestAnimationFrame(() => {
        document.getElementById(resolved)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    const onHash = () => {
      const h = resolveSectionHash(window.location.hash.replace(/^#/, ''));
      if (h) {
        setForceHash(h);
        document.getElementById(h)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [initialHash]);

  return (
    <div
      data-testid="product-accordions"
      data-product-slug={productSlug}
      data-section-count="5"
      className="mt-2 border-t border-white/10 pt-2"
    >
      {PRODUCT_TAB_KEYS.map((key, index) => {
        const hash = TAB_KEY_TO_HASH[key];
        const header = KEY_TO_HEADER[key];
        const content = byKey.get(key);
        const isFirst = index === 0;
        const forceExpanded = forceHash === hash;

        return (
          <div key={key} id={hash} className="scroll-mt-24">
            <Accordion
              heading={header}
              id={`pdp-${hash}`}
              defaultExpandedSSR={true}
              defaultOpenAfterHydrate={isFirst || forceExpanded}
              forceExpanded={forceExpanded}
            >
              {key === 'genetic_compatibility' ? (
                <GeneticCompatibilityPanel result={compatibility} />
              ) : (
                <SectionBody content={content} tabKey={key} />
              )}
            </Accordion>
          </div>
        );
      })}
    </div>
  );
}

function SectionBody({
  content,
  tabKey,
}: {
  content?: ProductTabContent;
  tabKey: ProductTabKey;
}) {
  if (!content) {
    return (
      <p data-testid={`section-pending-${tabKey}`} className="text-sm text-white/45">
        Content being finalized.
      </p>
    );
  }

  if (content.gateStatus === 'pending' || content.gateStatus === 'blocked') {
    return (
      <div data-testid={`section-pending-${tabKey}`} className="space-y-2">
        <p className="text-sm text-white/55">
          Content being finalized. This section is awaiting Marshall approval.
        </p>
        {content.gateStatus === 'pending' && content.bodyMd && (
          <div className="opacity-70">{renderSimpleMarkdown(content.bodyMd)}</div>
        )}
      </div>
    );
  }

  return (
    <div data-testid={`section-body-${tabKey}`} className="max-w-3xl">
      {renderSimpleMarkdown(content.bodyMd)}
      {content.lastVerifiedAt && (
        <p className="mt-4 text-[11px] text-white/35">
          Last verified: {new Date(content.lastVerifiedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

export default ProductAccordions;

/** For DOM tests: exact labels in order. */
export function productAccordionHeaders(): readonly string[] {
  return SECTION_HEADERS;
}
