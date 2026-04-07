import mongoose, { Document, Model, Schema } from 'mongoose'

export type TransactionType = 'Debit' | 'Credit'
export type MatchStatus = 'Matched' | 'Unmatched' | 'Partial'
export type MatchedEntityType = 'Invoice' | 'Salary' | 'Expense' | null

export interface IBankTransaction extends Document {
  _id: mongoose.Types.ObjectId
  date: Date
  description: string
  debit: number
  credit: number
  balance: number
  reference: string
  transactionType: TransactionType
  matchStatus: MatchStatus
  matchedEntityType: MatchedEntityType
  matchedEntityId: mongoose.Types.ObjectId | null
  matchConfidence: number
  uploadBatchId: mongoose.Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
}

const BankTransactionSchema = new Schema<IBankTransaction>(
  {
    date: {
      type: Date,
      required: [true, 'Transaction date is required'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    debit: {
      type: Number,
      min: [0, 'Debit cannot be negative'],
      default: 0,
    },
    credit: {
      type: Number,
      min: [0, 'Credit cannot be negative'],
      default: 0,
    },
    balance: {
      type: Number,
      required: [true, 'Balance is required'],
    },
    reference: {
      type: String,
      trim: true,
      default: '',
      maxlength: [200, 'Reference cannot exceed 200 characters'],
    },
    transactionType: {
      type: String,
      enum: {
        values: ['Debit', 'Credit'],
        message: '{VALUE} is not a valid transaction type',
      },
      required: [true, 'Transaction type is required'],
    },
    matchStatus: {
      type: String,
      enum: {
        values: ['Matched', 'Unmatched', 'Partial'],
        message: '{VALUE} is not a valid match status',
      },
      default: 'Unmatched',
    },
    matchedEntityType: {
      type: String,
      enum: {
        values: ['Invoice', 'Salary', 'Expense', null],
        message: '{VALUE} is not a valid entity type',
      },
      default: null,
    },
    matchedEntityId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    matchConfidence: {
      type: Number,
      min: [0, 'Confidence cannot be negative'],
      max: [100, 'Confidence cannot exceed 100'],
      default: 0,
    },
    uploadBatchId: {
      type: Schema.Types.ObjectId,
      ref: 'UploadBatch',
      default: null,
    },
  },
  { timestamps: true }
)

// Indexes
BankTransactionSchema.index({ date: -1 })
BankTransactionSchema.index({ matchStatus: 1 })
BankTransactionSchema.index({ reference: 1 })
BankTransactionSchema.index({ uploadBatchId: 1 })
BankTransactionSchema.index({ transactionType: 1 })

const BankTransaction: Model<IBankTransaction> =
  mongoose.models.BankTransaction ??
  mongoose.model<IBankTransaction>('BankTransaction', BankTransactionSchema)

export default BankTransaction
