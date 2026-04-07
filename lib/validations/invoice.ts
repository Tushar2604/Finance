import { z } from 'zod'

export const InvoiceCreateSchema = z
  .object({
    clientId: z
      .string({ required_error: 'Client is required' })
      .regex(/^[a-f\d]{24}$/i, 'Invalid client ID'),
    employeeId: z
      .string()
      .regex(/^[a-f\d]{24}$/i, 'Invalid employee ID')
      .nullable()
      .optional()
      .default(null),
    projectId: z
      .string()
      .regex(/^[a-f\d]{24}$/i, 'Invalid project ID')
      .nullable()
      .optional()
      .default(null),
    timesheetId: z
      .string()
      .regex(/^[a-f\d]{24}$/i, 'Invalid timesheet ID')
      .nullable()
      .optional()
      .default(null),
    month: z
      .string({ required_error: 'Month is required' })
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format'),
    rate: z
      .number({ required_error: 'Rate is required', invalid_type_error: 'Rate must be a number' })
      .min(0, 'Rate cannot be negative'),
    hours: z
      .number({ required_error: 'Hours is required', invalid_type_error: 'Hours must be a number' })
      .min(0, 'Hours cannot be negative'),
    subtotal: z
      .number({ invalid_type_error: 'Subtotal must be a number' })
      .min(0, 'Subtotal cannot be negative')
      .optional(),
    vatAmount: z
      .number({ invalid_type_error: 'VAT amount must be a number' })
      .min(0, 'VAT amount cannot be negative')
      .optional(),
    totalAmount: z
      .number({ invalid_type_error: 'Total amount must be a number' })
      .min(0, 'Total amount cannot be negative')
      .optional(),
    status: z
      .enum(['Draft', 'Sent', 'PartiallyPaid', 'Paid', 'Overdue', 'Cancelled'], {
        invalid_type_error: 'Invalid invoice status',
      })
      .default('Draft'),
    invoiceDate: z
      .string()
      .or(z.date())
      .transform((val) => new Date(val))
      .optional(),
    dueDate: z
      .string({ required_error: 'Due date is required' })
      .or(z.date())
      .transform((val) => new Date(val)),
    notes: z
      .string()
      .max(2000, 'Notes cannot exceed 2000 characters')
      .trim()
      .default(''),
  })
  .transform((data) => {
    // Auto-compute subtotal, VAT, and total if not provided
    const subtotal = data.subtotal ?? parseFloat((data.rate * data.hours).toFixed(2))
    const vatAmount = data.vatAmount ?? parseFloat((subtotal * 0.05).toFixed(2))
    const totalAmount = data.totalAmount ?? parseFloat((subtotal + vatAmount).toFixed(2))
    return { ...data, subtotal, vatAmount, totalAmount }
  })

export const InvoiceUpdateSchema = z.object({
  status: z
    .enum(['Draft', 'Sent', 'PartiallyPaid', 'Paid', 'Overdue', 'Cancelled'])
    .optional(),
  paidAmount: z.number().min(0).optional(),
  paidDate: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .optional(),
  notes: z.string().max(2000).trim().optional(),
  dueDate: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .optional(),
})

export type InvoiceCreateInput = z.infer<typeof InvoiceCreateSchema>
export type InvoiceUpdateInput = z.infer<typeof InvoiceUpdateSchema>
