import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import { getProjects, createProject } from '@/lib/services/project.service'
import type { JWTPayload } from '@/lib/auth/jwt'
import { z } from 'zod'

const ProjectCreateSchema = z.object({
  name: z.string().min(2).max(200).trim(),
  clientId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid client ID'),
  startDate: z.string().or(z.date()).transform((val) => new Date(val)),
  endDate: z.string().or(z.date()).transform((val) => new Date(val)).nullable().optional().default(null),
  status: z.enum(['Active', 'Completed', 'On-Hold', 'Cancelled']).default('Active'),
  description: z.string().max(2000).trim().default(''),
  budget: z.number().min(0).default(0),
})

export const GET = withAuth(
  async (req: NextRequest, _context: { params: Record<string, string> }, _user: JWTPayload): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(req.url)
      const result = await getProjects({
        clientId: searchParams.get('clientId') ?? undefined,
        status: searchParams.get('status') ?? undefined,
        search: searchParams.get('search') ?? undefined,
        page: parseInt(searchParams.get('page') ?? '1', 10),
        limit: parseInt(searchParams.get('limit') ?? '20', 10),
      })
      return NextResponse.json(apiSuccess(result))
    } catch (err) {
      console.error('[GET /api/projects]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  }
)

export const POST = withAuth(
  async (req: NextRequest, _context: { params: Record<string, string> }, _user: JWTPayload): Promise<NextResponse> => {
    try {
      const body = await req.json()
      const parsed = ProjectCreateSchema.safeParse(body)
      if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {}
        for (const issue of parsed.error.issues) {
          const field = issue.path[0] as string
          if (!fieldErrors[field]) fieldErrors[field] = []
          fieldErrors[field].push(issue.message)
        }
        return NextResponse.json(apiError('Validation failed', fieldErrors), { status: 422 })
      }
      const project = await createProject(parsed.data)
      return NextResponse.json(apiSuccess(project, 'Project created successfully'), { status: 201 })
    } catch (err) {
      console.error('[POST /api/projects]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  },
  ['Admin', 'Finance', 'Manager']
)
