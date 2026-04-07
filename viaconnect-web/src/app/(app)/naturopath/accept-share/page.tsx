"use client";

// Naturopath / practitioner accept-share entry point.
//
// A patient hands over an 8-character invite code (XXXX-XXXX). The provider
// types it in here and we call the SECURITY DEFINER `protocol_share_accept`
// RPC, which validates the code, the recipient email (if scoped), and atomically
// claims the share by setting provider_id = auth.uid() + status = 'active'.
//
// On success the provider is redirected to the patients page.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  formatInviteCode,
  normalizeInviteCode,
} from "@/utils/protocolShareAccess";

export default function NaturopathAcceptSharePage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [raw, setRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalized = useMemo(() => normalizeInviteCode(raw), [raw]);
  const display = useMemo(() => formatInviteCode(normalized), [normalized]);
  const ready = normalized.length === 8 && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;

    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: rpcError } = await (supabase as any).rpc(
        "protocol_share_accept",
        { p_invite_code: normalized },
      );

      if (rpcError) throw rpcError;
      if (!data) throw new Error("Share could not be accepted.");

      toast.success("Patient protocol access granted.");
      router.push("/naturopath/patients");
    } catch (err: any) {
      const msg =
        err?.message?.replace(/^protocol_share_accept:\s*/i, "") ??
        "Could not accept this share code.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#1A2744] text-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <motion.div
          initial={reduce ? undefined : { opacity: 0, y: 8 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-[#2DA5A0]/15 px-3 py-1 text-xs font-semibold text-[#2DA5A0] mb-3">
            <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
            Provider access
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Accept a patient share
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Enter the 8-character code your patient provided to gain access to
            the data they have explicitly chosen to share with you.
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          initial={reduce ? undefined : { opacity: 0, y: 12 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="rounded-2xl bg-[#1E3054] border border-white/10 p-6 sm:p-8 shadow-xl"
        >
          <label
            htmlFor="invite-code"
            className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-2"
          >
            Invite code
          </label>
          <div className="relative">
            <KeyRound
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#2DA5A0]"
              strokeWidth={1.5}
            />
            <input
              id="invite-code"
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              value={display}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="XXXX-XXXX"
              maxLength={9}
              className="w-full rounded-xl bg-[#1A2744] border border-white/10 pl-12 pr-4 py-4 text-2xl font-mono tracking-[0.3em] uppercase text-center text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-[#2DA5A0]/60 focus:border-[#2DA5A0]/60 transition"
            />
          </div>
          <p className="mt-2 text-xs text-white/40">
            Codes are case-insensitive. Hyphens and spaces are ignored.
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-[#B75E18]/40 bg-[#B75E18]/10 px-4 py-3 text-sm text-[#F5B681]">
              {error}
            </div>
          )}

          <motion.button
            type="submit"
            disabled={!ready}
            whileHover={reduce || !ready ? undefined : { scale: 1.01 }}
            whileTap={reduce || !ready ? undefined : { scale: 0.98 }}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2DA5A0] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#2DA5A0]/20 transition-all duration-200 hover:bg-[#2DA5A0]/90 focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E3054] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                Verifying code…
              </>
            ) : (
              <>
                Accept share
                <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
              </>
            )}
          </motion.button>

          <div className="mt-6 rounded-xl bg-[#1A2744] border border-white/5 p-4 text-xs text-white/55 leading-relaxed">
            <p className="font-semibold text-white/75 mb-1">
              How protocol sharing works
            </p>
            You will only see the data categories the patient explicitly turned
            on, and you may only act within the permissions they granted. Every
            view, order, and modification is logged to a tamper-evident audit
            trail the patient can review at any time.
          </div>
        </motion.form>
      </div>
    </div>
  );
}
