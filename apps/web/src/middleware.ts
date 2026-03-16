import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PORTAL_ROLE_MAP: Record<string, string[]> = {
  '/wellness': ['patient'],
  '/practitioner': ['practitioner', 'clinic_admin', 'super_admin'],
  '/naturopath': ['naturopath', 'super_admin'],
};

const PUBLIC_PATHS = ['/', '/login', '/signup', '/forgot-password'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  // Allow static assets and API routes
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }: { name: string; value: string }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: Record<string, unknown> }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check portal access based on role
  for (const [portalPath, allowedRoles] of Object.entries(PORTAL_ROLE_MAP)) {
    if (pathname.startsWith(portalPath)) {
      const userRole = user.app_metadata?.role || 'patient';
      if (!allowedRoles.includes(userRole)) {
        // Redirect to appropriate portal
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/';
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
