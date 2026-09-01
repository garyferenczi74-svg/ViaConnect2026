// DrinkLinc / LINC disconnect stub. Nothing to disconnect.

import { drinkLincComingSoonResponse, DRINKLINC_ROUTE_RUNTIME } from '../comingSoon';

export const runtime = DRINKLINC_ROUTE_RUNTIME;
export const dynamic = 'force-dynamic';

export async function POST() {
  return drinkLincComingSoonResponse();
}
