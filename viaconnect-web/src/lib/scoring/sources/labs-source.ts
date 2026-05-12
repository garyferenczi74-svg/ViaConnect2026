// Labs source for the Bio Optimization Score compute bundle.
//
// NO BACKING TABLE EXISTS in the live schema. The /plugins/labs/page.tsx
// route is fully static; cards for Upload PDF / Quest Diagnostics /
// Labcorp toast "Connection flow coming soon" with the note
// "Terra API integration in progress".
//
// Until the Labs ingestion ships, this helper returns a hardcoded empty
// shape. Tier 2 (confidence 0.860) is therefore unreachable for any
// current user; Hannah will see labs.present = false and never promote
// the tier above 1 unless Genetics is present.
//
// A follow-on prompt will land the labs table + ingestion. When that
// happens, this helper should be rewritten to read the new lab_uploads
// table. Out of scope for #161.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface LabsSource {
  present: boolean;
  uploaded_at: string | null;
  panel_count: number;
}

const EMPTY: LabsSource = {
  present: false,
  uploaded_at: null,
  panel_count: 0,
};

export async function getLabsSource(
  _userId: string,
  _supabase: SupabaseClient,
): Promise<LabsSource> {
  return EMPTY;
}
