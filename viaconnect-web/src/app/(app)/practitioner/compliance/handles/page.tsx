"use client";

import { useEffect, useState } from "react";
import { Users, Plus, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface HandleRow {
  id: string;
  platform: string;
  handle: string;
  verification_method: string;
  verified_at: string | null;
  active: boolean;
}

const PLATFORMS = ["instagram", "tiktok", "youtube", "x", "linkedin", "facebook", "substack", "podcast", "reddit", "website"];

export default function HandlesPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const [rows, setRows] = useState<HandleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingOpen, setAddingOpen] = useState(false);
  const [platform, setPlatform] = useState("instagram");
  const [handle, setHandle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("practitioner_social_handles").select("*").order("platform");
    setRows(((data ?? []) as HandleRow[]));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!handle.trim()) { setError("Handle required"); return; }
    setError(null);
    setSubmitting(true);
    try {
      const r = await fetch("/api/practitioner/compliance/handles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, handle: handle.trim() }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setHandle("");
      setAddingOpen(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">My social handles</h1>
        <button onClick={() => setAddingOpen(true)} className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#B75E18]/20 text-[#B75E18] text-xs font-medium hover:bg-[#B75E18]/30">
          <Plus className="w-3.5 h-3.5" strokeWidth={1.5} /> Register handle
        </button>
      </div>

      <p className="text-xs text-white/50 mb-4">
        Register a handle so Marshall only attributes your content to you when it is verifiably yours.
        Until a handle is verified, Marshall will not auto-issue notices against posts from that account.
      </p>

      {loading && <div className="text-center text-white/30 text-sm py-8"><Loader2 className="w-4 h-4 animate-spin inline" strokeWidth={1.5} /></div>}
      {!loading && rows.length === 0 && <div className="text-center text-white/30 text-sm py-8">No handles yet. Use Register handle to add your first.</div>}

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="bg-[#1E3054] rounded-lg border border-white/[0.08] p-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-white">{r.platform}</span>
            <span className="text-xs font-mono text-white/80">{r.handle}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/70">{r.verification_method}</span>
            {r.verified_at ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" strokeWidth={1.5} /> verified
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-300 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" strokeWidth={1.5} /> pending verification
              </span>
            )}
            {!r.active && <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/15 text-red-400">inactive</span>}
          </div>
        ))}
      </div>

      {addingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !submitting && setAddingOpen(false)}>
          <div className="w-full max-w-md bg-[#1E3054] rounded-xl border border-white/[0.08] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-white mb-3">Register a handle</h3>
            <label className="block mb-3">
              <span className="text-xs text-white/60">Platform</span>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="mt-1 w-full bg-[#0F172A] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none">
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="block mb-3">
              <span className="text-xs text-white/60">Handle or URL</span>
              <input value={handle} onChange={(e) => setHandle(e.target.value)} className="mt-1 w-full bg-[#0F172A] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20" placeholder="@yourhandle or profile URL" />
            </label>
            {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setAddingOpen(false)} disabled={submitting} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:bg-white/5">Cancel</button>
              <button onClick={submit} disabled={submitting || !handle.trim()} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#B75E18]/20 text-[#B75E18] hover:bg-[#B75E18]/30 disabled:opacity-30 flex items-center gap-2">
                {submitting && <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} />} Register
              </button>
            </div>
            <p className="text-[10px] text-white/30 mt-3">
              Registered handles are self-attested and begin in pending state. Steve Rica or Meta Business
              verification confirms ownership before Marshall uses them to attribute content.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
