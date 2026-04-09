import mongoose, { Document, Model, Schema } from 'mongoose'

export type LPORateType = 'Monthly' | 'Daily' | 'Hourly'
export type LPOStatus = 'Active' | 'Expired' | 'Draft' | 'Cancelled'

export interface ILPOPosition {
  position: string
  discipline: string
  quantity: number
  rateType: LPORateType
  monthlyRate: number
  dailyRate: number
  hourlyRate: number
  fixedRate: number
  duration: number          // months
  overtimeRateType: 'None' | 'Fixed' | 'Multiplier'
  overtimeRate: number      // fixed AED or multiplier (e.g. 1.5)
  workstationRequired: boolean
  softwareRequired: boolean
}

export interface ILPO extends Document {
  _id: mongoose.Types.ObjectId
  clientId: mongoose.Types.ObjectId
  lpoNumber: string
  title: string
  validityStart: Date
  validityEnd: Date
  paymentTerms: number        // days
  vatApplicablePct: number
  totalPOAmountExclVAT: number
  vatAmount: number
  totalPOAmountInclVAT: number
  currency: string
  positions: ILPOPosition[]
  billingRules: string
  overtimeRules: string
  licenseDetails: string
  status: LPOStatus
  signedPOUrl: string
  internalWorkAgreementUrl: string
  notes: string
  createdAt: Date
  updatedAt: Date
}

const LPOPositionSchema = new Schema<ILPOPosition>(
  {
    position: { type: String, trim: true, default: '' },
    discipline: { type: String, trim: true, default: '' },
    quantity: { type: Number, default: 1, min: 1 },
    rateType: { type: String, enum: ['Monthly', 'Daily', 'Hourly'], default: 'Monthly' },
    monthlyRate: { type: Number, default: 0, min: 0 },
    dailyRate: { type: Number, default: 0, min: 0 },
    hourlyRate: { type: Number, default: 0, min: 0 },
    fixedRate: { type: Number, default: 0, min: 0 },
    duration: { type: Number, default: 1, min: 1 },
    overtimeRateType: { type: String, enum: ['None', 'Fixed', 'Multiplier'], default: 'None' },
    overtimeRate: { type: Number, default: 0, min: 0 },
    workstationRequired: { type: Boolean, default: false },
    softwareRequired: { type: Boolean, default: false },
  },
  { _id: false }
)

const LPOSchema = new Schema<ILPO>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    lpoNumber: { type: String, trim: true, required: true, maxlength: [100, 'LPO number too long'] },
    title: { type: String, trim: true, default: '' },
    validityStart: { type: Date, required: true },
    validityEnd: { type: Date, required: true },
    paymentTerms: { type: Number, default: 30, min: 0 },
    vatApplicablePct: { type: Number, default: 5, min: 0 },
    totalPOAmountExclVAT: { type: Number, default: 0, min: 0 },
    vatAmount: { type: Number, default: 0, min: 0 },
    totalPOAmountInclVAT: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'AED', maxlength: 10 },
    positions: { type: [LPOPositionSchema], default: [] },
    billingRules: { type: String, trim: true, default: '' },
    overtimeRules: { type: String, trim: true, default: '' },
    licenseDetails: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['Active', 'Expired', 'Draft', 'Cancelled'], default: 'Draft' },
    signedPOUrl: { type: String, trim: true, default: '' },
    internalWorkAgreementUrl: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
)

LPOSchema.index({ clientId: 1 })
LPOSchema.index({ status: 1 })
LPOSchema.index({ lpoNumber: 1 }, { unique: true })

const LPO: Model<ILPO> = mongoose.models.LPO ?? mongoose.model<ILPO>('LPO', LPOSchema)
export default LPO
