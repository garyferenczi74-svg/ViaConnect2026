'use client';

/**
 * src/components/formavision/AnchorEntryEntryPoint.tsx
 *
 * Task 211b-W3d - the single mount point for anchor ENTRY (tape guided flow +
 * DEXA/clinic import), surfaced from the body-composition measurements area
 * near PersonalPrecisionPanel.tsx (which stays presentation-only and is not
 * edited by this task).
 *
 * HONESTY (the point of this component):
 *   - Collapsed by default. A user who never opens this control writes
 *     nothing and the page is unchanged, matching PersonalPrecisionPanel's
 *     own default-OFF / honest-empty discipline.
 *   - Copy names what an anchor is (the user's own reading, at a stated
 *     reliability) without ever claiming a numeric accuracy or precision
 *     figure -- that claim lives nowhere in this file.
 *
 * Standing rules: Lucide strokeWidth 1.5, no emojis, no em/en dashes, tokens
 *   only (Teal #2DA5A0 / Navy #1A2744 / Orange #B75E18), desktop + mobile
 *   responsive, 44px min touch targets.
 */

import { useState } from 'react';
import { Ruler, ChevronDown } from 'lucide-react';
import { TapeAnchorEntry } from './TapeAnchorEntry';
import { DexaAnchorImport } from './DexaAnchorImport';

export type AnchorEntryTab = 'tape' | 'dexa';

// ---------------------------------------------------------------------------
// Pure content renderer (exported for renderToStaticMarkup tests, no hooks).
// The tape / dexa panel itself is passed in as `panel` since TapeAnchorEntry
// and DexaAnchorImport are themselves stateful (own-row write) components,
// not props-only content renderers.
// ---------------------------------------------------------------------------

export interface AnchorEntryEntryPointContentProps {
  expanded: boolean;
  activeTab: AnchorEntryTab;
  onToggleExpanded: () => void;
  onTabChange: (tab: AnchorEntryTab) => void;
  panel: React.ReactNode;
}

export function AnchorEntryEntryPointContent({
  expanded,
  activeTab,
  onToggleExpanded,
  onTabChange,
  panel,
}: AnchorEntryEntryPointContentProps) {
  return (
    <div
      data-testid="anchor-entry-point"
      className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-4 backdrop-blur-sm sm:p-5"
    >
      <button
        type="button"
        data-testid="anchor-entry-toggle"
        aria-expanded={expanded}
        onClick={onToggleExpanded}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2">
          <Ruler className="h-4 w-4 flex-none text-[#2DA5A0]" strokeWidth={1.5} aria-hidden="true" />
          <span className="text-sm font-medium text-white">
            Add a tape or DEXA measurement to personalize your precision
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 flex-none text-white/50 transition-transform ${expanded ? 'rotate-180' : ''}`}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div data-testid="anchor-entry-body" className="mt-4 space-y-4">
          <div
            role="tablist"
            aria-label="Anchor entry method"
            data-testid="anchor-entry-tabs"
            className="inline-flex rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5 text-xs"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'tape'}
              data-testid="anchor-entry-tab-tape"
              onClick={() => onTabChange('tape')}
              className={`min-h-[44px] rounded-md px-4 font-medium transition-colors ${
                activeTab === 'tape' ? 'bg-[#2DA5A0]/20 text-[#2DA5A0]' : 'text-white/60 hover:text-white'
              }`}
            >
              Tape measurement
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'dexa'}
              data-testid="anchor-entry-tab-dexa"
              onClick={() => onTabChange('dexa')}
              className={`min-h-[44px] rounded-md px-4 font-medium transition-colors ${
                activeTab === 'dexa' ? 'bg-[#2DA5A0]/20 text-[#2DA5A0]' : 'text-white/60 hover:text-white'
              }`}
            >
              DEXA or clinic import
            </button>
          </div>

          {panel}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client wrapper (the actual mount point).
// ---------------------------------------------------------------------------

export interface AnchorEntryEntryPointProps {
  userId: string | null;
}

export function AnchorEntryEntryPoint({ userId }: AnchorEntryEntryPointProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<AnchorEntryTab>('tape');

  return (
    <AnchorEntryEntryPointContent
      expanded={expanded}
      activeTab={activeTab}
      onToggleExpanded={() => setExpanded((v) => !v)}
      onTabChange={setActiveTab}
      panel={
        activeTab === 'tape' ? (
          <TapeAnchorEntry userId={userId} />
        ) : (
          <DexaAnchorImport userId={userId} />
        )
      }
    />
  );
}
