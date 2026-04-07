import { z } from 'zod'

export const ReportQuerySchema = z.object({
  startDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  endDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  clientId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid client ID')
    .optional(),
  projectId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid project ID')
    .optional(),
  employeeId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid employee ID')
    .optional(),
})

export type ReportQueryInput = z.infer<typeof ReportQuerySchema>
