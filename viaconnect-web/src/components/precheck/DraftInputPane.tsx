"use client";

import { useState } from "react";
import { Loader2, Radar } from "lucide-react";

const PLATFORMS = ["instagram", "tiktok", "youtube", "x", "linkedin", "facebook", "substack", "wordpress", "medium", "beehiiv", "convertkit", "mailchimp", "generic"];

export interface DraftInputPaneProps {
  onScan: (text: string, targetPlatform: string) => Promise<void>;
  scanning?: boolean;
  defaultText?: string;
}

export default function DraftInputPane({ onScan, scanning, defaultText }: DraftInputPaneProps) {
  const [text, setText] = useState(defaultText ?? "");
  const [platform, setPlatform] = useState("generic");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <label className="text-xs text-white/60">Target platform</label>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="bg-[#0F172A] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white outline-none"
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <span className="text-[10px] text-white/40 ml-auto">{text.length} / 20000</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste your draft here. Caption, newsletter, video description, podcast post, anything headed public."
        className="flex-1 min-h-[280px] bg-[#0F172A] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20 resize-none"
      />
      <div className="flex items-center justify-end mt-3">
        <button
          onClick={() => onScan(text, platform)}
          disabled={scanning || !text.trim() || text.length > 20000}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-[#B75E18]/20 text-[#B75E18] hover:bg-[#B75E18]/30 disabled:opacity-30 flex items-center gap-2"
        >
          {scanning ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <Radar className="w-4 h-4" strokeWidth={1.5} />}
          Scan with Marshall
        </button>
      </div>
    </div>
  );
}
