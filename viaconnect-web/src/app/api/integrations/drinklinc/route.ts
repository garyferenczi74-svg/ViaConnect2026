// DrinkLinc / LINC status. No public partner API as of 2026-09-01 audit.

import { drinkLincComingSoonResponse, DRINKLINC_ROUTE_RUNTIME } from './comingSoon';

export const runtime = DRINKLINC_ROUTE_RUNTIME;
export const dynamic = 'force-dynamic';

export async function GET() {
  return drinkLincComingSoonResponse();
}

export async function POST() {
  return drinkLincComingSoonResponse();
}
