import mongoose, { Document, Model, Schema } from 'mongoose'

export type InvoiceStatus =
  | 'Draft'
  | 'Generated'
  | 'Sent'
  | 'Acknowledged'
  | 'PartiallyPaid'
  | 'Paid'
  | 'Overdue'
  | 'Cancelled'

export interface IInvoiceLineItem {
  employeeId: mongoose.Types.ObjectId | null
  deploymentId: mongoose.Types.ObjectId | null
  timesheetId: mongoose.Types.ObjectId | null
  position: string
  billingType: 'Monthly' | 'Daily' | 'Hourly'
  billingRate: number
  daysWorked: number
  hoursWorked: number
  overtimeHours: number
  regularAmount: number
  overtimeAmount: number
  totalLineAmount: number
}

export interface IInvoice extends Document {
  _id: mongoose.Types.ObjectId
  invoiceNumber: string
  clientId: mongoose.Types.ObjectId
  employeeId: mongoose.Types.ObjectId | null
  projectId: mongoose.Types.ObjectId | null
  timesheetId: mongoose.Types.ObjectId | null
  month: string // YYYY-MM
  rate: number
  hours: number
  subtotal: number
  vatAmount: number
  totalAmount: number
  status: InvoiceStatus
  invoiceDate: Date
  dueDate: Date
  paidAmount: number
  paidDate: Date | null
  notes: string
  servicePeriodFrom: Date | null
  servicePeriodTo: Date | null
  sentDate: Date | null
  sentVia: 'Email' | 'WhatsApp' | 'Portal' | null
  recipientEmail: string
  acknowledgementStatus: 'Pending' | 'Acknowledged' | 'Disputed'
  discountAmount: number
  exchangeRate: number
  lineItems: IInvoiceLineItem[]
  bankTransactionId: mongoose.Types.ObjectId | null
  matchType: 'Auto' | 'Manual' | null
  createdAt: Date
  updatedAt: Date
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client is required'],
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    timesheetId: {
      type: Schema.Types.ObjectId,
      ref: 'Timesheet',
      default: null,
    },
    month: {
      type: String,
      required: [true, 'Month is required'],
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format'],
    },
    rate: {
      type: Number,
      required: [true, 'Rate is required'],
      min: [0, 'Rate cannot be negative'],
    },
    hours: {
      type: Number,
      required: [true, 'Hours is required'],
      min: [0, 'Hours cannot be negative'],
    },
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal cannot be negative'],
    },
    vatAmount: {
      type: Number,
      required: [true, 'VAT amount is required'],
      min: [0, 'VAT amount cannot be negative'],
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: ['Draft', 'Generated', 'Sent', 'Acknowledged', 'PartiallyPaid', 'Paid', 'Overdue', 'Cancelled'],
        message: '{VALUE} is not a valid invoice status',
      },
      default: 'Draft',
    },
    invoiceDate: {
      type: Date,
      required: [true, 'Invoice date is required'],
      default: () => new Date(),
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    paidAmount: {
      type: Number,
      min: [0, 'Paid amount cannot be negative'],
      default: 0,
    },
    paidDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
      default: '',
    },
    servicePeriodFrom: { type: Date, default: null },
    servicePeriodTo: { type: Date, default: null },
    sentDate: { type: Date, default: null },
    sentVia: { type: String, enum: ['Email', 'WhatsApp', 'Portal'], default: null },
    recipientEmail: { type: String, trim: true, lowercase: true, default: '' },
    acknowledgementStatus: {
      type: String,
      enum: ['Pending', 'Acknowledged', 'Disputed'],
      default: 'Pending',
    },
    discountAmount: { type: Number, min: 0, default: 0 },
    exchangeRate: { type: Number, min: 0, default: 1 },
    lineItems: [
      {
        employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
        deploymentId: { type: Schema.Types.ObjectId, ref: 'Deployment', default: null },
        timesheetId: { type: Schema.Types.ObjectId, ref: 'Timesheet', default: null },
        position: { type: String, default: '' },
        billingType: { type: String, enum: ['Monthly', 'Daily', 'Hourly'], default: 'Monthly' },
        billingRate: { type: Number, min: 0, default: 0 },
        daysWorked: { type: Number, min: 0, default: 0 },
        hoursWorked: { type: Number, min: 0, default: 0 },
        overtimeHours: { type: Number, min: 0, default: 0 },
        regularAmount: { type: Number, min: 0, default: 0 },
        overtimeAmount: { type: Number, min: 0, default: 0 },
        totalLineAmount: { type: Number, min: 0, default: 0 },
      },
    ],
    bankTransactionId: { type: Schema.Types.ObjectId, ref: 'BankTransaction', default: null },
    matchType: { type: String, enum: ['Auto', 'Manual'], default: null },
  },
  { timestamps: true }
)

// Indexes
InvoiceSchema.index({ clientId: 1 })
InvoiceSchema.index({ status: 1 })
InvoiceSchema.index({ month: 1 })
InvoiceSchema.index({ clientId: 1, month: 1 })
InvoiceSchema.index({ dueDate: 1, status: 1 })

const Invoice: Model<IInvoice> =
  mongoose.models.Invoice ?? mongoose.model<IInvoice>('Invoice', InvoiceSchema)

export default Invoice
