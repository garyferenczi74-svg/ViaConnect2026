'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  FlaskConical,
  Dna,
  Battery,
  Zap,
  Flame,
  BrainCircuit,
  Shield,
  Activity,
  Clock,
  Heart,
  Leaf,
  TrendingDown,
  Brain,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import { ALL_CATEGORIES } from '@/config/peptide-database/registry';
import { PeptideDisclaimerBanner } from '@/components/peptide-protocol/PeptideDisclaimerBanner';
import { PeptideCatalogCard } from '@/components/shop/PeptideCatalogCard';

// Map the registry category icon strings → Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  Dna,
  Battery,
  Zap,
  Flame,
  BrainCircuit,
  Brain,
  Shield,
  Activity,
  Clock,
  Heart,
  Leaf,
  TrendingDown,
  FlaskConical,
};

export default function PeptidesCatalogPage() {
  // Defensive Semaglutide filter (standing rule). Currently no-op since the
  // FarmCeutica registry never included it, but kept for forward safety.
  const categories = ALL_CATEGORIES.map((cat) => ({
    ...cat,
    products: cat.products.filter(
      (p) => !p.id.includes('semaglutide') && !p.name.toLowerCase().includes('semaglutide'),
    ),
  })).filter((cat) => cat.products.length > 0);

  const totalPeptides = categories.reduce((sum, c) => sum + c.products.length, 0);
  const totalSkus = categories.reduce(
    (sum, c) => sum + c.products.reduce((s, p) => s + p.dosingForms.length, 0),
    0,
  );

  return (
    <div
      className="min-h-screen px-3 py-5 sm:px-4 md:px-8 md:py-6"
      style={{ background: 'linear-gradient(180deg, #0F1520, #1A2744)' }}
    >
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Back link */}
        <Link
          href="/shop"
          className="inline-flex items-center gap-1.5 text-xs text-[rgba(255,255,255,0.45)] transition-colors hover:text-[rgba(255,255,255,0.75)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Back to Shop
        </Link>

        {/* Page header */}
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-[rgba(45,165,160,0.30)] bg-gradient-to-br from-[#1A2744] to-[#2DA5A0] sm:h-12 sm:w-12">
            <FlaskConical className="h-5 w-5 text-white sm:h-6 sm:w-6" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-lg font-bold tracking-tight text-white sm:text-xl md:text-2xl">
              Peptide Catalog
            </h1>
            <p className="mt-0.5 text-xs leading-snug text-[rgba(255,255,255,0.45)] sm:text-sm">
              {totalPeptides} peptides · {categories.length} categories · {totalSkus} delivery configurations
            </p>
          </div>
        </div>

        {/* Disclaimer banner — reused from /peptide-protocol */}
        <PeptideDisclaimerBanner />

        {/* Educational intro */}
        <div className="rounded-2xl border border-[rgba(45,165,160,0.15)] bg-gradient-to-br from-[rgba(45,165,160,0.06)] to-[rgba(26,39,68,0.40)] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#B75E18]"
              strokeWidth={1.5}
            />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#B75E18] sm:text-sm">
                Important Notice
              </p>
              <p className="text-xs leading-relaxed text-[rgba(255,255,255,0.70)] sm:text-sm">
                FarmCeutica Wellness LLC provides peptide information, educational
                resources, and personalized recommendations based on your Clinical
                Assessment Questionnaire (CAQ) responses and GeneX360™ genetic test
                results.{' '}
                <strong className="text-[#B75E18]">
                  We do not sell, dispense, or distribute peptide products at retail.
                </strong>
              </p>
              <p className="text-xs leading-relaxed text-[rgba(255,255,255,0.60)] sm:text-sm">
                The peptide data presented here is intended for educational purposes and
                to support informed conversations with your licensed healthcare
                practitioner, naturopath, or prescribing physician. Your personalized
                peptide profile and delivery form recommendations can be shared directly
                with your provider through the ViaConnect™ Practitioner Portal.
              </p>
              <p className="text-xs leading-relaxed text-[rgba(255,255,255,0.60)] sm:text-sm">
                Always consult a qualified healthcare professional before beginning any
                peptide protocol.
              </p>
            </div>
          </div>
        </div>

        {/* Category sections */}
        {categories.map((cat) => {
          const Icon = ICON_MAP[cat.icon] ?? FlaskConical;
          return (
            <section key={cat.id} className="space-y-3">
              {/* Category header */}
              <div
                className="flex items-center gap-3 rounded-2xl border p-3 sm:p-4"
                style={{
                  background: `linear-gradient(135deg, ${cat.color}1A, ${cat.color}05)`,
                  borderColor: `${cat.color}33`,
                }}
              >
                <div
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10"
                  style={{
                    background: `${cat.color}26`,
                    border: `1px solid ${cat.color}40`,
                  }}
                >
                  <Icon
                    className="h-4 w-4 sm:h-5 sm:w-5"
                    strokeWidth={1.5}
                    style={{ color: cat.color }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h2
                    className="break-words text-sm font-semibold leading-tight sm:text-base"
                    style={{ color: cat.color }}
                  >
                    {cat.label}
                  </h2>
                  <p className="mt-0.5 text-[10px] text-[rgba(255,255,255,0.40)] sm:text-xs">
                    {cat.products.length} peptide
                    {cat.products.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Card grid: 1 col mobile, 2 col tablet, 3 col desktop */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cat.products.map((peptide) => (
                  <PeptideCatalogCard key={peptide.id} peptide={peptide} />
                ))}
              </div>
            </section>
          );
        })}

        {/* Bottom reminder */}
        <div className="rounded-2xl border border-[rgba(183,94,24,0.15)] bg-[rgba(183,94,24,0.06)] p-4 text-center">
          <p className="text-xs leading-relaxed text-[rgba(255,255,255,0.55)]">
            All peptide information on this page is educational only.
            FarmCeutica Wellness LLC does not sell peptides at retail. Use the
            <span className="text-[#2DA5A0]"> Share </span>
            buttons to send peptide profiles to your licensed practitioner or naturopath
            for personalized protocol design.
          </p>
        </div>
      </div>
    </div>
  );
}
