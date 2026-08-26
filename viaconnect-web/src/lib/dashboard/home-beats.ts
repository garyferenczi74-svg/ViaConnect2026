// Brief 50: Home IA is the same four beats at 390 and 1280.
// BOS + Brief 48 next action live on MorningCard. Connections and
// Hannah/CC are entries into existing routes, not a second score.

import { CONNECTIONS_PATH } from '@/lib/body-tracker/wearable-tiles';
import { isAdminRole, type SessionRole } from '@/lib/auth/session-role';

export const HOME_BEAT_ORDER = [
  'bos',
  'protocol',
  'connections',
  'command-center',
] as const;

export type HomeBeatId = (typeof HOME_BEAT_ORDER)[number];

export const HOME_CONNECTIONS_HREF = CONNECTIONS_PATH;
export const HOME_CONSUMER_HANNAH_HREF = '/wellness/advisor';
export const HOME_ADMIN_CC_HREF = '/admin/jeffery';

export const HOME_CONNECTIONS_LABEL = 'Connections';
export const HOME_CONNECTIONS_CTA = 'Open Connections';
export const HOME_CONSUMER_HANNAH_LABEL = 'Hannah AI Wellness Assistant';
export const HOME_ADMIN_CC_LABEL = 'Jeffery™ Command Center';

export function homeCommandCenterHref(role: SessionRole | undefined): string {
  return isAdminRole(role) ? HOME_ADMIN_CC_HREF : HOME_CONSUMER_HANNAH_HREF;
}

export function homeCommandCenterLabel(role: SessionRole | undefined): string {
  return isAdminRole(role) ? HOME_ADMIN_CC_LABEL : HOME_CONSUMER_HANNAH_LABEL;
}
