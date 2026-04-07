import jwt from 'jsonwebtoken'
import type { UserRole } from '@/lib/db/models/User'

export interface JWTPayload {
  userId: string
  email: string
  role: UserRole
}

interface AccessTokenPayload extends JWTPayload {
  type: 'access'
}

interface RefreshTokenPayload extends JWTPayload {
  type: 'refresh'
}

const ACCESS_SECRET = process.env.JWT_SECRET as string
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string

if (!ACCESS_SECRET || ACCESS_SECRET.length < 32) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be at least 32 characters in production')
  }
}

if (!REFRESH_SECRET || REFRESH_SECRET.length < 32) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_REFRESH_SECRET must be at least 32 characters in production')
  }
}

/**
 * Generate a short-lived access token (15 minutes).
 */
export function generateAccessToken(payload: JWTPayload): string {
  const tokenPayload: AccessTokenPayload = { ...payload, type: 'access' }
  return jwt.sign(tokenPayload, ACCESS_SECRET || 'dev-access-secret-fallback-32c', {
    expiresIn: '15m',
    issuer: 'bim-finance',
    audience: 'bim-finance-client',
  })
}

/**
 * Generate a long-lived refresh token (7 days).
 */
export function generateRefreshToken(payload: JWTPayload): string {
  const tokenPayload: RefreshTokenPayload = { ...payload, type: 'refresh' }
  return jwt.sign(tokenPayload, REFRESH_SECRET || 'dev-refresh-secret-fallback-32c', {
    expiresIn: '7d',
    issuer: 'bim-finance',
    audience: 'bim-finance-client',
  })
}

/**
 * Verify access token and return payload, or null if invalid.
 */
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET || 'dev-access-secret-fallback-32c', {
      issuer: 'bim-finance',
      audience: 'bim-finance-client',
    }) as AccessTokenPayload

    if (decoded.type !== 'access') return null

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    }
  } catch {
    return null
  }
}

/**
 * Verify refresh token and return payload, or null if invalid.
 */
export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET || 'dev-refresh-secret-fallback-32c', {
      issuer: 'bim-finance',
      audience: 'bim-finance-client',
    }) as RefreshTokenPayload

    if (decoded.type !== 'refresh') return null

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    }
  } catch {
    return null
  }
}

/**
 * Generate both access and refresh tokens for a user.
 */
export function generateTokenPair(payload: JWTPayload): {
  accessToken: string
  refreshToken: string
} {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  }
}
