import { NextRequest, NextResponse } from 'next/server'
import { verifyRefreshToken, generateAccessToken } from '@/lib/auth/jwt'
import { apiSuccess, apiError } from '@/lib/utils'
import dbConnect from '@/lib/db/connection'
import User from '@/lib/db/models/User'

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await dbConnect()

    const refreshToken = req.cookies.get('refresh_token')?.value
    if (!refreshToken) {
      return NextResponse.json(apiError('Refresh token not found'), { status: 401 })
    }

    const payload = verifyRefreshToken(refreshToken)
    if (!payload) {
      return NextResponse.json(apiError('Invalid or expired refresh token'), { status: 401 })
    }

    // Verify user still exists and is active
    const user = await User.findById(payload.userId)
    if (!user || !user.isActive) {
      return NextResponse.json(apiError('User not found or inactive'), { status: 401 })
    }

    const newAccessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    })

    const response = NextResponse.json(
      apiSuccess({ accessToken: newAccessToken }, 'Token refreshed successfully'),
      { status: 200 }
    )

    response.cookies.set('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15,
      path: '/',
    })

    return response
  } catch (err) {
    console.error('[POST /api/auth/refresh]', err)
    return NextResponse.json(apiError('Internal server error'), { status: 500 })
  }
}
