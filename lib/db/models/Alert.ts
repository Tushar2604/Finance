import mongoose, { Document, Model, Schema } from 'mongoose'

export type AlertType =
  | 'MissingTimesheet'
  | 'UnpaidInvoice'
  | 'SalaryMismatch'
  | 'NegativeMargin'
  | 'UnmatchedBank'
  | 'CostAnomaly'
  | 'RevenueGap'

export type AlertSeverity = 'Low' | 'Medium' | 'High' | 'Critical'

export interface IAlert extends Document {
  _id: mongoose.Types.ObjectId
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  entityType: string
  entityId: mongoose.Types.ObjectId | null
  isRead: boolean
  isResolved: boolean
  resolvedBy: mongoose.Types.ObjectId | null
  resolvedAt: Date | null
  createdAt: Date
}

const AlertSchema = new Schema<IAlert>(
  {
    type: {
      type: String,
      enum: {
        values: [
          'MissingTimesheet',
          'UnpaidInvoice',
          'SalaryMismatch',
          'NegativeMargin',
          'UnmatchedBank',
          'CostAnomaly',
          'RevenueGap',
        ],
        message: '{VALUE} is not a valid alert type',
      },
      required: [true, 'Alert type is required'],
    },
    severity: {
      type: String,
      enum: {
        values: ['Low', 'Medium', 'High', 'Critical'],
        message: '{VALUE} is not a valid severity',
      },
      required: [true, 'Severity is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    entityType: {
      type: String,
      trim: true,
      default: '',
    },
    entityId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    isResolved: {
      type: Boolean,
      default: false,
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
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

// Indexes
AlertSchema.index({ type: 1 })
AlertSchema.index({ severity: 1 })
AlertSchema.index({ isRead: 1 })
AlertSchema.index({ isResolved: 1 })
AlertSchema.index({ createdAt: -1 })
AlertSchema.index({ entityType: 1, entityId: 1 })

const Alert: Model<IAlert> =
  mongoose.models.Alert ?? mongoose.model<IAlert>('Alert', AlertSchema)

export default Alert
