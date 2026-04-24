import Link from 'next/link';
import { ChevronLeft, PlayCircle } from 'lucide-react';
import GeneratePacketForm from '@/components/compliance/soc2/GeneratePacketForm';

export const dynamic = 'force-dynamic';

export default function GeneratePacketPage() {
  const { start, end } = previousMonthBounds();

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/compliance/soc2/packets" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          Packets
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <PlayCircle className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Generate packet</h1>
            <p className="text-xs text-white/40">Manual trigger. The monthly cron runs on the 2nd at 04:07 UTC; use this form for off-cycle runs or catch-up.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 max-w-3xl">
        <GeneratePacketForm defaultStart={start} defaultEnd={end} />
      </div>
    </div>
  );
}

function previousMonthBounds(): { start: string; end: string } {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0) - 1);
  return {
    start: toLocalInput(start),
    end:   toLocalInput(end),
  };
}

function toLocalInput(d: Date): string {
  return d.toISOString().slice(0, 16);
}
