'use client';

// Prompt #98 Phase 7: Admin tax (W-9 + 1099) status page.
//
// Lists referrers with referral earnings for the selected tax year.
// Inline actions: mark W-9 on file, mark 1099 generated. Defaults to
// the current calendar year and a "1099 required only" filter so the
// page surfaces what actually needs attention.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  FileText,
} from 'lucide-react';

interface TaxRow {
  id: string;
  practitioner_id: string;
  practice_name: string | null;
  tax_year: number;
  total_earned_cents: number;
  crossed_600_threshold: boolean;
  crossed_600_threshold_at: string | null;
  form_1099_required: boolean;
  form_1099_generated: boolean;
  form_1099_generated_at: string | null;
  form_1099_document_url: string | null;
  w9_on_file: boolean;
  w9_collected_at: string | null;
  w9_document_url: string | null;
}

function dollars(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PractitionerReferralTaxPage() {
  const currentYear = new Date().getUTCFullYear();
  const [taxYear, setTaxYear] = useState<number>(currentYear);
  const [requiredOnly, setRequiredOnly] = useState<boolean>(true);
  const [rows, setRows] = useState<TaxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(
        `/api/admin/practitioner-referrals/tax?tax_year=${taxYear}&required_only=${requiredOnly}`,
      );
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setRows(json.rows ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, [taxYear, requiredOnly]);

  async function patchRow(row: TaxRow, body: Record<string, unknown>, key: string) {
    setBusyKey(key);
    setError(null);
    try {
      const r = await fetch(
        `/api/admin/practitioner-referrals/tax/${row.practitioner_id}/${row.tax_year}`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      );
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/admin/practitioner-referrals/dashboard" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Program health
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Tax compliance</h1>
            <p className="text-sm text-gray-400 mt-1">W-9 collection and 1099-MISC pipeline for the referral program. Threshold: $600 annual earnings.</p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <select
              value={taxYear}
              onChange={(e) => setTaxYear(Number(e.target.value))}
              className="text-xs px-2 py-1 rounded border border-white/10 bg-[#0E1A30] text-white"
            >
              {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <label className="text-xs text-gray-300 inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10">
              <input type="checkbox" checked={requiredOnly} onChange={(e) => setRequiredOnly(e.target.checked)} />
              1099 required only
            </label>
            <button onClick={reload} className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Refresh
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 inline-flex items-center gap-2">
          <AlertCircle className="w-4 h-4" strokeWidth={1.5} /> {error}
        </div>
      )}

      {loading && (
        <div className="text-sm text-gray-400 inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Loading
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-sm text-gray-300">
          No tax records for {taxYear}{requiredOnly ? ' that require a 1099' : ''} yet.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-400">
              <tr>
                <th className="text-left px-3 py-2">Practice</th>
                <th className="text-right px-3 py-2">Earned</th>
                <th className="text-left px-3 py-2">1099 status</th>
                <th className="text-left px-3 py-2">W-9 status</th>
                <th className="text-left px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const w9Key = `w9-${row.practitioner_id}`;
                const formKey = `form-${row.practitioner_id}`;
                return (
                  <tr key={row.id} className="border-t border-white/5">
                    <td className="px-3 py-3">
                      <div className="font-medium">{row.practice_name ?? row.practitioner_id.slice(0, 8)}</div>
                      <div className="text-xs text-gray-500 font-mono">{row.practitioner_id}</div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono">{dollars(row.total_earned_cents)}</td>
                    <td className="px-3 py-3">
                      {!row.form_1099_required ? (
                        <span className="text-xs text-gray-500">not required</span>
                      ) : row.form_1099_generated ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
                          <CheckCircle className="w-3 h-3" strokeWidth={1.5} /> generated
                          {row.form_1099_document_url && (
                            <a href={row.form_1099_document_url} target="_blank" rel="noopener noreferrer" className="underline ml-1">view</a>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-300">pending</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {row.w9_on_file ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
                          <CheckCircle className="w-3 h-3" strokeWidth={1.5} /> on file
                          {row.w9_document_url && (
                            <a href={row.w9_document_url} target="_blank" rel="noopener noreferrer" className="underline ml-1">view</a>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-rose-300">missing</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        {!row.w9_on_file && (
                          <button
                            disabled={busyKey === w9Key}
                            onClick={() => patchRow(row, { w9_on_file: true }, w9Key)}
                            className="text-xs px-2 py-1 rounded border border-white/10 hover:border-copper hover:text-copper"
                          >
                            {busyKey === w9Key ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} /> : 'Mark W-9 on file'}
                          </button>
                        )}
                        {row.form_1099_required && !row.form_1099_generated && (
                          <button
                            disabled={busyKey === formKey}
                            onClick={() => patchRow(row, { form_1099_generated: true }, formKey)}
                            className="text-xs px-2 py-1 rounded border border-white/10 hover:border-copper hover:text-copper inline-flex items-center gap-1"
                          >
                            {busyKey === formKey
                              ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} />
                              : <><FileText className="w-3 h-3" strokeWidth={1.5} /> Mark 1099 generated</>}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
