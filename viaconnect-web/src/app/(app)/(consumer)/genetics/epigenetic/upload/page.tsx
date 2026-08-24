// Brief 17: EpigenHQ measured-report upload is its own page again.
// The seven-tab Upload Genetic Data surface collapsed to one DNA upload,
// so this route no longer redirects to a tab on the DNA page.

import Link from "next/link";
import { ArrowLeft, Hourglass } from "lucide-react";
import { EpigenUploadPanel } from "@/components/genetics/upload/EpigenUploadPanel";

export const metadata = {
  title: "Upload Epigenetic Results | Via Cura",
  description: "Upload your EpigenHQ measured report and verify every reading before it is saved.",
};

export default function EpigeneticUploadPage() {
  return (
    <div className="min-h-screen bg-[#1A2744] text-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 flex items-center gap-3">
          <Link
            href="/genetics"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg p-2 text-white/70 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70"
          >
            <ArrowLeft aria-hidden="true" className="h-5 w-5" strokeWidth={1.5} />
            <span className="sr-only">My Genetics</span>
          </Link>
          <Hourglass className="h-6 w-6 text-[#2DA5A0]" strokeWidth={1.5} />
          <div>
            <h1 className="text-2xl font-bold text-white">Upload Epigenetic Results</h1>
            <p className="text-sm text-white/60">
              Import your EpigenHQ measured report. DNA uploads live on the DNA upload page.
            </p>
          </div>
        </div>
        <EpigenUploadPanel />
      </div>
    </div>
  );
}
