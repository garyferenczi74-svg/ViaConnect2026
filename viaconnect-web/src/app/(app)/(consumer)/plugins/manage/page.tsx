'use client';

import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';

function SectionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#2DA5A0] hover:text-[#2DA5A0]/80 transition-colors"
    >
      <Plus size={16} strokeWidth={1.5} />
      {label}
    </Link>
  );
}

export default function ManageConnectionsPage() {
  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/plugins"
          className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/70 transition-colors mb-4"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          Back to Plugin Hub
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: '#B75E18' }}>
          My Connections
        </h1>
      </div>

      <section className="space-y-3">
        <p className="text-overline">WEARABLES</p>
        <Link
          href="/body-tracker/connections"
          className="glass-v2 block rounded-2xl p-4 text-sm text-white/70 hover:text-white"
        >
          Manage Whoop, Oura, Hume Body Pod, and Apple Health on Connections. Status comes from last sync only.
        </Link>
      </section>

      <section className="space-y-3">
        <p className="text-overline">APPS</p>
        <div className="glass-v2 rounded-2xl p-4 text-sm text-white/70">
          Not connected. App status comes from last sync only. This page does not invent app rows.
        </div>
        <SectionLink href="/plugins/apps" label="Open Apps" />
      </section>

      <section className="space-y-3">
        <p className="text-overline">LABS</p>
        <div className="glass-v2 rounded-2xl p-4 text-sm text-white/70">
          Not enough data. Lab reports appear after a real upload. This page does not invent lab rows.
        </div>
        <SectionLink href="/plugins/labs" label="Upload New Lab Report" />
      </section>

      <section className="space-y-3">
        <p className="text-overline">GENETIC DATA IMPORTS</p>
        <div className="glass-v2 rounded-2xl p-4 text-sm text-white/70">
          Not analyzed. Imports appear after a real file is processed. This page does not invent SNP counts.
        </div>
        <SectionLink href="/genetics/upload" label="Upload genetic data" />
      </section>
    </div>
  );
}
