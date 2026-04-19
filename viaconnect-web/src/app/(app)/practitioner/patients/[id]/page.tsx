// Revised Prompt #91 Phase 5.5: per-patient detail page with view-mode toggle.
//
// Resolves the effective view mode in this priority order:
//   1. ?view=standard|naturopathic (current navigation, transient)
//   2. practitioner_patients.patient_view_mode_override (per-patient default)
//   3. practitioners.default_patient_view_mode (account default)
//
// Renders Standard or Naturopathic view; the segmented control only appears
// for credential types that support naturopathic view (nd, dc, lac).
//
// The pre-revision client implementation is preserved at LegacyPatientView.tsx
// and rendered as the Standard view body so existing UX is unchanged for
// non-naturopath credentials.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PatientViewModeSelector } from '@/components/practitioner/PatientViewModeSelector';
import { StandardPatientView } from '@/components/practitioner/StandardPatientView';
import { NaturopathicPatientView } from '@/components/practitioner/NaturopathicPatientView';
import LegacyPatientDetailView from './LegacyPatientView';

export const dynamic = 'force-dynamic';

const NATUROPATH_LIKE = new Set(['nd', 'dc', 'lac']);

interface PageProps {
  params: { id: string };
  searchParams: { view?: string };
}

interface PractitionerSlim {
  id: string;
  credential_type: string;
  default_patient_view_mode: 'standard' | 'naturopathic';
}

interface RelationshipSlim {
  id: string;
  consent_share_caq: boolean;
  consent_share_protocols: boolean;
  consent_share_engagement_score: boolean;
  consent_share_nutrition: boolean;
  can_view_genetics: boolean;
  patient_view_mode_override: 'standard' | 'naturopathic' | null;
}

export default async function PractitionerPatientDetailPage({
  params,
  searchParams,
}: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: pRow } = await (supabase as any)
    .from('practitioners')
    .select('id, credential_type, default_patient_view_mode')
    .eq('user_id', user.id)
    .eq('account_status', 'active')
    .maybeSingle();
  const practitioner = (pRow ?? null) as PractitionerSlim | null;

  // If no practitioner record yet, fall back to the legacy view to avoid a
  // hard redirect for accounts mid-onboarding.
  if (!practitioner) {
    return <LegacyPatientDetailView />;
  }

  const { data: relRow } = await (supabase as any)
    .from('practitioner_patients')
    .select(
      'id, consent_share_caq, consent_share_protocols, consent_share_engagement_score, consent_share_nutrition, can_view_genetics, patient_view_mode_override',
    )
    .eq('practitioner_id', user.id)
    .eq('patient_id', params.id)
    .eq('status', 'active')
    .maybeSingle();
  const relationship = (relRow ?? null) as RelationshipSlim | null;

  // No active relationship: render the legacy view so demo / mock-data routes
  // still work; the new RLS-gated views require a real relationship row.
  if (!relationship) {
    return <LegacyPatientDetailView />;
  }

  const canShowNaturopathic = NATUROPATH_LIKE.has(practitioner.credential_type);

  const urlView =
    searchParams.view === 'standard' || searchParams.view === 'naturopathic'
      ? (searchParams.view as 'standard' | 'naturopathic')
      : null;

  const effectiveViewMode: 'standard' | 'naturopathic' =
    urlView ??
    relationship.patient_view_mode_override ??
    practitioner.default_patient_view_mode;

  const renderNaturopathic = effectiveViewMode === 'naturopathic' && canShowNaturopathic;

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      {canShowNaturopathic && (
        <div className="mb-6">
          <PatientViewModeSelector
            patientId={params.id}
            currentMode={effectiveViewMode}
            savedOverride={relationship.patient_view_mode_override}
            practitionerDefault={practitioner.default_patient_view_mode}
          />
        </div>
      )}

      {renderNaturopathic ? (
        <NaturopathicPatientView patientId={params.id} relationship={relationship} />
      ) : (
        // Standard view: spec-aligned consent-gated component. The legacy
        // client UI remains as the no-relationship fallback above so demo
        // / mock-data routes still work.
        <StandardPatientView patientId={params.id} relationship={relationship} />
      )}
    </div>
  );
}
