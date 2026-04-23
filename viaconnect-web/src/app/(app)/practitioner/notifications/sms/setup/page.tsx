"use client";

// Prompt #112 — SMS setup / double-opt-in entry.

import { useState } from "react";
import { MessageSquare, CheckCircle2 } from "lucide-react";

export default function Page() {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "awaiting_code" | "awaiting_yes" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function startVerification() {
    setStatus("sending");
    setMessage(null);
    const r = await fetch("/api/notifications/sms/verification-start", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const j = await r.json();
    if (!j.ok) { setStatus("error"); setMessage(j.error ?? "Failed to send verification."); return; }
    setStatus("awaiting_code");
    setMessage("Verification SMS sent. Reply with the 6-digit code from your phone; we'll detect it automatically.");
  }

  async function resendCompliantOptIn() {
    const r = await fetch("/api/notifications/sms/compliant-optin-send", {
      method: "POST", headers: { "content-type": "application/json" },
    });
    const j = await r.json();
    if (!j.ok) { setMessage(j.error ?? "Failed to send opt-in SMS."); return; }
    setStatus("awaiting_yes");
    setMessage("Opt-in SMS sent. Reply YES to complete activation.");
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-6 w-6 text-teal-300" strokeWidth={1.5} aria-hidden />
        <div>
          <h2 className="text-xl font-semibold">SMS notifications</h2>
          <p className="text-sm text-slate-400">US phone numbers only. Standard msg &amp; data rates apply.</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <label className="block text-sm text-slate-200">
          Phone number (E.164 format, e.g., +15551234567)
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+15551234567"
            className="mt-1 block w-full min-h-[44px] rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-base text-slate-100 focus:border-teal-400 focus:outline-none sm:text-sm"
          />
        </label>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            onClick={startVerification}
            disabled={status === "sending" || !phone}
            className="min-h-[44px] rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-teal-500"
          >
            {status === "sending" ? "Sending..." : "Send verification code"}
          </button>
          {status === "awaiting_code" && (
            <button onClick={resendCompliantOptIn} className="min-h-[44px] rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-teal-400">
              I replied with the code (send opt-in)
            </button>
          )}
        </div>
        {message && (
          <div className={`mt-4 flex items-start gap-2 text-sm ${status === "error" ? "text-rose-300" : "text-slate-300"}`}>
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} aria-hidden />
            <p>{message}</p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400">
        <h3 className="mb-1 text-sm font-medium text-slate-200">How this works</h3>
        <ol className="space-y-1">
          <li>1. Enter your phone; we send a 6-digit verification code.</li>
          <li>2. Reply to the SMS with the code; we confirm the number is yours.</li>
          <li>3. We send a TCPA opt-in message; you reply YES.</li>
          <li>4. You can reply STOP anytime to opt out instantly.</li>
        </ol>
      </div>
    </section>
  );
}
