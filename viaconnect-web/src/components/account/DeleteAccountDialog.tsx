"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const FAILURE_TEXT: Record<string, string> = {
  stripe_failed: "We could not cancel billing. Your account is still active. You can try again.",
  stripe_circuit_open: "We could not cancel billing. Your account is still active. You can try again.",
  storage_failed: "We could not delete stored files. Your account is still active. You can try again.",
  database_failed: "We could not remove stored records. Your account is still active. You can try again.",
  apple_failed: "We could not revoke Sign in with Apple. Your account is still active. You can try again.",
  apple_revoke_failed: "We could not revoke Sign in with Apple. Your account is still active. You can try again.",
  apple_circuit_open: "We could not revoke Sign in with Apple. Your account is still active. You can try again.",
  auth_failed: "We could not remove the login. You can try again.",
  rate_limited: "Too many attempts. Wait and try again.",
  timeout: "The request took too long. Your account is still active. You can try again.",
  server_not_configured: "Account deletion is not available right now. Your account is still active.",
};

export function DeleteAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  function close() {
    if (submitting) return;
    setConfirmation("");
    setErrorText(null);
    onOpenChange(false);
  }

  async function submit() {
    if (confirmation !== "DELETE" || submitting) return;
    setSubmitting(true);
    setErrorText(null);
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE" }),
      });
      const payload: unknown = await response.json().catch(() => null);
      const errorCode = typeof payload === "object" && payload !== null && "errorCode" in payload
        && typeof (payload as { errorCode?: unknown }).errorCode === "string"
        ? (payload as { errorCode: string }).errorCode
        : "";
      if (!response.ok) {
        setErrorText(FAILURE_TEXT[errorCode] ?? "We could not delete your account. It is still active. You can try again.");
        setSubmitting(false);
        return;
      }

      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
      } catch {
        // Storage can throw in private mode. Sign-out still proceeds.
      }
      queryClient.clear();
      const supabase = createClient();
      await supabase.auth.signOut().catch(() => undefined);
      router.push("/account-deleted");
    } catch {
      setErrorText("We could not delete your account. It is still active. You can try again.");
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const ready = confirmation === "DELETE" && !submitting;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center px-4 pb-4 sm:items-center sm:pb-0">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        data-testid="delete-account-dialog"
        className="relative w-full max-w-md rounded-2xl border border-red-500/30 bg-[#1E3054] p-5 sm:p-6 shadow-2xl"
      >
        <h3 id="delete-account-title" className="text-base sm:text-lg font-semibold text-white">
          Delete your ViaConnect account?
        </h3>
        <p className="mt-3 text-sm text-white/70 leading-relaxed">
          This permanently deletes your ViaConnect account and the personal, health, genetic, and photo data stored with it. This cannot be undone.
        </p>
        <p className="mt-3 text-sm text-white/70 leading-relaxed">
          Some order and payment records may be kept with your name, email, address, and phone removed, where we have to keep them.
        </p>
        <label className="mt-4 block">
          <span className="block text-xs text-white/60 mb-1">Type DELETE to confirm</span>
          <input
            data-testid="delete-account-confirm-input"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            className="w-full min-h-[44px] rounded-lg border border-white/15 bg-[#0F172A] px-3 text-base text-white outline-none focus:border-white/30"
            placeholder="DELETE"
          />
        </label>
        {confirmation.length > 0 && confirmation !== "DELETE" ? (
          <p className="mt-2 text-xs text-red-300">Type DELETE to confirm</p>
        ) : null}
        {errorText ? <p className="mt-3 text-sm text-red-300">{errorText}</p> : null}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            className="min-h-[44px] w-full rounded-xl border border-white/15 px-4 text-sm text-white/80 sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="delete-account-submit"
            disabled={!ready}
            onClick={() => { void submit(); }}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-red-500/90 px-4 text-sm font-semibold text-white disabled:opacity-40 sm:w-auto"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : null}
            {submitting ? "Deleting account" : "Delete account"}
          </button>
        </div>
      </div>
    </div>
  );
}
