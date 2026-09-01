// DrinkLinc / LINC callback stub. No token exchange.

import { drinkLincComingSoonResponse } from '../comingSoon';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return drinkLincComingSoonResponse();
}

export async function POST() {
  return drinkLincComingSoonResponse();
}
