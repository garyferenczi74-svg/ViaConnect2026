// Prompt 225a: admin peptide clinical evidence tiles.
// Middleware enforces admin role for /admin/*. No dose amounts rendered.
// No em/en dashes. No emojis. Lucide strokeWidth 1.5.

import {
  Activity,
  BookOpen,
  Database,
  FlaskConical,
  ShieldAlert,
} from 'lucide-react';
import { loadPeptideEvidenceDashboard } from '@/lib/admin/peptideEvidence';

export const dynamic = 'force-dynamic';

function StatusPill({ status }: { status: string }) {
  const pending = status === 'pending_access';
  const live = status === 'live';
  const cls = pending
    ? 'bg-amber-500/15 text-amber-200 border-amber-500/30'
    : live
      ? 'bg-teal-500/15 text-teal-200 border-teal-500/30'
      : 'bg-white/10 text-white/70 border-white/15';
  return (
    <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${cls}`}>
      {status}
    </span>
  );
}

export default async function PeptideEvidenceAdminPage() {
  const dash = await loadPeptideEvidenceDashboard({ limit: 24 });

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/33 flex items-center justify-center flex-shrink-0">
            <FlaskConical className="w-5 h-5 text-teal-400" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">
              Peptide Evidence
            </h1>
            <p className="text-xs text-white/40">
              Prompt 225a honesty layer, trial and publication link counts. Education only. No dosing.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-8">
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-4 h-4 text-white/60" strokeWidth={1.5} />
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wide">
              Corpus totals
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'kb_trials', value: dash.totals.kbTrials },
              { label: 'kb_publications', value: dash.totals.kbPublications },
              { label: 'evidence links', value: dash.totals.evidenceLinks },
              {
                label: 'honesty refreshed',
                value: dash.totals.peptidesWithHonesty,
              },
            ].map((t) => (
              <div
                key={t.label}
                className="rounded-xl border border-white/[0.08] bg-[#1E3054] p-4"
              >
                <div className="text-2xl font-semibold text-white">{t.value}</div>
                <div className="text-xs text-white/45 mt-1">{t.label}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-white/50">{dash.canonicalFraming}</p>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4 text-white/60" strokeWidth={1.5} />
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wide">
              Ingest source status
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dash.sourceStatus.map((s) => (
              <div
                key={s.sourceSystem}
                className="rounded-xl border border-white/[0.08] bg-[#1E3054] p-4"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-medium text-white">
                    {s.sourceSystem}
                  </span>
                  <StatusPill status={s.status} />
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  {s.coverageNote || 'No coverage note.'}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-white/60" strokeWidth={1.5} />
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wide">
              Peptide honesty tiles
            </h2>
          </div>
          {dash.tiles.length === 0 ? (
            <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-6 text-center text-sm text-white/40">
              No educational peptides found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {dash.tiles.map((tile) => (
                <div
                  key={tile.slug}
                  className="rounded-xl border border-white/[0.08] bg-[#1E3054] p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {tile.displayName}
                      </div>
                      <div className="text-[11px] text-white/40 font-mono truncate">
                        {tile.slug}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        tile.consumerSafe
                          ? 'border-teal-500/30 text-teal-200 bg-teal-500/10'
                          : 'border-white/15 text-white/50'
                      }`}
                    >
                      {tile.consumerSafe ? 'consumer_safe' : 'gated'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-black/20 p-2">
                      <div className="text-white/40">Trials linked</div>
                      <div className="text-white font-semibold">
                        {tile.trialsLinked}
                      </div>
                      <div className="text-white/35 mt-1">
                        reg {tile.trialsRegistered} / done {tile.trialsCompleted}{' '}
                        / results {tile.trialsResultsPosted}
                      </div>
                    </div>
                    <div className="rounded-lg bg-black/20 p-2">
                      <div className="text-white/40">Pubs linked</div>
                      <div className="text-white font-semibold">
                        {tile.publicationsLinked}
                      </div>
                      <div className="text-white/35 mt-1">
                        human {tile.publicationsHuman} / animal{' '}
                        {tile.publicationsAnimal}
                      </div>
                    </div>
                  </div>

                  {tile.evidenceGapStatement ? (
                    <p className="text-[11px] text-white/55 leading-relaxed">
                      {tile.evidenceGapStatement}
                    </p>
                  ) : (
                    <p className="text-[11px] text-white/35 italic">
                      Honesty layer not computed yet for this compound.
                    </p>
                  )}

                  {tile.coverageNote ? (
                    <div className="flex items-start gap-1.5 text-[11px] text-amber-200/80">
                      <Activity
                        className="w-3 h-3 mt-0.5 flex-shrink-0"
                        strokeWidth={1.5}
                      />
                      <span>{tile.coverageNote}</span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
