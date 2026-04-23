"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";

interface ActionButtonsProps {
  messageId: string;
  onActionComplete?: () => void;
}

export default function ActionButtons({ messageId, onActionComplete }: ActionButtonsProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

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
  const handleFlag = () => post("flag", { messageId });
  const openReject = () => { setReason(""); setRejectOpen(true); };
  const confirmReject = async () => {
    const trimmed = reason.trim();
    if (!trimmed) return;
    await post("reject", { messageId, reason: trimmed });
    setRejectOpen(false);
  };

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
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {btn("Approve", "bg-green-500/15 text-green-400 hover:bg-green-500/25", handleApprove, "approve")}
        {btn("Reject", "bg-red-500/15 text-red-400 hover:bg-red-500/25", openReject, "reject")}
        {btn("Flag", "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25", handleFlag, "flag")}
      </div>

      {rejectOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => { if (busy === null) setRejectOpen(false); }}
        >
          <div
            className="w-full max-w-md bg-[#1E3054] rounded-xl border border-white/[0.08] p-5 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Reject this proposal</h3>
                <p className="text-xs text-white/50 mt-1">Jeffery will learn from your reason and avoid similar proposals.</p>
              </div>
              <button
                onClick={() => { if (busy === null) setRejectOpen(false); }}
                className="text-white/40 hover:text-white/80 transition-colors p-1 rounded-md hover:bg-white/5"
                aria-label="Close"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Reason for rejection (e.g., 'wrong target audience', 'conflicts with brand voice', 'not enough confidence in sources')..."
              rows={4}
              autoFocus
              className="w-full bg-[#0F172A] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20 resize-none"
            />
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => setRejectOpen(false)}
                disabled={busy !== null}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:bg-white/5 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={!reason.trim() || busy !== null}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 disabled:opacity-30 transition-colors"
              >
                {busy === "reject"
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" strokeWidth={1.5} />
                  : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
