/**
 * Prompt 214d Gap 3: consumer commercial peptide shop RETIRED.
 * Permanent redirect to Peptide Education. Data/registry preserved for
 * possible future practitioner-channel restore (no destructive delete).
 */

import { redirect } from 'next/navigation';

export default function ShopPeptidesRetiredPage() {
  redirect('/peptide-protocol');
}
