import Link from 'next/link';
import { ChevronLeft, GitCompare } from 'lucide-react';
import { loadRegistry } from '@/lib/compliance/frameworks/registry';
import type { FrameworkId, ControlPoint } from '@/lib/compliance/frameworks/types';
import { collectorsForControl } from '@/lib/compliance/frameworks/crosswalk';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: { framework?: string; control?: string };
}

export default async function CrosswalkViewerPage({ searchParams }: PageProps) {
  const registry = loadRegistry();
  const frameworkIds = Object.keys(registry.frameworks) as FrameworkId[];

  const pickedFramework: FrameworkId = frameworkIds.includes((searchParams.framework ?? '') as FrameworkId)
    ? (searchParams.framework as FrameworkId)
    : 'soc2';
  const pickedFrameworkDef = registry.frameworks[pickedFramework];

  const pickedControlId = (searchParams.control ?? '').trim();
  const pickedControl: ControlPoint | null = pickedControlId
    ? pickedFrameworkDef.controlPoints.find((c) => c.id === pickedControlId) ?? null
    : null;

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/frameworks" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          Frameworks overview
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <GitCompare className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Crosswalk viewer</h1>
            <p className="text-xs text-white/40">Browse cross-framework equivalences and evidence flows across SOC 2, HIPAA, and ISO 27001.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-4">
        <form action="/admin/frameworks/crosswalk" method="get" className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <label htmlFor="framework" className="block text-xs font-medium text-white/80 mb-1.5">Framework</label>
            <select id="framework" name="framework" defaultValue={pickedFramework} className={inputClasses}>
              {frameworkIds.map((fid) => (
                <option key={fid} value={fid}>{registry.frameworks[fid].displayName}</option>
              ))}
            </select>
          </div>
          <div className="flex-[2]">
            <label htmlFor="control" className="block text-xs font-medium text-white/80 mb-1.5">Control</label>
            <select id="control" name="control" defaultValue={pickedControlId} className={inputClasses}>
              <option value="">Pick a control</option>
              {pickedFrameworkDef.controlPoints.map((c) => (
                <option key={c.id} value={c.id}>{c.id}: {c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit"
                    className="inline-flex items-center gap-2 rounded-md bg-[#B75E18] hover:bg-[#C96D1E] transition px-4 py-2 text-sm font-medium text-white">
              Look up
            </button>
          </div>
        </form>

        {pickedControl ? (
          <ControlView framework={pickedFramework} control={pickedControl} />
        ) : (
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-white/60">
            Pick a framework and control to see its crosswalk, evidence sources, and cross-framework references.
          </div>
        )}
      </div>
    </div>
  );
}

function ControlView({ framework, control }: { framework: FrameworkId; control: ControlPoint }) {
  const registry = loadRegistry();
  const collectors = control.evidenceSources;
  const crossRefs = control.crossFrameworkReferences ?? [];

  // For each cross reference, fetch the target control details so we can render
  // its evidence sources and category for transparency.
  const enriched = crossRefs.map((ref) => {
    const target = registry.frameworks[ref.framework].controlPoints.find((c) => c.id === ref.controlId);
    return { ref, target };
  });

  // For each evidence collector, list the other frameworks where it also maps.
  const collectorEchoes = collectors.map((collectorId) => {
    const echoes: Array<{ framework: FrameworkId; controlId: string }> = [];
    for (const fid of Object.keys(registry.frameworks) as FrameworkId[]) {
      if (fid === framework) continue;
      for (const other of registry.frameworks[fid].controlPoints) {
        if (other.evidenceSources.includes(collectorId)) {
          echoes.push({ framework: fid, controlId: other.id });
        }
      }
    }
    return { collectorId, echoes };
  });

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-4">
        <div className="flex items-start gap-2 flex-wrap">
          <span className="font-mono text-sm text-white">{control.id}</span>
          <span className="text-[11px] text-white/60">{framework}</span>
          {control.requiredOrAddressable ? (
            <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${
              control.requiredOrAddressable === 'required'
                ? 'bg-red-500/15 border-red-400/30 text-red-200'
                : 'bg-amber-500/15 border-amber-400/30 text-amber-200'
            }`}>{control.requiredOrAddressable}</span>
          ) : null}
          {control.defaultApplicability ? (
            <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${
              control.defaultApplicability === 'applicable'
                ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200'
                : 'bg-slate-500/15 border-slate-400/30 text-slate-200'
            }`}>{control.defaultApplicability}</span>
          ) : null}
        </div>
        <div className="mt-2 text-sm text-white font-semibold">{control.name}</div>
        <div className="text-[11px] text-white/60 mt-0.5">{control.category}</div>
        <p className="mt-2 text-xs text-white/80">{control.description}</p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Evidence collectors ({collectors.length})</h2>
          {collectors.length === 0 ? (
            <div className="text-xs text-white/50">No automated evidence. This control is backed by manual-vault artifacts or satisfied through cross-framework references.</div>
          ) : (
            <ul className="space-y-2">
              {collectorEchoes.map(({ collectorId, echoes }) => (
                <li key={collectorId} className="text-xs">
                  <div className="font-mono text-white/90">{collectorId}</div>
                  {echoes.length > 0 ? (
                    <div className="mt-1 text-[11px] text-white/60">
                      Also evidence for: {echoes.map((e) => (
                        <span key={`${e.framework}-${e.controlId}`} className="inline-flex items-center gap-1 mr-2">
                          <span className="text-white/40">{shortFramework(e.framework)}</span>
                          <span className="font-mono text-white/80">{e.controlId}</span>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Cross-framework references ({crossRefs.length})</h2>
          {enriched.length === 0 ? (
            <div className="text-xs text-white/50">This control is not referenced by any other framework in the registry.</div>
          ) : (
            <ul className="space-y-2">
              {enriched.map(({ ref, target }) => {
                const targetCollectors = target ? collectorsForControl(ref.framework, ref.controlId) : [];
                return (
                  <li key={`${ref.framework}-${ref.controlId}`} className="rounded-md border border-white/[0.08] bg-white/[0.02] p-2">
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className="font-mono text-xs text-white">{ref.controlId}</span>
                      <span className="text-[11px] text-white/60">{shortFramework(ref.framework)}</span>
                      <RelationshipBadge kind={ref.relationship} />
                    </div>
                    {target ? (
                      <>
                        <div className="mt-1 text-[11px] text-white/80">{target.name}</div>
                        {targetCollectors.length > 0 ? (
                          <div className="mt-1 text-[11px] text-white/60">
                            Collectors: <span className="font-mono">{targetCollectors.join(', ')}</span>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="mt-1 text-[11px] text-red-300">Target control not found in registry (broken reference).</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function RelationshipBadge({ kind }: { kind: string }) {
  const map: Record<string, string> = {
    equivalent: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200',
    overlapping: 'bg-blue-500/15 border-blue-400/30 text-blue-200',
    partial: 'bg-amber-500/15 border-amber-400/30 text-amber-200',
  };
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${map[kind] ?? 'bg-white/[0.05] border-white/[0.12] text-white/70'}`}>
      {kind}
    </span>
  );
}

function shortFramework(fid: FrameworkId): string {
  switch (fid) {
    case 'soc2': return 'SOC 2';
    case 'hipaa_security': return 'HIPAA';
    case 'iso_27001_2022': return 'ISO 27001';
    default: return fid;
  }
}

const inputClasses = 'w-full rounded-md bg-white/[0.04] border border-white/[0.14] text-sm text-white placeholder-white/30 px-3 py-2 focus:outline-none focus:border-white/30';
