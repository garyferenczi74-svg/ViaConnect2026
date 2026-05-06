import { redirect } from 'next/navigation';

// Prompt #85b: Muscle tab merged into Body Composition. Backward-compat redirect.
export default function MusclePage() {
  redirect('/body-tracker/composition?section=muscle');
}
