'use client';

// Prompt #103 Phase 4: Sproutables brand-story page.
// VIACURA wordmark appears only in a small legal footer (parent
// company disclosure), nowhere else.

import Link from 'next/link';
import { ArrowLeft, Leaf } from 'lucide-react';

export default function SproutablesAboutPage() {
  return (
    <div className="min-h-screen" style={{ background: '#0F2616', color: '#E8F5E8' }}>
      <header className="px-4 md:px-10 py-6 border-b" style={{ borderColor: 'rgba(106,191,75,0.25)' }}>
        <Link href="/shop/sproutables" className="text-xs inline-flex items-center gap-1" style={{ color: 'rgba(232,245,232,0.7)' }}>
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Sproutables
        </Link>
      </header>
      <main className="px-4 md:px-10 py-10 md:py-14 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 mb-4" style={{ color: '#6ABF4B' }}>
          <Leaf className="w-7 h-7" strokeWidth={1.5} />
          <h1 className="text-2xl md:text-4xl font-bold" style={{ color: '#C0C0C0' }}>
            About Sproutables
          </h1>
        </div>
        <p className="italic mb-6" style={{ color: '#6ABF4B' }}>Peak Growth and Wellness</p>
        <div className="space-y-4 text-sm md:text-base leading-relaxed" style={{ color: 'rgba(232,245,232,0.88)' }}>
          <p>
            Sproutables is a children's supplement line built on methylated nutrition, dose-appropriate portions, and the gentlest delivery forms kids will actually take. Every Sproutables product honors the same formulation rigor as our adult line while meeting the different absorption profiles growing bodies need.
          </p>
          <p>
            Every batch ships with GMP certification, third-party lab verification, and full ingredient traceability. No artificial colors, no added sugar, no synthetic fillers.
          </p>
          <p>
            Sproutables products are formulated and manufactured to the same standards as our adult formulations.
          </p>
        </div>
      </main>
      <footer className="px-4 md:px-10 py-6 border-t text-[11px]" style={{ borderColor: 'rgba(106,191,75,0.2)', color: 'rgba(232,245,232,0.45)' }}>
        A ViaCura family brand. Manufactured by FarmCeutica Wellness LLC.
      </footer>
    </div>
  );
}
