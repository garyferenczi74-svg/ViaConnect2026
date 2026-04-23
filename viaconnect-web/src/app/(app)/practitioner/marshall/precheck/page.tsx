import { Radar } from "lucide-react";
import PrecheckWorkspace from "@/components/precheck/PrecheckWorkspace";

export const dynamic = "force-dynamic";

export default function PrecheckWorkspacePage() {
  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Radar className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Marshall pre-check</h1>
        <span className="text-xs text-white/40 ml-2">Jeffery consulting Marshall before you publish.</span>
      </div>
      <p className="text-xs text-white/50">
        Paste a draft, upload supporting media, or fire up the browser extension.
        Jeffery runs it past Marshall, returns findings in coaching tone, and,
        if the draft is clean, attaches a signed clearance receipt that Hounddog
        honors if the published post is ever flagged later. Drafts are hashed;
        plaintext is never stored.
      </p>
      <PrecheckWorkspace />
    </div>
  );
}
