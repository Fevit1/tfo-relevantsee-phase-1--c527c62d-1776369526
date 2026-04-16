import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

/**
 * Public routes — do not require authentication.
 */
const PUBLIC_ROUTES = ['/login', '/invite', '/api/team/invite']

/**
 * Admin-only routes — redirect non-admins to /dashboard.
 */
const ADMIN_ONLY_ROUTES = ['/approvals', '/settings']

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Allow Next.js internals and static assets
  if (
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname === '/favicon.ico' ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Allow public API routes (invite acceptance, seed)
  if (
    pathname.startsWith('/api/team/invite') ||
    pathname.startsWith('/api/admin/seed-account')
  ) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — required for Server Components to pick up new session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isPublicRoute =
    PUBLIC_ROUTES.some((route) => pathname.startsWith(route)) ||
    pathname === '/'

  // Root redirect
  if (pathname === '/') {
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Unauthenticated user trying to access a protected route
  if (!user && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated user visiting login — redirect to dashboard
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Admin-only route enforcement
  // Note: role check in middleware is a UX convenience layer only.
  // Real enforcement is in API handlers via getAuthenticatedUser() + requireRole().
  if (user && ADMIN_ONLY_ROUTES.some((route) => pathname.startsWith(route))) {
    const { data: dbUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!dbUser || dbUser.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}