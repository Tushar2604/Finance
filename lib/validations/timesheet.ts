import { z } from 'zod'

export const TimesheetCreateSchema = z.object({
  employeeId: z
    .string({ required_error: 'Employee is required' })
    .regex(/^[a-f\d]{24}$/i, 'Invalid employee ID'),
  clientId: z
    .string({ required_error: 'Client is required' })
    .regex(/^[a-f\d]{24}$/i, 'Invalid client ID'),
  projectId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid project ID')
    .nullable()
    .optional()
    .default(null),
  month: z
    .string({ required_error: 'Month is required' })
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format'),
  workingDays: z
    .number({ required_error: 'Working days is required', invalid_type_error: 'Must be a number' })
    .int('Working days must be a whole number')
    .min(0, 'Working days cannot be negative')
    .max(31, 'Working days cannot exceed 31'),
  hours: z
    .number({ required_error: 'Hours is required', invalid_type_error: 'Must be a number' })
    .min(0, 'Hours cannot be negative')
    .max(744, 'Hours cannot exceed 744 per month'),
  overtimeHours: z
    .number({ invalid_type_error: 'Must be a number' })
    .min(0, 'Overtime cannot be negative')
    .default(0),
  status: z
    .enum(['Draft', 'Submitted', 'Approved', 'Rejected'], {
      invalid_type_error: 'Invalid status',
    })
    .default('Draft'),
  notes: z
    .string()
    .max(1000, 'Notes cannot exceed 1000 characters')
    .trim()
    .default(''),
})

export const TimesheetUpdateSchema = TimesheetCreateSchema.omit({
  employeeId: true,
  clientId: true,
  month: true,
}).partial()

export const TimesheetApproveSchema = z.object({
  status: z.enum(['Approved', 'Rejected']),
  notes: z.string().max(1000).trim().optional(),
})

export type TimesheetCreateInput = z.infer<typeof TimesheetCreateSchema>
export type TimesheetUpdateInput = z.infer<typeof TimesheetUpdateSchema>
export type TimesheetApproveInput = z.infer<typeof TimesheetApproveSchema>
