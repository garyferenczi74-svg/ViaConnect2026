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
// Missing practitioner or relationship rows render an honest empty state.
// LegacyPatientView is not used as a staged-PHI fallback.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PatientViewModeSelector } from '@/components/practitioner/PatientViewModeSelector';
import { StandardPatientView } from '@/components/practitioner/StandardPatientView';
import { NaturopathicPatientView } from '@/components/practitioner/NaturopathicPatientView';

export const dynamic = 'force-dynamic';

const NATUROPATH_LIKE = new Set(['nd', 'dc', 'lac']);

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
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

export default async function PractitionerPatientDetailPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: pRow } = await supabase
    .from('practitioners')
    .select('id, credential_type, default_patient_view_mode')
    .eq('user_id', user.id)
    .eq('account_status', 'active')
    .maybeSingle();
  const practitioner = (pRow ?? null) as PractitionerSlim | null;

  if (!practitioner) {
    return (
      <RosterEmptyState
        title="This account is not an active practitioner"
        body="Patient charts open only for an active practitioner record. No staged chart is shown."
      />
    );
  }

  const { data: relRow } = await supabase
    .from('practitioner_patients')
    .select(
      'id, consent_share_caq, consent_share_protocols, consent_share_engagement_score, consent_share_nutrition, can_view_genetics, patient_view_mode_override',
    )
    .eq('practitioner_id', user.id)
    .eq('patient_id', params.id)
    .eq('status', 'active')
    .maybeSingle();
  const relationship = (relRow ?? null) as RelationshipSlim | null;

  if (!relationship) {
    return (
      <RosterEmptyState
        title="This patient is not on your roster"
        body="Charts open only for an active practitioner_patients relationship. No staged chart is shown."
      />
    );
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
        <StandardPatientView patientId={params.id} relationship={relationship} />
      )}
    </div>
  );
}

function RosterEmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <div className="max-w-xl">
        <h1 className="text-heading-2 text-[#B75E18]">{title}</h1>
        <p className="text-sm text-secondary mt-2">{body}</p>
        <Link
          href="/practitioner/patients"
          className="inline-flex items-center mt-6 px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium text-[#4A90D9] border border-[#4A90D9]/30 hover:bg-[#4A90D9]/10"
        >
          Back to roster
        </Link>
      </div>
    </div>
  );
}
