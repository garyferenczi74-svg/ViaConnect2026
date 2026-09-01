import { NextResponse } from 'next/server';
import { drinkLincComingSoonBody } from '@/lib/integrations/drinklinc/config';

export const DRINKLINC_ROUTE_RUNTIME = 'nodejs' as const;

/** 501 Coming soon. Never reports Connected. */
export function drinkLincComingSoonResponse(): NextResponse {
  return NextResponse.json(drinkLincComingSoonBody(), { status: 501 });
}
