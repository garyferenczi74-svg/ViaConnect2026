// DrinkLinc / LINC status. No public partner API as of 2026-09-01 audit.

import { drinkLincComingSoonResponse } from './comingSoon';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return drinkLincComingSoonResponse();
}

export async function POST() {
  return drinkLincComingSoonResponse();
}
