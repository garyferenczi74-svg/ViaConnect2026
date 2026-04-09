"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface CommentBoxProps {
  messageId: string;
  onCommentSubmitted?: () => void;
}

export default function CommentBox({ messageId, onCommentSubmitted }: CommentBoxProps) {
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  const submit = async (isDirective: boolean) => {
    if (!content.trim() || busy) return;
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("jeffery_message_comments").insert({
        message_id: messageId,
        author_id: user.id,
        content: content.trim(),
        is_directive: isDirective,
      });

      if (isDirective) {
        await fetch("/api/admin/jeffery/process-comment-directive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId, comment: content.trim() }),
        });
      }

      setContent("");
      onCommentSubmitted?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); submit(false); } }}
          placeholder="Add a comment or directive for Jeffery..."
          disabled={busy}
          className="flex-1 bg-[#0F172A] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-white/20 transition-colors"
        />
        <button
          onClick={() => submit(false)}
          disabled={!content.trim() || busy}
          className="px-3 py-2 rounded-lg bg-white/5 text-white/60 text-xs hover:bg-white/10 transition-colors disabled:opacity-30"
        >
          Comment
        </button>
        <button
          onClick={() => submit(true)}
          disabled={!content.trim() || busy}
          className="px-3 py-2 rounded-lg bg-[#B75E18]/15 text-[#B75E18] text-xs font-medium hover:bg-[#B75E18]/25 transition-colors disabled:opacity-30"
          title="Send as a directive — Jeffery will learn from this"
        >
          Directive
        </button>
      </div>
      <p className="text-[10px] text-white/20">
        &quot;Comment&quot; = note for the log. &quot;Directive&quot; = Jeffery learns from this and adjusts behavior.
      </p>
    </div>
  );
}
