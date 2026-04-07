import mongoose, { Document, Model, Schema } from 'mongoose'

export type ReconciliationType = 'Salary' | 'Invoice' | 'Expense'
export type ReconciliationStatus =
  | 'Matched'
  | 'Mismatched'
  | 'Missing'
  | 'Extra'
  | 'Duplicate'

export interface IReconciliationRecord extends Document {
  _id: mongoose.Types.ObjectId
  type: ReconciliationType
  entityId: mongoose.Types.ObjectId
  bankTransactionId: mongoose.Types.ObjectId | null
  status: ReconciliationStatus
  discrepancyAmount: number
  notes: string
  resolvedBy: mongoose.Types.ObjectId | null
  resolvedAt: Date | null
  month: string // YYYY-MM
  createdAt: Date
  updatedAt: Date
}

const ReconciliationRecordSchema = new Schema<IReconciliationRecord>(
  {
    type: {
      type: String,
      enum: {
        values: ['Salary', 'Invoice', 'Expense'],
        message: '{VALUE} is not a valid reconciliation type',
      },
      required: [true, 'Type is required'],
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Entity ID is required'],
    },
    bankTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'BankTransaction',
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ['Matched', 'Mismatched', 'Missing', 'Extra', 'Duplicate'],
        message: '{VALUE} is not a valid reconciliation status',
      },
      required: [true, 'Status is required'],
    },
    discrepancyAmount: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
      default: '',
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    month: {
      type: String,
      required: [true, 'Month is required'],
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format'],
    },
  },
  { timestamps: true }
)

// Indexes
ReconciliationRecordSchema.index({ type: 1, month: 1 })
ReconciliationRecordSchema.index({ entityId: 1, type: 1 })
ReconciliationRecordSchema.index({ status: 1 })
ReconciliationRecordSchema.index({ month: 1 })

const ReconciliationRecord: Model<IReconciliationRecord> =
  mongoose.models.ReconciliationRecord ??
  mongoose.model<IReconciliationRecord>(
    'ReconciliationRecord',
    ReconciliationRecordSchema
  )

export default ReconciliationRecord
