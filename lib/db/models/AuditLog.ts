import mongoose, { Document, Model, Schema } from 'mongoose'

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId | null
  action: string
  entityType: string
  entityId: mongoose.Types.ObjectId | string | null
  previousData: mongoose.Schema.Types.Mixed
  newData: mongoose.Schema.Types.Mixed
  ipAddress: string
  userAgent: string
  createdAt: Date
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
      maxlength: [100, 'Action cannot exceed 100 characters'],
    },
    entityType: {
      type: String,
      required: [true, 'Entity type is required'],
      trim: true,
    },
    entityId: {
      type: Schema.Types.Mixed,
      default: null,
    },
    previousData: {
      type: Schema.Types.Mixed,
      default: null,
    },
    newData: {
      type: Schema.Types.Mixed,
      default: null,
    },
    ipAddress: {
      type: String,
      trim: true,
      default: '',
    },
    userAgent: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

// Indexes
AuditLogSchema.index({ userId: 1 })
AuditLogSchema.index({ entityType: 1 })
AuditLogSchema.index({ createdAt: -1 })
AuditLogSchema.index({ userId: 1, entityType: 1, createdAt: -1 })

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog ??
  mongoose.model<IAuditLog>('AuditLog', AuditLogSchema)

export default AuditLog
