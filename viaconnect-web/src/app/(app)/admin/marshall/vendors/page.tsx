import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from("vendor_baas")
    .select("id, vendor_name, scope, baa_signed_on, baa_expires_on")
    .order("vendor_name");
  const rows = (data ?? []) as Array<{ id: string; vendor_name: string; scope: string; baa_signed_on: string; baa_expires_on: string | null }>;
  const now = Date.now();

  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Vendor BAAs</h1>
      </div>
      <div className="space-y-2">
        {rows.map(v => {
          const expiresSoon =
            v.baa_expires_on && Date.parse(v.baa_expires_on) - now < 60 * 86_400_000;
          const expired = v.baa_expires_on && Date.parse(v.baa_expires_on) < now;
          return (
            <div key={v.id} className="bg-[#1E3054] rounded-lg border border-white/[0.08] p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-white">{v.vendor_name}</span>
                {expired && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400">expired</span>}
                {expiresSoon && !expired && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300">expires soon</span>}
                <span className="text-[10px] text-white/40 ml-auto">
                  Signed {v.baa_signed_on}{v.baa_expires_on ? ` · Expires ${v.baa_expires_on}` : ""}
                </span>
              </div>
              <p className="text-xs text-white/60 mt-1">{v.scope}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
