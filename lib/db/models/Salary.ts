import mongoose, { Document, Model, Schema } from 'mongoose'

export type PaymentMode = 'Bank' | 'Cash' | 'WPS' | 'Cheque'
export type PaymentStatus = 'Pending' | 'Paid' | 'Failed'
export type SalaryStatus = 'Draft' | 'Calculated' | 'Approved' | 'Paid'
export type WPSStatus = 'NotApplicable' | 'Submitted' | 'Approved' | 'Failed'

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
  salaryStatus: SalaryStatus
  housingAllowance: number
  transportAllowance: number
  otherAllowances: number
  overtimeHours: number
  overtimeRate: number
  overtimeAmount: number
  leaveDeduction: number
  absentDeduction: number
  penalty: number
  loanDeduction: number
  bankName: string
  wpsFileId: string
  bankRefNumber: string
  wpsStatus: WPSStatus
  gratuityAmount: number
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
    salaryStatus: {
      type: String,
      enum: { values: ['Draft', 'Calculated', 'Approved', 'Paid'], message: '{VALUE} is not valid' },
      default: 'Draft',
    },
    housingAllowance: { type: Number, min: 0, default: 0 },
    transportAllowance: { type: Number, min: 0, default: 0 },
    otherAllowances: { type: Number, min: 0, default: 0 },
    overtimeHours: { type: Number, min: 0, default: 0 },
    overtimeRate: { type: Number, min: 0, default: 0 },
    overtimeAmount: { type: Number, min: 0, default: 0 },
    leaveDeduction: { type: Number, min: 0, default: 0 },
    absentDeduction: { type: Number, min: 0, default: 0 },
    penalty: { type: Number, min: 0, default: 0 },
    loanDeduction: { type: Number, min: 0, default: 0 },
    bankName: { type: String, trim: true, default: '' },
    wpsFileId: { type: String, trim: true, default: '' },
    bankRefNumber: { type: String, trim: true, default: '' },
    wpsStatus: {
      type: String,
      enum: { values: ['NotApplicable', 'Submitted', 'Approved', 'Failed'], message: '{VALUE} is not valid' },
      default: 'NotApplicable',
    },
    gratuityAmount: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true }
)

// Unique index — one salary record per employee per month
SalarySchema.index({ employeeId: 1, month: 1 }, { unique: true })
SalarySchema.index({ month: 1 })
SalarySchema.index({ paymentStatus: 1 })

// Pre-save hook to compute netSalary from all components
SalarySchema.pre<ISalary>('save', function (next) {
  const fixedTotal = this.baseSalary + (this.housingAllowance ?? 0) + (this.transportAllowance ?? 0) + (this.otherAllowances ?? 0)
  const otAmt = this.overtimeAmount ?? this.overtime ?? 0
  const totalDeductions = (this.deductions ?? 0) + (this.leaveDeduction ?? 0) + (this.absentDeduction ?? 0) + (this.penalty ?? 0) + (this.loanDeduction ?? 0)
  this.netSalary = Math.max(0, fixedTotal + otAmt - totalDeductions)
  next()
})

// Also handle findOneAndUpdate
SalarySchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() as Partial<ISalary> | null
  if (update) {
    const base = (update.baseSalary as number) ?? 0
    const housing = (update.housingAllowance as number) ?? 0
    const transport = (update.transportAllowance as number) ?? 0
    const others = (update.otherAllowances as number) ?? 0
    const otAmt = (update.overtimeAmount as number) ?? (update.overtime as number) ?? 0
    const deductions = (update.deductions as number) ?? 0
    const leaveD = (update.leaveDeduction as number) ?? 0
    const absentD = (update.absentDeduction as number) ?? 0
    const penalty = (update.penalty as number) ?? 0
    const loanD = (update.loanDeduction as number) ?? 0
    if (base > 0) {
      update.netSalary = Math.max(0, base + housing + transport + others + otAmt - deductions - leaveD - absentD - penalty - loanD)
    }
  }
  next()
})

const Salary: Model<ISalary> =
  mongoose.models.Salary ?? mongoose.model<ISalary>('Salary', SalarySchema)

export default Salary
