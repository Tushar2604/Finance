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
  // ── Spec fields (exact order) ──
  clientCode: string                   // 1
  name: string                         // 2  (Client Name)
  website: string                      // 3
  industry: string                     // 4
  companyDetails: ICompanyDetails      // email, phone, address, taxNumber → 5-8
  serviceType: string                  // 9  Agreement / LPO
  signedAgreement: boolean             // 10
  agreementNo: string                  // 11
  requiredWeeklyHoursDeal: number      // 12
  validLPO: boolean                    // 13
  contractDuration: string             // 14
  discipline: string                   // 15
  lpoNo: string                        // 16
  monthlyDealAmount: number            // 17
  workStation: string                  // 18
  otHourlyDealAmount: number           // 19
  invoiceType: string                  // 20  Hourly / Daily
  requiredWeeklyHoursSite: number      // 21
  lpoDate: Date | null                 // 22
  lpoValidity: Date | null             // 23
  remarks: string                      // 24
  // ── Legacy / system fields ──
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
    clientCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
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
    serviceType: { type: String, enum: { values: ['Agreement', 'LPO', 'Both', ''], message: '{VALUE} is not valid' }, default: '' },
    signedAgreement: { type: Boolean, default: false },
    agreementNo: { type: String, trim: true, default: '' },
    requiredWeeklyHoursDeal: { type: Number, min: 0, default: 0 },
    validLPO: { type: Boolean, default: false },
    contractDuration: { type: String, trim: true, default: '' },
    discipline: { type: String, trim: true, default: '' },
    lpoNo: { type: String, trim: true, default: '' },
    monthlyDealAmount: { type: Number, min: 0, default: 0 },
    workStation: { type: String, trim: true, default: '' },
    otHourlyDealAmount: { type: Number, min: 0, default: 0 },
    invoiceType: { type: String, enum: { values: ['Hourly', 'Daily', ''], message: '{VALUE} is not valid' }, default: '' },
    requiredWeeklyHoursSite: { type: Number, min: 0, default: 0 },
    lpoDate: { type: Date, default: null },
    lpoValidity: { type: Date, default: null },
    remarks: { type: String, trim: true, default: '' },
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
