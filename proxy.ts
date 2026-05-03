import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from './lib/session';
import { cookies } from 'next/headers';
import { canAccess } from './lib/rbac';

export async function proxy(request: NextRequest) {
    const res = NextResponse.next();
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

    const { pathname } = request.nextUrl;
    const method = request.method;

    // 1. Skip proxy for public files, assets, and auth APIs
    if (
        pathname.startsWith('/_next') || 
        pathname.startsWith('/api/login') ||
        pathname.startsWith('/api/logout') ||
        pathname.startsWith('/api/auth/google') ||
        pathname.includes('.') // for favicon, etc.
    ) {
        return res;
    }

    // 2. Auth Check: If not logged in and trying to access an app page, redirect to login
    if (!session.isLoggedIn && pathname !== '/login') {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // 3. RBAC Check
    if (session.isLoggedIn && !canAccess(pathname, method, session.permissions)) {
        console.warn(`RBAC REJECT: User ${session.name} (${session.role}) -> ${method} ${pathname}`);
        
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (handled individually for more granular control if needed)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
