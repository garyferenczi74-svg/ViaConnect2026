// DrinkLinc / LINC authorize stub. No OAuth URLs exist yet.

import { drinkLincComingSoonResponse, DRINKLINC_ROUTE_RUNTIME } from '../comingSoon';

export const runtime = DRINKLINC_ROUTE_RUNTIME;
export const dynamic = 'force-dynamic';

export async function GET() {
  return drinkLincComingSoonResponse();
}
