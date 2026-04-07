import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { RegisterSchema } from '@/lib/validations/auth'
import { apiSuccess, apiError } from '@/lib/utils'
import dbConnect from '@/lib/db/connection'
import User from '@/lib/db/models/User'
import type { JWTPayload } from '@/lib/auth/jwt'

export const POST = withAuth(
  async (req: NextRequest, _context: { params: Record<string, string> }, _user: JWTPayload): Promise<NextResponse> => {
    try {
      await dbConnect()

      const body = await req.json()
      const parsed = RegisterSchema.safeParse(body)

      if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {}
        for (const issue of parsed.error.issues) {
          const field = issue.path[0] as string
          if (!fieldErrors[field]) fieldErrors[field] = []
          fieldErrors[field].push(issue.message)
        }
        return NextResponse.json(apiError('Validation failed', fieldErrors), { status: 422 })
      }

      const { name, email, password, role } = parsed.data

      const existing = await User.findOne({ email })
      if (existing) {
        return NextResponse.json(apiError('Email is already registered'), { status: 409 })
      }

      const user = await User.create({ name, email, password, role })

      return NextResponse.json(
        apiSuccess(
          {
            _id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt,
          },
          'User registered successfully'
        ),
        { status: 201 }
      )
    } catch (err) {
      console.error('[POST /api/auth/register]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  },
  ['Admin']
)
