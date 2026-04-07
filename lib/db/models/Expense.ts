import mongoose, { Document, Model, Schema } from 'mongoose'

export type ExpenseCategory =
  | 'Travel'
  | 'Office'
  | 'Software'
  | 'Equipment'
  | 'Marketing'
  | 'Utilities'
  | 'Other'

export type ExpensePaymentMode = 'Bank' | 'Cash' | 'Card' | 'Cheque'
export type ExpenseStatus = 'Pending' | 'Approved' | 'Rejected'

export interface IExpense extends Document {
  _id: mongoose.Types.ObjectId
  category: ExpenseCategory
  description: string
  amount: number
  date: Date
  paidTo: string
  paymentMode: ExpensePaymentMode
  status: ExpenseStatus
  approvedBy: mongoose.Types.ObjectId | null
  bankReference: string
  projectId: mongoose.Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
}

const ExpenseSchema = new Schema<IExpense>(
  {
    category: {
      type: String,
      enum: {
        values: ['Travel', 'Office', 'Software', 'Equipment', 'Marketing', 'Utilities', 'Other'],
        message: '{VALUE} is not a valid expense category',
      },
      required: [true, 'Category is required'],
    },
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
