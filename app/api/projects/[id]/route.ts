import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { apiSuccess, apiError } from '@/lib/utils'
import { getProjectById, updateProject, deleteProject } from '@/lib/services/project.service'
import type { JWTPayload } from '@/lib/auth/jwt'
import { z } from 'zod'

const ProjectUpdateSchema = z.object({
  name: z.string().min(2).max(200).trim().optional(),
  clientId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  startDate: z.string().or(z.date()).transform((val) => new Date(val)).optional(),
  endDate: z.string().or(z.date()).transform((val) => new Date(val)).nullable().optional(),
  status: z.enum(['Active', 'Completed', 'On-Hold', 'Cancelled']).optional(),
  description: z.string().max(2000).trim().optional(),
  budget: z.number().min(0).optional(),
})

export const GET = withAuth(
  async (_req: NextRequest, context: { params: Record<string, string> }, _user: JWTPayload): Promise<NextResponse> => {
    try {
      const project = await getProjectById(context.params.id)
      return NextResponse.json(apiSuccess(project))
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number }
      if (error.statusCode === 404) return NextResponse.json(apiError(error.message), { status: 404 })
      if (error.statusCode === 400) return NextResponse.json(apiError(error.message), { status: 400 })
      console.error('[GET /api/projects/[id]]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  }
)

export const PUT = withAuth(
  async (req: NextRequest, context: { params: Record<string, string> }, _user: JWTPayload): Promise<NextResponse> => {
    try {
      const body = await req.json()
      const parsed = ProjectUpdateSchema.safeParse(body)
      if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {}
        for (const issue of parsed.error.issues) {
          const field = issue.path[0] as string
          if (!fieldErrors[field]) fieldErrors[field] = []
          fieldErrors[field].push(issue.message)
        }
        return NextResponse.json(apiError('Validation failed', fieldErrors), { status: 422 })
      }
      const project = await updateProject(context.params.id, parsed.data)
      return NextResponse.json(apiSuccess(project, 'Project updated successfully'))
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number }
      if (error.statusCode === 404) return NextResponse.json(apiError(error.message), { status: 404 })
      if (error.statusCode === 400) return NextResponse.json(apiError(error.message), { status: 400 })
      console.error('[PUT /api/projects/[id]]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  },
  ['Admin', 'Finance', 'Manager']
)

export const DELETE = withAuth(
  async (_req: NextRequest, context: { params: Record<string, string> }, _user: JWTPayload): Promise<NextResponse> => {
    try {
      await deleteProject(context.params.id)
      return NextResponse.json(apiSuccess(null, 'Project deleted successfully'))
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number }
      if (error.statusCode === 404) return NextResponse.json(apiError(error.message), { status: 404 })
      if (error.statusCode === 400) return NextResponse.json(apiError(error.message), { status: 400 })
      console.error('[DELETE /api/projects/[id]]', err)
      return NextResponse.json(apiError('Internal server error'), { status: 500 })
    }
  },
  ['Admin']
)
