import { NextRequest, NextResponse } from 'next/server'
import { LoginSchema } from '@/lib/validations/auth'
import { generateTokenPair } from '@/lib/auth/jwt'
import { apiSuccess, apiError } from '@/lib/utils'
import dbConnect from '@/lib/db/connection'
import User from '@/lib/db/models/User'

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await dbConnect()

    const body = await req.json()
    const parsed = LoginSchema.safeParse(body)

    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as string
        if (!fieldErrors[field]) fieldErrors[field] = []
        fieldErrors[field].push(issue.message)
      }
      return NextResponse.json(apiError('Validation failed', fieldErrors), { status: 422 })
    }

    const { email, password } = parsed.data

    const user = await User.findOne({ email, isActive: true }).select('+password')
    if (!user) {
      return NextResponse.json(apiError('Invalid email or password'), { status: 401 })
    }

    const passwordMatch = await user.comparePassword(password)
    if (!passwordMatch) {
      return NextResponse.json(apiError('Invalid email or password'), { status: 401 })
    }

    user.lastLogin = new Date()
    await user.save()

    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    }

    const { accessToken, refreshToken } = generateTokenPair(payload)

    const response = NextResponse.json(
      apiSuccess(
        {
          accessToken,
          user: {
            _id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
          },
        },
        'Login successful'
      ),
      { status: 200 }
    )

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15, // 15 minutes
      path: '/',
    })

    return response
  } catch (err) {
    console.error('[POST /api/auth/login]', err)
    return NextResponse.json(apiError('Internal server error'), { status: 500 })
  }
}
