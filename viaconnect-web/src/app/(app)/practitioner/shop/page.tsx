'use client';

// Practitioner Shop hub — landing page for the practitioner shop experience.
// If no patient is selected, shows the inline PatientSelector. Once a patient
// is picked, shows navigation cards: Browse Products (links to /shop with the
// patient context active), Patient Orders, My Recommendations, Peptide
// Catalog. Future Phase 2D will deepen the integration so /shop renders
// practitioner pricing and patient-scoped Add-to-Cart actions natively.

import Link from 'next/link';
import {
  ShoppingBag,
  ClipboardList,
  Stethoscope,
  FlaskConical,
  TestTube2,
  ArrowRight,
} from 'lucide-react';
import { usePractitioner } from '@/context/PractitionerContext';
import { PatientSelector } from '@/components/practitioner/PatientSelector';

interface NavCardProps {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  accent: string;
}

function NavCard({ href, icon: Icon, title, description, accent }: NavCardProps) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#1E3054] p-4 transition-all duration-200 hover:border-[rgba(255,255,255,0.18)] sm:p-5"
      style={{ boxShadow: `inset 0 1px 0 ${accent}30` }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
          style={{
            background: `${accent}1A`,
            border: `1px solid ${accent}40`,
          }}
        >
          <Icon
            className="h-5 w-5"
            strokeWidth={1.5}
            style={{ color: accent }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white sm:text-base">{title}</h3>
          <p className="mt-0.5 text-xs leading-snug text-[rgba(255,255,255,0.55)]">
            {description}
          </p>
        </div>
        <ArrowRight
          className="mt-1 h-4 w-4 flex-shrink-0 text-[rgba(255,255,255,0.30)] transition-transform group-hover:translate-x-0.5 group-hover:text-[rgba(255,255,255,0.70)]"
          strokeWidth={1.5}
        />
      </div>
    </Link>
  );
}

export default function PractitionerShopHub() {
  const { selectedPatient } = usePractitioner();

  // No patient — render the selector inline
  if (!selectedPatient) {
    return (
      <div className="mx-auto max-w-3xl">
        <PatientSelector variant="page" />
      </div>
    );
  }

  // Patient selected — navigation hub
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Header */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2DA5A0]">
          Practitioner Shop
        </p>
        <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">
          Order &amp; Recommend for {selectedPatient.firstName}
        </h1>
        <p className="mt-1 text-sm text-[rgba(255,255,255,0.55)]">
          Browse the FarmCeutica catalog, place orders on behalf of your
          patient, and track your recommendations from one place.
        </p>
      </div>

      {/* Permission warning if patient hasn't granted ordering permission */}
      {!selectedPatient.canOrderPanels && !selectedPatient.canPrescribeProtocols && (
        <div className="rounded-2xl border border-[rgba(245,158,11,0.30)] bg-[rgba(245,158,11,0.08)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">
            Limited Permissions
          </p>
          <p className="mt-1 text-sm text-[rgba(255,255,255,0.65)]">
            {selectedPatient.firstName} has not granted you permission to
            prescribe protocols or order panels. You can still recommend
            products informationally and view their order history.
          </p>
        </div>
      )}

      {/* Navigation cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NavCard
          href="/shop"
          icon={ShoppingBag}
          title="Browse Supplements &amp; Tests"
          description="Full FarmCeutica catalog with practitioner pricing. Add products to the patient's cart."
          accent="#2DA5A0"
        />
        <NavCard
          href="/shop/peptides"
          icon={FlaskConical}
          title="Peptide Catalog"
          description="Educational peptide profiles. Use Recommend to send a formal recommendation to this patient."
          accent="#A855F7"
        />
        <NavCard
          href="/practitioner/shop/orders"
          icon={ClipboardList}
          title="Patient Orders"
          description="All orders you've placed across all of your patients with status, line items, and totals."
          accent="#60A5FA"
        />
        <NavCard
          href="/practitioner/shop/recommendations"
          icon={Stethoscope}
          title="My Recommendations"
          description="All peptide and product recommendations you've sent. Edit, discontinue, or view patient response."
          accent="#B75E18"
        />
      </div>

      {/* Standing reminder */}
      <div className="rounded-2xl border border-[rgba(45,165,160,0.20)] bg-[rgba(45,165,160,0.06)] p-4">
        <div className="flex items-start gap-3">
          <TestTube2
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#2DA5A0]"
            strokeWidth={1.5}
          />
          <p className="text-xs leading-relaxed text-[rgba(255,255,255,0.65)]">
            <strong className="text-white">Patient-scoped ordering.</strong>{' '}
            Every cart, order, and recommendation you create here is attached
            to {selectedPatient.firstName} {selectedPatient.lastName}. Switch
            patients from the banner above at any time.
          </p>
        </div>
      </div>
    </div>
  );
}
