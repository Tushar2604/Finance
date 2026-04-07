import mongoose, { Document, Model, Schema } from 'mongoose'

export type UploadBatchType = 'BankStatement' | 'WPSReport' | 'ExpenseSheet'
export type UploadBatchStatus = 'Processing' | 'Completed' | 'Failed'

export interface IUploadBatchError {
  row: number
  field: string
  message: string
}

export interface IUploadBatch extends Document {
  _id: mongoose.Types.ObjectId
  type: UploadBatchType
  filename: string
  status: UploadBatchStatus
  recordsTotal: number
  recordsProcessed: number
  recordsFailed: number
  errors: IUploadBatchError[]
  uploadedBy: mongoose.Types.ObjectId
  createdAt: Date
}

const UploadBatchErrorSchema = new Schema<IUploadBatchError>(
  {
    row: { type: Number, required: true },
    field: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
  },
  { _id: false }
)

const UploadBatchSchema = new Schema<IUploadBatch>(
  {
    type: {
      type: String,
      enum: {
        values: ['BankStatement', 'WPSReport', 'ExpenseSheet'],
        message: '{VALUE} is not a valid upload batch type',
      },
      required: [true, 'Type is required'],
    },
    filename: {
      type: String,
      required: [true, 'Filename is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['Processing', 'Completed', 'Failed'],
        message: '{VALUE} is not a valid upload batch status',
      },
      default: 'Processing',
    },
    recordsTotal: {
      type: Number,
      min: [0, 'Records total cannot be negative'],
      default: 0,
    },
    recordsProcessed: {
      type: Number,
      min: [0, 'Records processed cannot be negative'],
      default: 0,
    },
    recordsFailed: {
      type: Number,
      min: [0, 'Records failed cannot be negative'],
      default: 0,
    },
    errors: {
      type: [UploadBatchErrorSchema],
      default: [],
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploaded by is required'],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

// Indexes
UploadBatchSchema.index({ type: 1 })
UploadBatchSchema.index({ status: 1 })
UploadBatchSchema.index({ uploadedBy: 1 })
UploadBatchSchema.index({ createdAt: -1 })

const UploadBatch: Model<IUploadBatch> =
  mongoose.models.UploadBatch ??
  mongoose.model<IUploadBatch>('UploadBatch', UploadBatchSchema)

export default UploadBatch
