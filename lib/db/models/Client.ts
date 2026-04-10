import mongoose, { Document, Model, Schema } from 'mongoose'

export type ContractType = 'LPO' | 'Agreement' | 'None'
export type BillingType = 'Monthly' | 'Milestone' | 'Hourly'
export type ClientStatus = 'Active' | 'Inactive' | 'Blacklisted'

export interface ICompanyDetails {
  address: string
  phone: string
  email: string
  taxNumber: string
}

export interface IScopePricing {
  scopeName: string
  totalAmount: number
  billingType: 'Milestone' | 'Monthly'
}

export interface IClient extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  website: string
  industry: string
  companyDetails: ICompanyDetails
  contractType: ContractType
  rateCard: number
  billingType: BillingType
  creditTerms: number
  isActive: boolean
  clientStatus: ClientStatus
  city: string
  country: string
  primaryContactName: string
  primaryContactDesignation: string
  salesPerson: string
  penaltyClause: string
  scopePricing: IScopePricing[]
  createdAt: Date
  updatedAt: Date
}

const CompanyDetailsSchema = new Schema<ICompanyDetails>(
  {
    address: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
      match: [/^$|^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    taxNumber: { type: String, trim: true, default: '' },
  },
  { _id: false }
)

const ClientSchema = new Schema<IClient>(
  {
    name: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    website: { type: String, trim: true, default: '' },
    industry: { type: String, trim: true, default: '' },
    companyDetails: {
      type: CompanyDetailsSchema,
      default: () => ({ address: '', phone: '', email: '', taxNumber: '' }),
    },
    contractType: {
      type: String,
      enum: {
        values: ['LPO', 'Agreement', 'None'],
        message: '{VALUE} is not a valid contract type',
      },
      default: 'None',
    },
    rateCard: {
      type: Number,
      min: [0, 'Rate card cannot be negative'],
      default: 0,
    },
    billingType: {
      type: String,
      enum: {
        values: ['Monthly', 'Milestone', 'Hourly'],
        message: '{VALUE} is not a valid billing type',
      },
      default: 'Monthly',
    },
    creditTerms: {
      type: Number,
      min: [0, 'Credit terms cannot be negative'],
      max: [365, 'Credit terms cannot exceed 365 days'],
      default: 30,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    clientStatus: {
      type: String,
      enum: { values: ['Active', 'Inactive', 'Blacklisted'], message: '{VALUE} is not valid' },
      default: 'Active',
    },
    city: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
    primaryContactName: { type: String, trim: true, default: '' },
    primaryContactDesignation: { type: String, trim: true, default: '' },
    salesPerson: { type: String, trim: true, default: '' },
    penaltyClause: { type: String, trim: true, default: '' },
    scopePricing: [
      {
        scopeName: { type: String, default: '' },
        totalAmount: { type: Number, min: 0, default: 0 },
        billingType: { type: String, enum: ['Milestone', 'Monthly'], default: 'Monthly' },
      },
    ],
  },
  { timestamps: true }
)

// Indexes
ClientSchema.index({ name: 1 })
ClientSchema.index({ isActive: 1 })
ClientSchema.index({ contractType: 1 })
ClientSchema.index({ clientStatus: 1 })

const Client: Model<IClient> =
  mongoose.models.Client ?? mongoose.model<IClient>('Client', ClientSchema)

export default Client
