import mongoose, { Document, Model, Schema } from 'mongoose'

export type DeploymentStatus = 'Active' | 'Replaced' | 'Ended' | 'On-Hold'
export type DeploymentBillingType = 'Monthly' | 'Daily' | 'Hourly'

export interface IDeployment extends Document {
  _id: mongoose.Types.ObjectId
  deploymentCode: string
  employeeId: mongoose.Types.ObjectId
  clientId: mongoose.Types.ObjectId
  projectId: mongoose.Types.ObjectId | null
  lpoId: mongoose.Types.ObjectId | null
  position: string
  billingRate: number
  billingType: DeploymentBillingType
  salary: number
  startDate: Date
  endDate: Date | null
  status: DeploymentStatus
  replacedBy: mongoose.Types.ObjectId | null
  mobilizationStatus: string
  visaStatus: string
  notes: string
  createdAt: Date
  updatedAt: Date
}

const DeploymentSchema = new Schema<IDeployment>(
  {
    deploymentCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
      default: '',
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee is required'],
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client is required'],
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    lpoId: {
      type: Schema.Types.ObjectId,
      ref: 'LPO',
      default: null,
    },
    position: { type: String, trim: true, default: '' },
    billingRate: { type: Number, min: 0, default: 0 },
    billingType: {
      type: String,
      enum: { values: ['Monthly', 'Daily', 'Hourly'], message: '{VALUE} is not a valid billing type' },
      default: 'Monthly',
    },
    salary: { type: Number, min: 0, default: 0 },
    startDate: { type: Date, required: [true, 'Start date is required'] },
    endDate: { type: Date, default: null },
    status: {
      type: String,
      enum: { values: ['Active', 'Replaced', 'Ended', 'On-Hold'], message: '{VALUE} is not a valid status' },
      default: 'Active',
    },
    replacedBy: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    mobilizationStatus: { type: String, trim: true, default: '' },
    visaStatus: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, maxlength: [2000, 'Notes cannot exceed 2000 characters'], default: '' },
  },
  { timestamps: true }
)

DeploymentSchema.index({ employeeId: 1 })
DeploymentSchema.index({ clientId: 1 })
DeploymentSchema.index({ status: 1 })
DeploymentSchema.index({ employeeId: 1, clientId: 1 })

// Auto-generate deployment code before save if not set
DeploymentSchema.pre<IDeployment>('save', async function (next) {
  if (!this.deploymentCode) {
    const year = new Date().getFullYear()
    const count = await (mongoose.model('Deployment') as Model<IDeployment>).countDocuments()
    this.deploymentCode = `DEP-${year}-${String(count + 1).padStart(4, '0')}`
  }
  next()
})

const Deployment: Model<IDeployment> =
  mongoose.models.Deployment ??
  mongoose.model<IDeployment>('Deployment', DeploymentSchema)

export default Deployment
