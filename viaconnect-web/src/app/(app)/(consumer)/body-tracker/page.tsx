// Prompt 180 (2026-06-08): My Biology Hub landing.
//
// Replaces the prior Dashboard render at this route. The Dashboard
// content moved to /body-tracker/dashboard so the root can become the
// bento navigation hub. Section pages stay untouched and each carry
// a back to hub link added in this prompt.

import { BodyTrackerHub } from '@/components/body-tracker/hub/BodyTrackerHub';

export const metadata = {
  title: 'My Biology',
};

export default function BodyTrackerHubPage() {
  return <BodyTrackerHub />;
}
