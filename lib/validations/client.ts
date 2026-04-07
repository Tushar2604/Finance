import { z } from 'zod'

const CompanyDetailsSchema = z.object({
  address: z.string().max(500, 'Address cannot exceed 500 characters').trim().default(''),
  phone: z
    .string()
    .max(50, 'Phone cannot exceed 50 characters')
    .trim()
    .regex(/^$|^[\+\d\s\-\(\)]+$/, 'Please enter a valid phone number')
    .default(''),
  email: z
    .string()
    .trim()
    .max(254, 'Email cannot exceed 254 characters')
    .refine(
      (val) => val === '' || /^\S+@\S+\.\S+$/.test(val),
      'Please enter a valid email address'
    )
    .default(''),
  taxNumber: z.string().max(50, 'Tax number cannot exceed 50 characters').trim().default(''),
})

export const ClientCreateSchema = z.object({
  name: z
    .string({ required_error: 'Client name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(200, 'Name cannot exceed 200 characters')
    .trim(),
  companyDetails: CompanyDetailsSchema.optional().default({
    address: '',
    phone: '',
    email: '',
    taxNumber: '',
  }),
  contractType: z
    .enum(['LPO', 'Agreement', 'None'], {
      invalid_type_error: 'Invalid contract type',
    })
    .default('None'),
  rateCard: z
    .number({ invalid_type_error: 'Rate card must be a number' })
    .min(0, 'Rate card cannot be negative')
    .default(0),
  billingType: z
    .enum(['Monthly', 'Milestone', 'Hourly'], {
      invalid_type_error: 'Invalid billing type',
    })
    .default('Monthly'),
  creditTerms: z
    .number({ invalid_type_error: 'Credit terms must be a number' })
    .int('Credit terms must be a whole number')
    .min(0, 'Credit terms cannot be negative')
    .max(365, 'Credit terms cannot exceed 365 days')
    .default(30),
  isActive: z.boolean().default(true),
})

export const ClientUpdateSchema = ClientCreateSchema.partial()

export type ClientCreateInput = z.infer<typeof ClientCreateSchema>
export type ClientUpdateInput = z.infer<typeof ClientUpdateSchema>
