'use client';

// Prompt #106 — admin shop refresh landing dashboard.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Package, Upload, ListChecks, FileText, ScrollText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Counts {
  findingsPending: number;
  gapFillInactive: number;
  inventoryRows: number;
  bindingsPrimary: number;
}

export default function ShopRefreshLanding() {
  const [c, setC] = useState<Counts | null>(null);

  const load = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = createClient() as unknown as any;
    const counter = async (table: string, col: string, val: unknown) => {
      const r = await sb.from(table).select(col, { count: 'exact', head: true }).eq(col, val);
      return (r.count as number | null) ?? 0;
    };
    const inv = await sb.from('supplement_photo_inventory').select('inventory_id', { count: 'exact', head: true });
    setC({
      findingsPending: await counter('shop_refresh_reconciliation_findings', 'resolution_status', 'pending_review'),
      gapFillInactive: await counter('product_catalog', 'active', false),
      inventoryRows: (inv.count as number | null) ?? 0,
      bindingsPrimary: await counter('supplement_photo_bindings', 'is_primary', true),
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Admin
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Package className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          Shop refresh
        </h1>
        <p className="text-xs text-white/60 max-w-2xl">
          Canonical supplement catalog reconciliation, image upload with EXIF stripping,
          gap-fill publication workflow. Never touches GeneX360 or peptide catalogs.
        </p>

        {c && (
          <div className="grid sm:grid-cols-4 gap-3">
            <Card label="Findings pending" value={String(c.findingsPending)} />
            <Card label="Inactive catalog rows" value={String(c.gapFillInactive)} />
            <Card label="Inventory objects" value={String(c.inventoryRows)} />
            <Card label="Primary bindings" value={String(c.bindingsPrimary)} />
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3 pt-4">
          <Tile href="/admin/shop/image-upload" icon={<Upload className="h-4 w-4" strokeWidth={1.5} />} title="Image upload" sub="Drag + drop bottle renders with EXIF strip" />
          <Tile href="/admin/shop/reconciliation" icon={<ListChecks className="h-4 w-4" strokeWidth={1.5} />} title="Reconciliation" sub="Three-way diff findings" />
          <Tile href="/admin/shop/pending-publication" icon={<FileText className="h-4 w-4" strokeWidth={1.5} />} title="Pending publication" sub="Gap-fill + activation queue" />
          <Tile href="/admin/shop/audit" icon={<ScrollText className="h-4 w-4" strokeWidth={1.5} />} title="Audit log" sub="All state changes, append only" />
        </div>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-white/65 mt-1">{label}</p>
    </div>
  );
}

function Tile(props: { href: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <Link href={props.href} className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 hover:bg-[#1A2744] p-4 flex items-start gap-3">
      <div className="text-[#E8803A] mt-0.5">{props.icon}</div>
      <div>
        <p className="text-sm text-white/90 font-medium">{props.title}</p>
        <p className="text-xs text-white/55 mt-0.5">{props.sub}</p>
      </div>
    </Link>
  );
}
