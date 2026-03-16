import { createServerClient } from '@supabase/ssr';
import type { Database } from './types';

type NextRequest = {
  cookies: {
    getAll: () => { name: string; value: string }[];
  };
  nextUrl: { pathname: string; clone: () => URL };
};

type NextResponse = {
  cookies: {
    set: (cookie: { name: string; value: string; options?: Record<string, unknown> }) => void;
  };
};

export function createMiddlewareClient(request: NextRequest, response: NextResponse) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: Record<string, unknown> }) => {
            response.cookies.set({ name, value, options });
          });
        },
      },
    },
  );
}
