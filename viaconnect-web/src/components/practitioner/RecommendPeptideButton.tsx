'use client';

// RecommendPeptideButton — replaces "Add to Cart" / "Share with Practitioner"
// for peptide cards when viewed inside the practitioner or naturopath portal.
// Opens the RecommendationModal which writes to practitioner_recommendations.

import { useState } from 'react';
import { Stethoscope, Lock } from 'lucide-react';
import { usePractitioner } from '@/context/PractitionerContext';
import { RecommendationModal } from './RecommendationModal';

interface RecommendPeptideButtonProps {
  /** product_slug recorded on the recommendation row. */
  slug: string;
  name: string;
  productType?: 'peptide' | 'supplement' | 'genetic_test' | 'custom_package';
  category?: string;
  deliveryForms?: string[];
  /** Visual style. */
  variant?: 'primary' | 'compact';
  className?: string;
}

export function RecommendPeptideButton({
  slug,
  name,
  productType = 'peptide',
  category,
  deliveryForms,
  variant = 'primary',
  className = '',
}: RecommendPeptideButtonProps) {
  const { selectedPatient, portalType } = usePractitioner();
  const [open, setOpen] = useState(false);

  const accent = portalType === 'naturopath' ? '#B75E18' : '#2DA5A0';
  const accentBg =
    portalType === 'naturopath'
      ? 'rgba(183,94,24,0.15)'
      : 'rgba(45,165,160,0.15)';
  const accentBorder =
    portalType === 'naturopath'
      ? 'rgba(183,94,24,0.30)'
      : 'rgba(45,165,160,0.30)';

  const disabled = !selectedPatient;

  if (variant === 'compact') {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          className={`inline-flex min-h-[36px] items-center justify-center gap-1 rounded-xl border px-3 py-2 text-xs font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
          style={{
            backgroundColor: accentBg,
            borderColor: accentBorder,
            color: accent,
          }}
        >
          {disabled ? (
            <>
              <Lock className="h-3 w-3" strokeWidth={1.5} />
              Select Patient
            </>
          ) : (
            <>
              <Stethoscope className="h-3.5 w-3.5" strokeWidth={1.5} />
              Recommend
            </>
          )}
        </button>
        {open && (
          <RecommendationModal
            product={{ slug, name, productType, category, deliveryForms }}
            open={open}
            onClose={() => setOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${className}`}
        style={{
          backgroundColor: accentBg,
          borderColor: accentBorder,
          color: accent,
        }}
      >
        {disabled ? (
          <>
            <Lock className="h-4 w-4" strokeWidth={1.5} />
            Select a patient first
          </>
        ) : (
          <>
            <Stethoscope className="h-4 w-4" strokeWidth={1.5} />
            Recommend to {selectedPatient?.firstName ?? 'Patient'}
          </>
        )}
      </button>
      {open && (
        <RecommendationModal
          product={{ slug, name, productType, category, deliveryForms }}
          open={open}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
