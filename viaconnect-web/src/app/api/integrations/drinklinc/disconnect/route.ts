// DrinkLinc / LINC disconnect stub. Nothing to disconnect.

import { drinkLincComingSoonResponse } from '../comingSoon';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  return drinkLincComingSoonResponse();
}
