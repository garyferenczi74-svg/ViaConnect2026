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
// panel; `#<panelSlug>/<snpSlug>` additionally expands one GeneXM SNP (single
// open accordion). The island owns openSnp, parses both levels on mount and on
// hashchange, validates the SNP slug against GENEX_M_SNP_SLUGS (only under
// genex-m), keeps the nested hash in sync with replaceState, and scrolls the
// expanded SNP row (id snp-<slug>, which carries scroll-mt for the sticky
// header) into view. Switching panels via a pill collapses any open SNP and
// drops back to the bare panel hash.
//
// Prompt 193c Task T3 (config-driven reconciliation): the Report pill on Your
// Variants deep links here as `#<panelSlug>/<geneSlug>/<rsid>` (three nested hash
// segments; the rsID is the third segment per ANCHOR_SCHEME = "rsid" in
// variantReport.config.ts). parseHash is a single split on "/" into panel, gene,
// and the optional variant rsid. The island owns highlightRsid and, when a
// variant rsid is present, opens the gene, scrolls to the variant sub block (id
// variant-<rsid>) on the next frame, and threads highlightRsid to the card so
// SnpDeepReport applies a soft non-alarm teal ring to that variant. Crucially the
// variant deep link is the ONLY new mount-scroll case: a bare panel or gene hash
// on mount still does NOT scroll (the 491cb489 fix holds). Clicking a pill or
// toggling a SNP clears the highlight.
//
// Standing rules honored: tokens only (Deep Navy #1A2744, Teal #2DA5A0, white
// opacity neutrals), Instrument Sans inherited, no emojis, no em or en dashes
// (the pipe in the approved tagline is allowed), TypeScript strict (no any),
// Via Cura is the only consumer brand named here. All window / document access
// is guarded inside effects or event handlers, never during render.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { GENEX360_PANELS, PANEL_BY_SLUG, PANEL_SLUGS } from '@/data/genex360/panels';
import { GENEX_M_SNP_SLUGS } from '@/data/genex360/genex-m-deep';
import type { PanelSlug } from '@/data/genex360/types';
import { PanelDescriptionCard } from './PanelDescriptionCard';
import { PanelPillTabs } from './PanelPillTabs';
import { useGeneticsVariants } from '@/components/genetics/hub/useGeneticsVariants';
import type { SeverityTier } from '@/lib/genetics/severity';
import { useCurrentUser } from '@/components/body-tracker/manual-input/useCurrentUser';
import {
  useUserBiologicalSex,
  type BiologicalSex,
} from '@/hooks/body-tracker/useUserBiologicalSex';

// The set of valid GeneXM SNP slugs, for O(1) validation of hash part 2.
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

// Parse the nested hash (Prompt 193c Task T3, config-driven reconciliation). The
// fragment is `<panelSlug>`, `<panelSlug>/<snpSlug>`, or
// `<panelSlug>/<snpSlug>/<rsid>`, for example `genex-m/mthfr/rs1801133`. It is a
// single split on "/" into three parts. Part 1 is validated against
// PANEL_SLUG_SET; part 2 is only honored when part 1 is genex-m and the slug is a
// known GeneXM SNP, else the SNP is null; part 3 (the variant rsid) is only
// honored when a valid gene precedes it. The island writes its own one and two
// segment hashes (a pill select or SNP toggle), which parse cleanly with
// variantRsid null, so navigating by click clears any prior highlight.
function parseHash(hash: string): {
  panel: PanelSlug | null;
  snp: string | null;
  variantRsid: string | null;
} {
  const raw = hash.replace(/^#/, '');

  const [panelPart, snpPart, variantPart] = raw.split('/');

  const panel = PANEL_SLUG_SET.has(panelPart) ? (panelPart as PanelSlug) : null;

  const snp =
    panel === 'genex-m' && snpPart && GENEX_M_SNP_SLUG_SET.has(snpPart) ? snpPart : null;

  // The variant rsid is the third segment, honored only under a valid gene.
  const variantRsid = snp && variantPart ? variantPart : null;

  return { panel, snp, variantRsid };
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

// Prompt 193c Task T3: scroll a specific variant sub block into view. The block
// carries id variant-<rsid> with scroll-mt-[80px] so the sticky header offset is
// handled for us. Honors reduced motion. Used only for the deliberate Report
// pill deep link (a hash carrying a third variant rsid segment).
function scrollToVariant(rsid: string) {
  if (typeof document === 'undefined') return;
  document.getElementById(`variant-${rsid}`)?.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start',
  });
}

// Prompt 204i fix: when arriving via a Report deep link, the gene accordion opens
// with a framer-motion height animation (PanelMarkerGroup) and the variant sub
// block starts at the collapsed position, so a single next-frame scroll lands
// above the SNP and the page is left short of the target. Wait until the variant
// block's position holds steady for one frame (the accordion has finished
// expanding) and THEN scroll, so it lands ON the SNP. No magic-number delay: this
// adapts to the actual animation, to reduced motion (the element is at its final
// position immediately), and to any late layout settle on a fresh cross-route
// navigation. Capped so it never loops indefinitely.
function scrollToVariantWhenSettled(rsid: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  let lastTop = Number.NaN;
  let frames = 0;
  const MAX_FRAMES = 40; // ~650ms ceiling, well past the 200ms accordion expand
  const tick = () => {
    const el = document.getElementById(`variant-${rsid}`);
    if (el) {
      const top = el.getBoundingClientRect().top;
      if (top === lastTop) {
        // Two consecutive frames at the same position: the expand has settled.
        scrollToVariant(rsid);
        return;
      }
      lastTop = top;
    }
    if (frames < MAX_FRAMES) {
      frames += 1;
      requestAnimationFrame(tick);
    }
  };
  requestAnimationFrame(tick);
}

