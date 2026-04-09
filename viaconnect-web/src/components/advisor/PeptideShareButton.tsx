"use client";

/**
 * PeptideShareButton (Prompt #60d — advisor sub-component)
 *
 * When Jeffery's response mentions a peptide and the user is on the consumer
 * portal, this button appears under the message bubble. Clicking it routes
 * the peptide recommendation to the user's connected practitioner/naturopath
 * via /api/advisor/peptide-share.
 *
 * The button knows the peptide name from the marker token in the message
 * content; the originalQuestion is figured out server-side by looking up the
 * most recent user turn for this user/role in ultrathink_advisor_conversations.
 */

import { useState } from "react";
import { Share2, ArrowRight, Check, Loader2, AlertCircle } from "lucide-react";

interface PeptideShareButtonProps {
  peptideName: string;
  advisorResponse: string;
}

type Status = "idle" | "sending" | "sent" | "no_provider" | "error";

export default function PeptideShareButton({ peptideName, advisorResponse }: PeptideShareButtonProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const handleClick = async () => {
    if (status !== "idle") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/advisor/peptide-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peptideName, advisorResponse }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setStatus("sent");
        setResultMessage(`Sent to ${json.practitionerName ?? "your practitioner"}`);
      } else if (res.ok && !json.success) {
        setStatus("no_provider");
        setResultMessage(json.message ?? "No connected practitioner");
      } else {
        setStatus("error");
        setResultMessage(json.error ?? "Couldn't send");
      }
    } catch (e) {
      setStatus("error");
      setResultMessage((e as Error).message);
    }
  };

  if (status === "sent") {
    return (
      <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-sm text-emerald-400 w-full md:w-auto">
        <Check className="w-4 h-4" strokeWidth={1.5} />
        <span>{resultMessage}</span>
      </div>
    );
  }

  if (status === "no_provider") {
    return (
      <div className="mt-3 flex items-start gap-2 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 w-full">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
        <span>{resultMessage}</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mt-3 flex items-start gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 w-full">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
        <span>{resultMessage}</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={status === "sending"}
      className="mt-3 group flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2DA5A0]/15 border border-[#2DA5A0]/30 hover:bg-[#2DA5A0]/25 hover:border-[#2DA5A0]/50 transition-all w-full md:w-auto disabled:opacity-50"
    >
      {status === "sending"
        ? <Loader2 className="w-4 h-4 text-[#2DA5A0] animate-spin" strokeWidth={1.5} />
        : <Share2 className="w-4 h-4 text-[#2DA5A0]" strokeWidth={1.5} />}
      <span className="text-sm text-[#2DA5A0] font-medium">
        Share {peptideName} with your practitioner
      </span>
      {status === "idle" && (
        <ArrowRight className="w-3.5 h-3.5 text-[#2DA5A0]/60 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
      )}
    </button>
  );
}
