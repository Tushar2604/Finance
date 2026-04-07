import { z } from 'zod'

export const BankTransactionSchema = z.object({
  date: z
    .string({ required_error: 'Date is required' })
    .or(z.date())
    .transform((val) => new Date(val)),
  description: z
    .string({ required_error: 'Description is required' })
    .min(2, 'Description must be at least 2 characters')
    .max(500, 'Description cannot exceed 500 characters')
    .trim(),
  debit: z
    .number()
    .min(0, 'Debit cannot be negative')
    .default(0),
  credit: z
    .number()
    .min(0, 'Credit cannot be negative')
    .default(0),
  balance: z
    .number({ required_error: 'Balance is required' }),
  reference: z
    .string()
    .max(200, 'Reference cannot exceed 200 characters')
    .trim()
    .default(''),
  transactionType: z
    .enum(['Debit', 'Credit'], {
      required_error: 'Transaction type is required',
    }),
  matchStatus: z
    .enum(['Matched', 'Unmatched', 'Partial'])
    .default('Unmatched'),
  matchedEntityType: z
    .enum(['Invoice', 'Salary', 'Expense', ''])
    .nullable()
    .transform((v) => (v === '' ? null : v))
    .default(null),
  matchedEntityId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId')
    .nullable()
    .optional()
    .default(null),
  matchConfidence: z
    .number()
    .min(0)
    .max(100)
    .default(0),
  uploadBatchId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId')
    .nullable()
    .optional()
    .default(null),
})

export const BankTransactionUpdateSchema = BankTransactionSchema.partial()

export const FileUploadSchema = z.object({
  batchName: z.string().optional(),
})

export type BankTransactionInput = z.infer<typeof BankTransactionSchema>
export type BankTransactionUpdateInput = z.infer<typeof BankTransactionUpdateSchema>
