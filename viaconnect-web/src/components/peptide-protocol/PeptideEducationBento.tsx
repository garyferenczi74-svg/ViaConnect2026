/**
 * Prompt 226e: Peptide Education index bento.
 * Reuses shared BentoTile chrome (My Biology / Genetics / Nutrition pattern).
 */

import { ChevronRight } from 'lucide-react';
import { BentoTile } from '@/components/ui/BentoTile';
import {
  CONSUMER_CARD_SUBHEAD,
  CONSUMER_CARD_TITLE,
  CONSUMER_METRIC_LABEL,
  CONSUMER_OPEN_PILL_BASE,
} from '@/lib/ui/consumerChrome';
import {
  PEPTIDE_BENTO_MOBILE_ORDER,
  PEPTIDE_EDUCATION_BENTO_TILES,
  STATEMENT_A_G36,
  STATEMENT_B_BODY,
  STATEMENT_B_HEADING,
  type PeptideBentoTile,
  type PeptideBentoTileId,
} from '@/components/peptide-protocol/peptideEducationBentoConfig';

function searchSubtext(total: number, countsOk: boolean): string {
  if (!countsOk) return 'educational reference';
  return `${total} educational entries`;
}

function TileContent({
  tile,
  subtext,
}: {
  tile: PeptideBentoTile;
  subtext: string;
}) {
  const Icon = tile.Icon;
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <span
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[var(--deep-navy)]/80"
          aria-hidden
        >
          <Icon className="h-5 w-5 text-[var(--teal)]" strokeWidth={1.5} />
        </span>
        {tile.pending || tile.pendingLabel ? (
          <span className={`rounded-full border border-white/15 bg-white/5 px-2 py-0.5 ${CONSUMER_METRIC_LABEL}`}>
            {tile.pendingLabel ?? 'Coming soon'}
          </span>
        ) : null}
      </div>
      <div className="mt-auto flex flex-col gap-1 pb-14 pr-20">
        <h3 className={CONSUMER_CARD_TITLE}>
          {tile.title}
        </h3>
        <p className={`line-clamp-3 ${CONSUMER_CARD_SUBHEAD}`}>
          {subtext}
        </p>
      </div>
      {!tile.pending ? (
        <div className={`absolute bottom-4 right-4 ${CONSUMER_OPEN_PILL_BASE} md:bottom-5 md:right-5`}>
          <span>Open</span>
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
        </div>
      ) : null}
    </>
  );
}

export function PeptideEducationBento({
  entryCount,
  countsOk,
}: {
  entryCount: number;
  countsOk: boolean;
}) {
  const byId = new Map(PEPTIDE_EDUCATION_BENTO_TILES.map((t) => [t.id, t]));

  function subtextFor(tile: PeptideBentoTile): string {
    if (tile.id === 'search') {
      return searchSubtext(entryCount, countsOk);
    }
    return tile.subtext;
  }

  function renderTile(tile: PeptideBentoTile, className: string) {
    const sub = subtextFor(tile);
    const aria = `${tile.title}. ${sub}${tile.pending ? '. Coming soon' : ''}`;

    if (tile.pending || !tile.href) {
      return (
        <BentoTile
          key={tile.id}
          interactive={false}
          scrim={false}
          ariaLabel={aria}
          dataHubCard={tile.id}
          className={className}
          contentClassName="gap-3"
        >
          <TileContent tile={tile} subtext={sub} />
        </BentoTile>
      );
    }

    return (
      <BentoTile
        key={tile.id}
        href={tile.href}
        interactive
        scrim={false}
        ariaLabel={aria}
        dataHubCard={tile.id}
        className={className}
        contentClassName="gap-3"
      >
        <TileContent tile={tile} subtext={sub} />
      </BentoTile>
    );
  }

  return (
    <div className="space-y-4" data-testid="peptide-education-bento">
      {/* Desktop / tablet grid */}
      <ul
        className="hidden list-none grid-cols-1 gap-3 md:grid md:grid-cols-2 md:gap-3.5 xl:grid-cols-4 xl:auto-rows-[minmax(160px,auto)] xl:gap-5"
        aria-label="Peptide Education sections"
      >
        {PEPTIDE_EDUCATION_BENTO_TILES.map((tile) => (
          <li key={tile.id} className={`contents`}>
            {renderTile(tile, tile.gridClass)}
          </li>
        ))}
      </ul>

      {/* Mobile single column in §4.3 priority order */}
      <ul
        className="grid list-none grid-cols-1 gap-3 md:hidden"
        aria-label="Peptide Education sections"
      >
        {PEPTIDE_BENTO_MOBILE_ORDER.map((id: PeptideBentoTileId) => {
          const tile = byId.get(id);
          if (!tile) return null;
          return (
            <li key={tile.id} className="contents">
              {renderTile(tile, 'min-h-[200px] col-span-1')}
            </li>
          );
        })}
      </ul>

      <div
        data-testid="discuss-with-practitioner-pathway"
        className="rounded-2xl border border-white/[0.08] bg-[var(--card)]/80 p-4"
      >
        <p className="text-xl font-medium text-white">{STATEMENT_B_HEADING}</p>
        <p className="mt-1 text-sm leading-relaxed text-white/85">{STATEMENT_B_BODY}</p>
      </div>

      <p
        data-testid="peptide-statement-a-g36"
        className="rounded-xl border border-white/10 bg-[var(--card)]/60 p-3 text-sm leading-relaxed text-white/85"
      >
        {STATEMENT_A_G36}
      </p>
    </div>
  );
}
