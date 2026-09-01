// DrinkLinc / LINC authorize stub. No OAuth URLs exist yet.

import { drinkLincComingSoonResponse } from '../comingSoon';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return drinkLincComingSoonResponse();
}
