'use client';

// Prompt 204 (2026-06-21): the explainer body for a GeneX360 panel tab on the
// Upload Genetic Data page whose data is READ FROM THE DNA FILE rather than from
// its own upload. NutrigenDX, PeptideIQ, and CannabisIQ are genotype panels, and
// HormoneIQ's genetic markers are genotype too, so there is no separate upload for
// them: the member uploads their DNA once (the DNA Test tab) and these panels are
// scored from it. This tab explains what the panel covers and routes to the DNA
// upload, and links to view the panel on the blueprint. It never shows a duplicate
// dropzone and never implies a backend that does not exist.
//
// Standing rules honored: tokens only, Lucide strokeWidth 1.5 outline, no emojis,
// no em or en dashes, TypeScript strict (no any).

import Link from 'next/link';
import { ArrowRight, Dna } from 'lucide-react';
import { VCButton } from '@/components/ui/VCButton';

export interface PanelExplainerInfo {
  title: string;
  covers: string;
  dataSourceNote: string;
  blueprintHref: string;
}

export function PanelExplainerPanel({
  info,
  onUseDnaUpload,
}: {
  info: PanelExplainerInfo;
  onUseDnaUpload: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div
        className="glass-v2 p-4 md:p-6 rounded-2xl flex flex-col gap-3"
        style={{ borderLeft: '4px solid #2DA5A0' }}
      >
        <h3 className="text-heading-3 text-white">{info.title}</h3>
        <p className="text-sm text-white/70 leading-relaxed">{info.covers}</p>
        <p className="text-sm text-white/55 leading-relaxed">{info.dataSourceNote}</p>
        <div className="flex flex-wrap gap-3 pt-1">
          <VCButton variant="primary" size="sm" onClick={onUseDnaUpload}>
            <span className="inline-flex items-center gap-2">
              <Dna size={16} strokeWidth={1.5} />
              Go to DNA Test upload
            </span>
          </VCButton>
          <Link
            href={info.blueprintHref}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/75 transition-colors hover:bg-white/10"
          >
            View on your blueprint
            <ArrowRight size={16} strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PanelExplainerPanel;
