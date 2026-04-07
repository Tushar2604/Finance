import { z } from 'zod'

export const SalaryCreateSchema = z.object({
  employeeId: z
    .string({ required_error: 'Employee is required' })
    .regex(/^[a-f\d]{24}$/i, 'Invalid employee ID'),
  month: z
    .string({ required_error: 'Month is required' })
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format'),
  baseSalary: z
    .number({
      required_error: 'Base salary is required',
      invalid_type_error: 'Base salary must be a number',
    })
    .min(0, 'Salary cannot be negative'),
  overtime: z
    .number({ invalid_type_error: 'Overtime must be a number' })
    .min(0, 'Overtime cannot be negative')
    .default(0),
  deductions: z
    .number({ invalid_type_error: 'Deductions must be a number' })
    .min(0, 'Deductions cannot be negative')
    .default(0),
  paymentDate: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .nullable()
    .optional()
    .default(null),
  paymentMode: z
    .enum(['Bank', 'Cash', 'WPS', 'Cheque'], {
      invalid_type_error: 'Invalid payment mode',
    })
    .default('WPS'),
  paymentStatus: z
    .enum(['Pending', 'Paid', 'Failed'], {
      invalid_type_error: 'Invalid payment status',
    })
    .default('Pending'),
  wpsReference: z
    .string()
    .max(100, 'WPS reference cannot exceed 100 characters')
    .trim()
    .default(''),
  bankReference: z
    .string()
    .max(100, 'Bank reference cannot exceed 100 characters')
    .trim()
    .default(''),
})

export const SalaryUpdateSchema = SalaryCreateSchema.omit({
  employeeId: true,
  month: true,
  baseSalary: true,
}).partial()

export const SalaryBulkCreateSchema = z.object({
  month: z
    .string({ required_error: 'Month is required' })
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format'),
  entries: z
    .array(
      z.object({
        employeeId: z
          .string({ required_error: 'Employee ID is required' })
          .regex(/^[a-f\d]{24}$/i, 'Invalid employee ID'),
        overtime: z.number().min(0).default(0),
        deductions: z.number().min(0).default(0),
      })
    )
    .min(1, 'At least one salary entry is required'),
  paymentMode: z.enum(['Bank', 'Cash', 'WPS', 'Cheque']).default('WPS'),
})

export type SalaryCreateInput = z.infer<typeof SalaryCreateSchema>
export type SalaryUpdateInput = z.infer<typeof SalaryUpdateSchema>
export type SalaryBulkCreateInput = z.infer<typeof SalaryBulkCreateSchema>
