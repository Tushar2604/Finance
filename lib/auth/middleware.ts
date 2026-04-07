import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, type JWTPayload } from './jwt'
import type { UserRole } from '@/lib/db/models/User'

export interface AuthenticatedRequest extends NextRequest {
  user: JWTPayload
}

type RouteHandler = (
  req: NextRequest,
  context: any,
  user: JWTPayload
) => Promise<NextResponse> | NextResponse

/**
 * Extract the bearer token from the Authorization header or the httpOnly cookie.
 */
function extractToken(req: NextRequest): string | null {
  // Check Authorization header first
  const authHeader = req.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim()
  }

  // Fall back to httpOnly cookie
  const cookieToken = req.cookies.get('access_token')?.value
  return cookieToken ?? null
}

/**
 * Higher-order function that wraps a route handler with authentication.
 * Optionally enforces role-based access control.
 *
 * Usage:
 *   export const GET = withAuth(handler)
 *   export const POST = withAuth(handler, ['Admin', 'Finance'])
 */
export function withAuth(
  handler: RouteHandler,
  allowedRoles?: UserRole[]
): (req: NextRequest, context: any) => Promise<NextResponse> {
  return async (req, context) => {
    const token = extractToken(req)

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = verifyAccessToken(token)

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Role-based access control
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(payload.role)) {
        return NextResponse.json(
          {
            success: false,
            error: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
          },
          { status: 403 }
        )
      }
    }

    return handler(req, context, payload)
  }
}

/**
 * Higher-order function for role-based access control.
 * Returns a middleware that ensures the user has one of the specified roles.
 *
 * Usage:
 *   export const DELETE = withRoles('Admin')(handler)
 */
export function withRoles(...roles: UserRole[]) {
  return (handler: RouteHandler) => withAuth(handler, roles)
}

/**
 * Helper to check if a request has a valid token and return the payload.
 * Useful for optional auth scenarios.
 */
export function getTokenPayload(req: NextRequest): JWTPayload | null {
  const token = extractToken(req)
  if (!token) return null
  return verifyAccessToken(token)
}

/**
 * Create a standardised unauthorised response.
 */
export function unauthorizedResponse(message = 'Authentication required'): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status: 401 })
}

/**
 * Create a standardised forbidden response.
 */
export function forbiddenResponse(message = 'Insufficient permissions'): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status: 403 })
}
