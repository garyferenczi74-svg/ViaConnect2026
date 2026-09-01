// DrinkLinc / LINC callback stub. No token exchange.

import { drinkLincComingSoonResponse, DRINKLINC_ROUTE_RUNTIME } from '../comingSoon';

export const runtime = DRINKLINC_ROUTE_RUNTIME;
export const dynamic = 'force-dynamic';

export async function GET() {
  return drinkLincComingSoonResponse();
}

export async function POST() {
  return drinkLincComingSoonResponse();
}