export function GeneX360PanelSection() {
  // Default to genex-m for deterministic SSR; never read window during render.
  const [activeSlug, setActiveSlug] = useState<PanelSlug>('genex-m');

  // Prompt 193a: the single open GeneXM SNP slug (null = none). Only ever set
  // when the active panel is genex-m and the slug is a known GeneXM SNP.
  const [openSnp, setOpenSnp] = useState<string | null>(null);

  // Prompt 193c Task T3: the variant rsid to highlight (null = none). Set when a
  // hash carries a variant rsid third segment (the deliberate Report pill deep
  // link), cleared when
  // the user navigates by clicking a pill or toggling a SNP (they are no longer
  // landing from a deep link). Threaded down to the card so SnpDeepReport can
  // apply a soft non-alarm teal ring to the matching variant sub block.
  const [highlightRsid, setHighlightRsid] = useState<string | null>(null);

  // Adopt the hash into state: activate the panel from part 1, expand the SNP
  // from part 2, and record any variant rsid from part 3. scrollOnAdopt
  // controls whether we ALSO scroll on a bare panel or gene hash. It is false on
  // the initial mount, so a page load (or a dev HMR reload that keeps a leftover
  // hash from an earlier pill or SNP interaction) never yanks the page down to
  // that target; the page loads at the top showing the explorer header. It is
  // true on a deliberate hashchange (browser back / forward, a pasted in page
  // anchor). A bare or unknown hash leaves us on genex-m with no open SNP and
  // never scrolls.
  //
  // The ONLY new mount-scroll case is a hash carrying a variant rsid (the
  // deliberate Report pill deep link): scrolling is gated on
  // `scrollOnAdopt || variantRsid`, so a variant deep link scrolls to the
  // variant even on mount, while a bare panel or gene hash on mount still does
  // NOT scroll (the commit 491cb489 no-auto-scroll-on-load fix is preserved).
  const adoptHash = useCallback((scrollOnAdopt: boolean) => {
    const { panel, snp, variantRsid } = parseHash(window.location.hash);
    if (!panel) {
      setOpenSnp(null);
      setHighlightRsid(null);
      return;
    }
    setActiveSlug(panel);
    setOpenSnp(snp);
    setHighlightRsid(variantRsid);
    if (!scrollOnAdopt && !variantRsid) return;
    if (variantRsid) {
      // Scroll once the gene disclosure has finished expanding so we land ON the
      // variant sub block, not its collapsed position (Prompt 204i).
      scrollToVariantWhenSettled(variantRsid);
    } else if (snp) {
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
  // hash, clear any variant highlight (the user is navigating by click, no
  // longer landing from a deep link), update the hash with replaceState (never a
  // history push, so the back button stays clean), then smooth scroll the card.
  const onSelect = useCallback((slug: PanelSlug) => {
    setActiveSlug(slug);
    setOpenSnp(null);
    setHighlightRsid(null);
    window.history.replaceState(null, '', `#${slug}`);
    scrollToCard(slug);
  }, []);

  // SNP disclosure toggle: single open accordion. Opening one collapses any
  // other. The nested hash is kept in sync with replaceState: `#<panel>/<snp>`
  // when opening, `#<panel>` when collapsing. When opening, scroll the SNP row
  // into view (honoring reduced motion).
  const onToggleSnp = useCallback(
    (snpSlug: string) => {
      // Clear any variant highlight: the user is navigating by clicking, no
      // longer landing from a deep link. The bare nested hash carries no v param.
      setHighlightRsid(null);
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

  // Prompt 204g: the member's severity by rsID for the Full Report cross
  // reference. useGeneticsVariants is fail-open (empty on any failure), so the
  // map is simply empty when there is no upload, no auth, or no validated tier
  // yet, never an error. SnpDeepReport shows a pill only for an rsID present here.
  const { data: variantsData } = useGeneticsVariants();
  const severityByRsid = useMemo(() => {
    const map = new Map<string, SeverityTier | null>();
    for (const rows of Object.values(variantsData.variantsByPanel)) {
      for (const row of rows ?? []) {
        if (row.rsid) map.set(row.rsid.toLowerCase(), row.severity);
      }
    }
    return map;
  }, [variantsData]);

  // Prompt 204i (Gary 2026-06-19): the member's biological sex, for X-linked
  // variants (MAOA). Only trusted when it comes from an explicit source (a manual
  // override or the CAQ assessment); the hook defaults to 'male' when unknown, so
  // 'default' / 'caq_other' resolve to null here and the report falls back to the
  // safe no-mark behavior rather than assuming a sex. Threaded down to
  // SnpDeepReport, which keys MAOA row handling on it.
  const { id: userId } = useCurrentUser();
  const { sex, source } = useUserBiologicalSex(userId);
  const userSex: BiologicalSex | null =
    source === 'override' || source === 'caq' ? sex : null;

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

      {/* The single active card. openSnp and onToggleSnp drive the GeneXM per
          SNP disclosures; they are inert on panels whose markers carry no
          deepReport. highlightRsid soft highlights the variant a Report pill deep
          link targeted (null otherwise). */}
      <PanelDescriptionCard
        panel={activePanel}
        onBackToPanels={handleBack}
        openSnpSlug={openSnp}
        onToggleSnp={onToggleSnp}
        highlightRsid={highlightRsid}
        severityByRsid={severityByRsid}
        userSex={userSex}
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
