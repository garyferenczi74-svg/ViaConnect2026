import { NextResponse } from 'next/server';
import { drinkLincComingSoonBody } from '@/lib/integrations/drinklinc/config';

/** 501 Coming soon. Never reports Connected. */
export function drinkLincComingSoonResponse(): NextResponse {
  return NextResponse.json(drinkLincComingSoonBody(), { status: 501 });
}
