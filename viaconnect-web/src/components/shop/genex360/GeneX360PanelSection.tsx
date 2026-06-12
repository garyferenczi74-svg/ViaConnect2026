'use client';

// Prompt 193 Task T3 (2026-06-12): the interactive island for the GENEX360 per
// panel description cards on /shop/genex360. This is the integration keystone.
//
// It composes the pill tabs + the single active card + hidden anchor stubs, and
// owns all state, hash, and scroll behavior (Pattern A: one active card at a
// time). The page renders this client island via ShopCategoryPage's belowHeader
// prop, so the page itself stays a server component.
//
// Deep linking: every one of the six slugs stays addressable. The active slug's
// id lives on the full card; the other five live on sr-only stubs, so #genex-m
// etc. resolve for shared links and screen readers with no duplicate ids.
//
// History: tab changes use history.replaceState (never a history push) so the
// browser back button is not polluted on every tab switch. A bare load with no
// hash stays on genex-m and does not scroll. A hash on load or a later
// hashchange syncs the active slug and scrolls the matching card.
//
// Standing rules honored: tokens only (Deep Navy #1A2744, Teal #2DA5A0, white
// opacity neutrals), Instrument Sans inherited, no emojis, no em or en dashes
// (the pipe in the approved tagline is allowed), TypeScript strict (no any),
// Via Cura is the only consumer brand named here. All window / document access
// is guarded inside effects or event handlers, never during render.

import { useCallback, useEffect, useState } from 'react';
import { GENEX360_PANELS, PANEL_BY_SLUG } from '@/data/genex360/panels';
import type { PanelSlug } from '@/data/genex360/types';
import { PanelDescriptionCard } from './PanelDescriptionCard';
import { PanelPillTabs } from './PanelPillTabs';

// True when the user prefers reduced motion. Guarded so it is only ever called
// from effects or event handlers (never during render or on the server).
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Narrow an arbitrary hash fragment to a known panel slug, or null.
function slugFromHash(hash: string): PanelSlug | null {
  const candidate = hash.replace(/^#/, '');
  if (candidate in PANEL_BY_SLUG) {
    return candidate as PanelSlug;
  }
  return null;
}

// Scroll a card into view, honoring reduced motion. The card carries
// scroll-mt-[80px] so the sticky header offset is handled for us.
function scrollToCard(slug: PanelSlug) {
  if (typeof document === 'undefined') return;
  document.getElementById(slug)?.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start',
  });
}

export function GeneX360PanelSection() {
  // Default to genex-m for deterministic SSR; never read window during render.
  const [activeSlug, setActiveSlug] = useState<PanelSlug>('genex-m');

  // On mount, adopt a deep link if the hash names a known panel, and scroll to
  // it after hydration. A bare or unknown hash leaves us on genex-m and does not
  // scroll.
  useEffect(() => {
    const target = slugFromHash(window.location.hash);
    if (target) {
      setActiveSlug(target);
      scrollToCard(target);
    }
  }, []);

  // Keep the active slug in sync with later hash changes (browser nav, an
  // external in page anchor, a pasted link) and scroll to the card.
  useEffect(() => {
    function onHashChange() {
      const target = slugFromHash(window.location.hash);
      if (target) {
        setActiveSlug(target);
        scrollToCard(target);
      }
    }
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  // Pill selection: flip state, update the hash with replaceState (never a
  // history push, so the back button stays clean), then smooth scroll the card.
  const onSelect = useCallback((slug: PanelSlug) => {
    setActiveSlug(slug);
    window.history.replaceState(null, '', `#${slug}`);
    scrollToCard(slug);
  }, []);

  // Back to panels: move focus to the active pill and scroll the pill row into
  // view. This is what PanelDescriptionCard's onBackToPanels calls.
  const handleBack = useCallback(() => {
    document.getElementById(`genex360-tab-${activeSlug}`)?.focus();
    document.getElementById('genex360-panels')?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    });
  }, [activeSlug]);

  const activePanel = PANEL_BY_SLUG[activeSlug];

  return (
    <section aria-labelledby="genex360-panels-heading" className="mb-12 lg:mb-16">
      {/* Section header above the pills. Neutral, on brand copy; the approved
          tagline uses a pipe (not a dash) and is rendered verbatim. */}
      <div className="mb-6 space-y-1">
        <h2 id="genex360-panels-heading" className="text-xl font-bold text-white sm:text-2xl">
          Explore the panels
        </h2>
        <p className="text-sm font-medium text-[#2DA5A0]">Your Genetics | Your Protocol</p>
      </div>

      {/* Pill tablist. */}
      <div className="mb-6">
        <PanelPillTabs panels={GENEX360_PANELS} activeSlug={activeSlug} onSelect={onSelect} />
      </div>

      {/* The single active card. */}
      <PanelDescriptionCard panel={activePanel} onBackToPanels={handleBack} />

      {/* Hidden anchor stubs for every non active slug so all six slugs stay
          addressable for shared links and screen readers. The active slug's id
          lives on the card above, so there are never duplicate ids. */}
      {GENEX360_PANELS.filter((panel) => panel.slug !== activeSlug).map((panel) => (
        <div key={panel.slug} id={panel.slug} aria-hidden="true" className="sr-only" />
      ))}

      {/* Visually hidden live region announcing the active panel to screen
          readers as the selection changes. */}
      <p aria-live="polite" className="sr-only">
        {`Showing ${activePanel.displayName} panel`}
      </p>
    </section>
  );
}

export default GeneX360PanelSection;
