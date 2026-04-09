"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

interface ActionButtonsProps {
  messageId: string;
  onActionComplete?: () => void;
}

export default function ActionButtons({ messageId, onActionComplete }: ActionButtonsProps) {
  const [busy, setBusy] = useState<string | null>(null);

  const post = async (path: string, body: Record<string, unknown>) => {
    setBusy(path);
    try {
      await fetch(`/api/admin/jeffery/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      onActionComplete?.();
    } finally {
      setBusy(null);
    }
  };

  const handleApprove = () => post("approve", { messageId });
  const handleReject = () => {
    const reason = window.prompt("Reason for rejection? (Jeffery will learn from this)");
    if (!reason) return;
    return post("reject", { messageId, reason });
  };
  const handleFlag = () => post("flag", { messageId });

  const btn = (label: string, color: string, onClick: () => void, key: string) => (
    <button
      onClick={onClick}
      disabled={busy !== null}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${color}`}
    >
      {busy === key
        ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" strokeWidth={1.5} />
        : label}
    </button>
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {btn("Approve", "bg-green-500/15 text-green-400 hover:bg-green-500/25", handleApprove, "approve")}
      {btn("Reject", "bg-red-500/15 text-red-400 hover:bg-red-500/25", handleReject, "reject")}
      {btn("Flag", "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25", handleFlag, "flag")}
    </div>
  );
}
