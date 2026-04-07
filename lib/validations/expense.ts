import { z } from 'zod'

export const ExpenseCreateSchema = z.object({
  category: z.enum(
    ['Travel', 'Office', 'Software', 'Equipment', 'Marketing', 'Utilities', 'Other'],
    {
      required_error: 'Category is required',
      invalid_type_error: 'Invalid category',
    }
  ),
  description: z
    .string({ required_error: 'Description is required' })
    .min(3, 'Description must be at least 3 characters')
    .max(500, 'Description cannot exceed 500 characters')
    .trim(),
  amount: z
    .number({
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a number',
    })
    .min(0.01, 'Amount must be greater than 0'),
  date: z
    .string({ required_error: 'Date is required' })
    .or(z.date())
    .transform((val) => new Date(val)),
  paidTo: z
    .string()
    .max(200, 'Paid-to cannot exceed 200 characters')
    .trim()
    .default(''),
  paymentMode: z
    .enum(['Bank', 'Cash', 'Card', 'Cheque'], {
      invalid_type_error: 'Invalid payment mode',
    })
    .default('Bank'),
  status: z
    .enum(['Pending', 'Approved', 'Rejected'], {
      invalid_type_error: 'Invalid status',
    })
    .default('Pending'),
  bankReference: z
    .string()
    .max(100, 'Bank reference cannot exceed 100 characters')
    .trim()
    .default(''),
  projectId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid project ID')
    .nullable()
    .optional()
    .default(null),
})

export const ExpenseUpdateSchema = ExpenseCreateSchema.partial()

export const ExpenseApproveSchema = z.object({
  status: z.enum(['Approved', 'Rejected']),
  notes: z.string().max(500).trim().optional(),
})

export type ExpenseCreateInput = z.infer<typeof ExpenseCreateSchema>
export type ExpenseUpdateInput = z.infer<typeof ExpenseUpdateSchema>
export type ExpenseApproveInput = z.infer<typeof ExpenseApproveSchema>
