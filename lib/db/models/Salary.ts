import mongoose, { Document, Model, Schema } from 'mongoose'

export type PaymentMode = 'Bank' | 'Cash' | 'WPS' | 'Cheque'
export type PaymentStatus = 'Pending' | 'Paid' | 'Failed'

export interface ISalary extends Document {
  _id: mongoose.Types.ObjectId
  // ── Spec fields (exact order) ──
  employeeId: mongoose.Types.ObjectId   // resolves → employeeCode + employeeName
  siteName: string                      // 3
  labourCardNo: string                  // 4
  wpsRoutingCode: string                // 5
  iban: string                          // 6
  visaUnderCompany: string              // 7
  monthlySalary: number                 // 8
  month: string                         // 9  YYYY-MM
  totalServedDays: number               // 10
  normalServedHours: number             // 11
  otHours: number                       // 12
  totalRequiredHours: number            // 13
  totalServedHrs: number                // 14
  totalSiteServedHours: number          // 15
  salaryAmount: number                  // 16
  previousMonthOvertimeAmt: number      // 17
  otAmount: number                      // 18
  grossAmount: number                   // 19
  otherPayable: number                  // 20
  compensationAmount: number            // 21
  advanceDeduction: number              // 22
  pettyCashAmount: number               // 23
  otherDeduction: number                // 24
  wpsViolation: number                  // 25
  differenceFromCurrentSalary: number   // 26
  netPayable: number                    // 27
  totalSiteNetPayable: number           // 28
  signedTimesheetUploadStatus: string   // 29
  paymentSource: string                 // 30
  // ── Legacy / system fields (kept for backwards compat) ──
  baseSalary: number
  overtime: number
  deductions: number
  netSalary: number
  paymentDate: Date | null
  paymentMode: PaymentMode
  paymentStatus: PaymentStatus
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
    // ── Spec fields ──
    siteName:                    { type: String, trim: true, default: '' },
    labourCardNo:                { type: String, trim: true, default: '' },
    wpsRoutingCode:              { type: String, trim: true, default: '' },
    iban:                        { type: String, trim: true, uppercase: true, default: '' },
    visaUnderCompany:            { type: String, trim: true, default: '' },
    monthlySalary:               { type: Number, min: 0, default: 0 },
    totalServedDays:             { type: Number, min: 0, default: 0 },
    normalServedHours:           { type: Number, min: 0, default: 0 },
    otHours:                     { type: Number, min: 0, default: 0 },
    totalRequiredHours:          { type: Number, min: 0, default: 0 },
    totalServedHrs:              { type: Number, min: 0, default: 0 },
    totalSiteServedHours:        { type: Number, min: 0, default: 0 },
    salaryAmount:                { type: Number, min: 0, default: 0 },
    previousMonthOvertimeAmt:    { type: Number, min: 0, default: 0 },
    otAmount:                    { type: Number, min: 0, default: 0 },
    grossAmount:                 { type: Number, min: 0, default: 0 },
    otherPayable:                { type: Number, min: 0, default: 0 },
    compensationAmount:          { type: Number, min: 0, default: 0 },
    advanceDeduction:            { type: Number, min: 0, default: 0 },
    pettyCashAmount:             { type: Number, min: 0, default: 0 },
    otherDeduction:              { type: Number, min: 0, default: 0 },
    wpsViolation:                { type: Number, min: 0, default: 0 },
    differenceFromCurrentSalary: { type: Number, default: 0 },
    netPayable:                  { type: Number, min: 0, default: 0 },
    totalSiteNetPayable:         { type: Number, min: 0, default: 0 },
    signedTimesheetUploadStatus: {
      type: String,
      enum: { values: ['Uploaded', 'Not Uploaded', 'Pending', 'Rejected', ''], message: '{VALUE} is not valid' },
      default: '',
    },
    paymentSource: { type: String, trim: true, default: '' },
    // ── Legacy ──
    baseSalary:    { type: Number, min: 0, default: 0 },
    overtime:      { type: Number, min: 0, default: 0 },
    deductions:    { type: Number, min: 0, default: 0 },
    netSalary:     { type: Number, min: 0, default: 0 },
    paymentDate:   { type: Date, default: null },
    paymentMode: {
      type: String,
      enum: { values: ['Bank', 'Cash', 'WPS', 'Cheque'], message: '{VALUE} is not a valid payment mode' },
      default: 'WPS',
    },
    paymentStatus: {
      type: String,
      enum: { values: ['Pending', 'Paid', 'Failed'], message: '{VALUE} is not a valid payment status' },
      default: 'Pending',
    },
    bankReference: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
)

SalarySchema.index({ employeeId: 1, month: 1 })
SalarySchema.index({ month: 1 })
SalarySchema.index({ paymentStatus: 1 })

const Salary: Model<ISalary> =
  mongoose.models.Salary ?? mongoose.model<ISalary>('Salary', SalarySchema)

export default Salary
