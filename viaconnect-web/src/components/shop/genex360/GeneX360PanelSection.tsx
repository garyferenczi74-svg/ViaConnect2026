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
// Prompt 193a Task T3: the hash now has two levels. `#<panelSlug>` selects a
// panel; `#<panelSlug>/<snpSlug>` additionally expands one GeneX-M SNP (single
// open accordion). The island owns openSnp, parses both levels on mount and on
// hashchange, validates the SNP slug against GENEX_M_SNP_SLUGS (only under
// genex-m), keeps the nested hash in sync with replaceState, and scrolls the
// expanded SNP row (id snp-<slug>, which carries scroll-mt for the sticky
// header) into view. Switching panels via a pill collapses any open SNP and
// drops back to the bare panel hash.
//
// Standing rules honored: tokens only (Deep Navy #1A2744, Teal #2DA5A0, white
// opacity neutrals), Instrument Sans inherited, no emojis, no em or en dashes
// (the pipe in the approved tagline is allowed), TypeScript strict (no any),
// Via Cura is the only consumer brand named here. All window / document access
// is guarded inside effects or event handlers, never during render.

import { useCallback, useEffect, useState } from 'react';
import { GENEX360_PANELS, PANEL_BY_SLUG, PANEL_SLUGS } from '@/data/genex360/panels';
import { GENEX_M_SNP_SLUGS } from '@/data/genex360/genex-m-deep';
import type { PanelSlug } from '@/data/genex360/types';
import { PanelDescriptionCard } from './PanelDescriptionCard';
import { PanelPillTabs } from './PanelPillTabs';

// The set of valid GeneX-M SNP slugs, for O(1) validation of hash part 2.
const GENEX_M_SNP_SLUG_SET = new Set(GENEX_M_SNP_SLUGS);

// The set of valid panel slugs, for own-property safe validation of hash part 1.
// Using a Set (not the `in` operator on PANEL_BY_SLUG) means a crafted hash such
// as #toString or #constructor cannot resolve to an inherited prototype key.
const PANEL_SLUG_SET = new Set<string>(PANEL_SLUGS);

// True when the user prefers reduced motion. Guarded so it is only ever called
// from effects or event handlers (never during render or on the server).
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Parse the two level hash. The fragment is `<panelSlug>` or
// `<panelSlug>/<snpSlug>`. Part 1 is validated against PANEL_BY_SLUG; part 2 is
// only honored when part 1 is genex-m and the slug is a known GeneX-M SNP, else
// the SNP is null. Returns null for the panel when part 1 is unknown.
function parseHash(hash: string): { panel: PanelSlug | null; snp: string | null } {
  const raw = hash.replace(/^#/, '');
  const [panelPart, snpPart] = raw.split('/');

  const panel = PANEL_SLUG_SET.has(panelPart) ? (panelPart as PanelSlug) : null;

  const snp =
    panel === 'genex-m' && snpPart && GENEX_M_SNP_SLUG_SET.has(snpPart) ? snpPart : null;

  return { panel, snp };
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

// Scroll an expanded SNP row into view. The row carries id snp-<slug> with
// scroll-mt-[80px] so the sticky header offset is handled for us. Honors reduced
// motion.
function scrollToSnp(snpSlug: string) {
  if (typeof document === 'undefined') return;
  document.getElementById(`snp-${snpSlug}`)?.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start',
  });
}

export function GeneX360PanelSection() {
  // Default to genex-m for deterministic SSR; never read window during render.
  const [activeSlug, setActiveSlug] = useState<PanelSlug>('genex-m');

  // Prompt 193a: the single open GeneX-M SNP slug (null = none). Only ever set
  // when the active panel is genex-m and the slug is a known GeneX-M SNP.
  const [openSnp, setOpenSnp] = useState<string | null>(null);

  // Adopt the hash into state: activate the panel from part 1 and expand the SNP
  // from part 2. scrollOnAdopt controls whether we ALSO scroll the target into
  // view. It is false on the initial mount, so a page load (or a dev HMR reload
  // that keeps a leftover hash from an earlier pill or SNP interaction) never
  // yanks the page down to that target; the page loads at the top showing the
  // explorer header. It is true on a deliberate hashchange (browser back /
  // forward, a pasted in page anchor). A bare or unknown hash leaves us on
  // genex-m with no open SNP and never scrolls.
  const adoptHash = useCallback((scrollOnAdopt: boolean) => {
    const { panel, snp } = parseHash(window.location.hash);
    if (!panel) {
      setOpenSnp(null);
      return;
    }
    setActiveSlug(panel);
    setOpenSnp(snp);
    if (!scrollOnAdopt) return;
    if (snp) {
      // Wait one frame so the SNP row is painted before scrolling to it.
      requestAnimationFrame(() => scrollToSnp(snp));
    } else {
      scrollToCard(panel);
    }
  }, []);

  // On mount, adopt the deep link into state WITHOUT scrolling, so a page load or
  // a dev HMR reload lands at the top rather than auto scrolling to a leftover
  // hash target.
  useEffect(() => {
    adoptHash(false);
  }, [adoptHash]);

  // A deliberate hash change (browser back / forward, an external in page anchor,
  // a pasted link) adopts the new target AND scrolls it into view.
  useEffect(() => {
    const onHashChange = () => adoptHash(true);
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [adoptHash]);

  // Pill selection: flip the panel, collapse any open SNP and drop the nested
  // hash, update the hash with replaceState (never a history push, so the back
  // button stays clean), then smooth scroll the card.
  const onSelect = useCallback((slug: PanelSlug) => {
    setActiveSlug(slug);
    setOpenSnp(null);
    window.history.replaceState(null, '', `#${slug}`);
    scrollToCard(slug);
  }, []);

  // SNP disclosure toggle: single open accordion. Opening one collapses any
  // other. The nested hash is kept in sync with replaceState: `#<panel>/<snp>`
  // when opening, `#<panel>` when collapsing. When opening, scroll the SNP row
  // into view (honoring reduced motion).
  const onToggleSnp = useCallback(
    (snpSlug: string) => {
      setOpenSnp((prev) => {
        const next = prev === snpSlug ? null : snpSlug;
        if (next) {
          window.history.replaceState(null, '', `#${activeSlug}/${next}`);
          scrollToSnp(next);
        } else {
          window.history.replaceState(null, '', `#${activeSlug}`);
        }
        return next;
      });
    },
    [activeSlug],
  );

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

      {/* The single active card. openSnp and onToggleSnp drive the GeneX-M per
          SNP disclosures; they are inert on panels whose markers carry no
          deepReport. */}
      <PanelDescriptionCard
        panel={activePanel}
        onBackToPanels={handleBack}
        openSnpSlug={openSnp}
        onToggleSnp={onToggleSnp}
      />

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
