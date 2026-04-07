import { z } from 'zod'

const BankDetailsSchema = z.object({
  bankName: z.string().max(100, 'Bank name cannot exceed 100 characters').trim().default(''),
  accountNumber: z
    .string()
    .max(50, 'Account number cannot exceed 50 characters')
    .trim()
    .default(''),
  iban: z
    .string()
    .max(34, 'IBAN cannot exceed 34 characters')
    .trim()
    .toUpperCase()
    .refine(
      (val) => val === '' || /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/.test(val),
      'Please enter a valid IBAN'
    )
    .default(''),
})

export const EmployeeCreateSchema = z.object({
  name: z
    .string({ required_error: 'Employee name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(150, 'Name cannot exceed 150 characters')
    .trim(),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  position: z
    .string({ required_error: 'Position is required' })
    .min(2, 'Position must be at least 2 characters')
    .max(150, 'Position cannot exceed 150 characters')
    .trim(),
  baseSalary: z
    .number({ required_error: 'Base salary is required', invalid_type_error: 'Salary must be a number' })
    .min(0, 'Salary cannot be negative'),
  joiningDate: z
    .string({ required_error: 'Joining date is required' })
    .or(z.date())
    .transform((val) => new Date(val)),
  status: z
    .enum(['Active', 'Inactive', 'On-Leave'], {
      invalid_type_error: 'Invalid employee status',
    })
    .default('Active'),
  assignedClientId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid client ID')
    .nullable()
    .optional()
    .default(null),
  assignedProjectId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid project ID')
    .nullable()
    .optional()
    .default(null),
  employeeCode: z
    .string({ required_error: 'Employee code is required' })
    .min(3, 'Employee code must be at least 3 characters')
    .max(20, 'Employee code cannot exceed 20 characters')
    .trim()
    .toUpperCase(),
  nationality: z
    .string()
    .max(100, 'Nationality cannot exceed 100 characters')
    .trim()
    .default(''),
  phone: z
    .string()
    .max(50, 'Phone cannot exceed 50 characters')
    .trim()
    .regex(/^$|^[\+\d\s\-\(\)]+$/, 'Please enter a valid phone number')
    .default(''),
  bankDetails: BankDetailsSchema.optional().default({
    bankName: '',
    accountNumber: '',
    iban: '',
  }),
})

export const EmployeeUpdateSchema = EmployeeCreateSchema.omit({
  employeeCode: true,
}).partial()

export type EmployeeCreateInput = z.infer<typeof EmployeeCreateSchema>
export type EmployeeUpdateInput = z.infer<typeof EmployeeUpdateSchema>
