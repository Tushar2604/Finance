import { NextRequest, NextResponse } from 'next/server'
import { apiSuccess } from '@/lib/utils'

export async function POST(_req: NextRequest): Promise<NextResponse> {
  const response = NextResponse.json(
    apiSuccess(null, 'Logged out successfully'),
    { status: 200 }
  )

  response.cookies.set('access_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })

  response.cookies.set('refresh_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })

  return response
}
