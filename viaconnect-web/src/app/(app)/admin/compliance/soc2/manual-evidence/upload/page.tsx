import Link from 'next/link';
import { ChevronLeft, Upload } from 'lucide-react';
import ManualEvidenceUploadForm from '@/components/compliance/soc2/ManualEvidenceUploadForm';

export const dynamic = 'force-dynamic';

export default function ManualEvidenceUploadPage() {
  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/compliance/soc2/manual-evidence" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          Manual evidence
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <Upload className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Upload manual evidence</h1>
            <p className="text-xs text-white/40">Attach the TSC control codes this artifact supports. Steve will sign off before it bundles into a live packet.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 max-w-3xl">
        <ManualEvidenceUploadForm />
      </div>
    </div>
  );
}
