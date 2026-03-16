import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Portal access by JWT role claim
const PORTAL_ROLE_MAP: Record<string, string[]> = {
  '/wellness': ['patient'],
  '/practitioner': ['practitioner', 'clinic_admin', 'super_admin'],
  '/naturopath': ['naturopath', 'super_admin'],
};

// Role to default portal redirect
const ROLE_DEFAULT_PORTAL: Record<string, string> = {
  patient: '/wellness',
  practitioner: '/practitioner',
  naturopath: '/naturopath',
  clinic_admin: '/practitioner',
  super_admin: '/practitioner',
};

// Paths that don't require authentication
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/auth/callback',
];

// Paths that require auth but no specific role
const AUTH_ONLY_PATHS = ['/onboarding', '/mfa'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
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

  // Extract role from JWT claims (app_metadata set during sign-up)
  const userRole: string = user.app_metadata?.role || 'patient';

  // Auth-only paths (onboarding, MFA) - any authenticated user can access
  if (AUTH_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return response;
  }

  // Check portal access based on JWT role claim
  for (const [portalPath, allowedRoles] of Object.entries(PORTAL_ROLE_MAP)) {
    if (pathname.startsWith(portalPath)) {
      if (!allowedRoles.includes(userRole)) {
        // Redirect to user's appropriate portal based on their role
        const defaultPortal = ROLE_DEFAULT_PORTAL[userRole] || '/wellness';
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = defaultPortal;
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
