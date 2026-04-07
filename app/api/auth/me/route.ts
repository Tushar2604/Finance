import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import dbConnect from '@/lib/db/connection'
import User from '@/lib/db/models/User'
import type { JWTPayload } from '@/lib/auth/jwt'

export const GET = withAuth(
  async (_req: NextRequest, _context: { params: Record<string, string> }, user: JWTPayload): Promise<NextResponse> => {
    try {
      await dbConnect()

      const dbUser = await User.findById(user.userId).select('-password')
      if (!dbUser) {
        return NextResponse.json(apiError('User not found'), { status: 404 })
      }

      return NextResponse.json(
        apiSuccess({
          _id: dbUser._id.toString(),
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          isActive: dbUser.isActive,
          lastLogin: dbUser.lastLogin,
          createdAt: dbUser.createdAt,
          updatedAt: dbUser.updatedAt,
        })
      )
    } catch (err) {
      console.error('[GET /api/auth/me]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  }
)
