import mongoose, { Document, Model, Schema } from 'mongoose'

export type PaymentMode = 'Bank' | 'Cash' | 'WPS' | 'Cheque'
export type PaymentStatus = 'Pending' | 'Paid' | 'Failed'

export interface ISalary extends Document {
  _id: mongoose.Types.ObjectId
  employeeId: mongoose.Types.ObjectId
  month: string // YYYY-MM
  baseSalary: number
  overtime: number
  deductions: number
  netSalary: number
  paymentDate: Date | null
  paymentMode: PaymentMode
  paymentStatus: PaymentStatus
  wpsReference: string
  bankReference: string
  createdAt: Date
  updatedAt: Date
}

const SalarySchema = new Schema<ISalary>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee is required'],
    },
    month: {
      type: String,
      required: [true, 'Month is required'],
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format'],
    },
    baseSalary: {
      type: Number,
      required: [true, 'Base salary is required'],
      min: [0, 'Base salary cannot be negative'],
    },
    overtime: {
      type: Number,
      min: [0, 'Overtime cannot be negative'],
      default: 0,
    },
    deductions: {
      type: Number,
      min: [0, 'Deductions cannot be negative'],
      default: 0,
    },
    netSalary: {
      type: Number,
      min: [0, 'Net salary cannot be negative'],
    },
    paymentDate: {
      type: Date,
      default: null,
    },
    paymentMode: {
      type: String,
      enum: {
        values: ['Bank', 'Cash', 'WPS', 'Cheque'],
        message: '{VALUE} is not a valid payment mode',
      },
      default: 'WPS',
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ['Pending', 'Paid', 'Failed'],
        message: '{VALUE} is not a valid payment status',
      },
      default: 'Pending',
    },
    wpsReference: {
      type: String,
      trim: true,
      default: '',
    },
    bankReference: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
)

// Unique index — one salary record per employee per month
SalarySchema.index({ employeeId: 1, month: 1 }, { unique: true })
SalarySchema.index({ month: 1 })
SalarySchema.index({ paymentStatus: 1 })

// Pre-save hook to compute netSalary
SalarySchema.pre<ISalary>('save', function (next) {
  this.netSalary = this.baseSalary + this.overtime - this.deductions
  if (this.netSalary < 0) this.netSalary = 0
  next()
})

// Also handle findOneAndUpdate
SalarySchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() as Partial<ISalary> | null
  if (update) {
    const base = (update.baseSalary as number) ?? 0
    const overtime = (update.overtime as number) ?? 0
    const deductions = (update.deductions as number) ?? 0
    if (base > 0) {
      update.netSalary = Math.max(0, base + overtime - deductions)
    }
  }
  next()
})

const Salary: Model<ISalary> =
  mongoose.models.Salary ?? mongoose.model<ISalary>('Salary', SalarySchema)

export default Salary
