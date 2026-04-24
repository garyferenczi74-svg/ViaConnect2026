import Link from 'next/link';
import { ChevronLeft, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import NewGrantForm, { type PacketOption } from '@/components/compliance/soc2/NewGrantForm';

export const dynamic = 'force-dynamic';

export default async function NewGrantPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from('soc2_packets')
    .select('id, packet_uuid, period_start, period_end')
    .order('generated_at', { ascending: false })
    .limit(50);
  const packets: PacketOption[] = (data as PacketOption[] | null) ?? [];

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/compliance/soc2/auditor-grants" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          Auditor grants
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">New auditor grant</h1>
            <p className="text-xs text-white/40">Auditor receives a magic link at the email below; access is scoped to the selected packets and expires at the chosen date.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 max-w-3xl">
        <NewGrantForm packets={packets} />
      </div>
    </div>
  );
}
