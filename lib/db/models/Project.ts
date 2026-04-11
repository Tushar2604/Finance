import mongoose, { Document, Model, Schema } from 'mongoose'

export type ProjectStatus = 'Active' | 'Completed' | 'On-Hold' | 'Cancelled'

export interface IProject extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  clientId: mongoose.Types.ObjectId | null
  startDate: Date
  endDate: Date | null
  status: ProjectStatus
  description: string
  budget: number
  createdAt: Date
  updatedAt: Date
}

const ProjectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ['Active', 'Completed', 'On-Hold', 'Cancelled'],
        message: '{VALUE} is not a valid project status',
      },
      default: 'Active',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },
    budget: {
      type: Number,
      min: [0, 'Budget cannot be negative'],
      default: 0,
    },
  },
  { timestamps: true }
)

// Indexes
ProjectSchema.index({ clientId: 1 })
ProjectSchema.index({ status: 1 })
ProjectSchema.index({ clientId: 1, status: 1 })
ProjectSchema.index({ startDate: -1 })

delete (mongoose.models as Record<string, unknown>)['Project']
const Project: Model<IProject> = mongoose.model<IProject>('Project', ProjectSchema)

export default Project
