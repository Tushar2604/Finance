import mongoose, { Document, Model, Schema } from 'mongoose'

export type ExpenseCategory =
  | 'Salary'
  | 'Travel'
  | 'Office'
  | 'Software'
  | 'Equipment'
  | 'Marketing'
  | 'Utilities'
  | 'Visa'
  | 'Admin'
  | 'IT'
  | 'Other'

export type ExpensePaymentMode = 'Bank' | 'Cash' | 'Card' | 'Cheque'
export type ExpenseStatus = 'Pending' | 'Approved' | 'Rejected'
export type ExpenseCurrency = 'AED' | 'USD' | 'INR' | 'GBP' | 'EUR'

export interface IExpense extends Document {
  _id: mongoose.Types.ObjectId
  category: ExpenseCategory
  subCategory: string
  description: string
  amount: number
  currency: ExpenseCurrency
  date: Date
  paidTo: string
  paymentMode: ExpensePaymentMode
  status: ExpenseStatus
  approvedBy: mongoose.Types.ObjectId | null
  bankReference: string
  projectId: mongoose.Types.ObjectId | null
  employeeId: mongoose.Types.ObjectId | null
  clientId: mongoose.Types.ObjectId | null
  isBillable: boolean
  notes: string
  createdAt: Date
  updatedAt: Date
}

const ExpenseSchema = new Schema<IExpense>(
  {
    category: {
      type: String,
      enum: {
        values: ['Salary', 'Travel', 'Office', 'Software', 'Equipment', 'Marketing', 'Utilities', 'Visa', 'Admin', 'IT', 'Other'],
        message: '{VALUE} is not a valid expense category',
      },
      required: [true, 'Category is required'],
    },
    subCategory: { type: String, trim: true, default: '' },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    currency: {
      type: String,
      enum: { values: ['AED', 'USD', 'INR', 'GBP', 'EUR'], message: '{VALUE} is not a valid currency' },
      default: 'AED',
    },
    paidTo: {
      type: String,
      trim: true,
      default: '',
      maxlength: [200, 'Paid-to cannot exceed 200 characters'],
    },
    paymentMode: {
      type: String,
      enum: {
        values: ['Bank', 'Cash', 'Card', 'Cheque'],
        message: '{VALUE} is not a valid payment mode',
      },
      default: 'Bank',
    },
    status: {
      type: String,
      enum: {
        values: ['Pending', 'Approved', 'Rejected'],
        message: '{VALUE} is not a valid expense status',
      },
      default: 'Pending',
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    bankReference: {
      type: String,
      trim: true,
      default: '',
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
    },
    isBillable: { type: Boolean, default: false },
    notes: { type: String, trim: true, maxlength: [2000, 'Notes cannot exceed 2000 characters'], default: '' },
  },
  { timestamps: true }
)

// Indexes
ExpenseSchema.index({ category: 1 })
ExpenseSchema.index({ date: -1 })
ExpenseSchema.index({ status: 1 })
ExpenseSchema.index({ projectId: 1 })

const Expense: Model<IExpense> =
  mongoose.models.Expense ?? mongoose.model<IExpense>('Expense', ExpenseSchema)

export default Expense
