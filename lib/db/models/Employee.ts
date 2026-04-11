import mongoose, { Document, Model, Schema } from 'mongoose'

export type EmployeeStatus = 'Active' | 'Inactive' | 'On-Leave'

export interface IBankDetails {
  bankName: string
  accountNumber: string
  iban: string
}

export interface IClientWorked {
  clientId: mongoose.Types.ObjectId
  clientCode: string
  clientName: string
}

export interface IEmployee extends Document {
  _id: mongoose.Types.ObjectId
  // ── Core fields (exact order from spec) ──
  employeeCode: string        // 1
  name: string                // 2  (employee_name)
  position: string            // 3
  discipline: string          // 4
  employeeType: string        // 5  (employee_type)
  email: string               // 6
  mobileNo: string            // 7  (mobile_no)
  gender: string              // 8
  dob: Date | null            // 9
  contractJoiningDate: Date | null // 10
  status: EmployeeStatus      // 11
  nationality: string         // 12
  visaCompany: string         // 13 (visa_company)
  totalSalary: number         // 14 (total_salary)
  // ── Legacy / extended fields (kept for backwards compat) ──
  phone: string
  baseSalary: number
  joiningDate: Date
  assignedClientId: mongoose.Types.ObjectId | null
  assignedProjectId: mongoose.Types.ObjectId | null
  bankDetails: IBankDetails
  clientsWorkedWith: IClientWorked[]
  currentMonthlySalary: number
  monthlySalaryContracted: number
  basicSalaryContracted: number
  noticePeriod: number
  probationPeriod: number
  createdAt: Date
  updatedAt: Date
}

const BankDetailsSchema = new Schema<IBankDetails>(
  {
    bankName: { type: String, trim: true, default: '' },
    accountNumber: { type: String, trim: true, default: '' },
    iban: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
      match: [/^$|^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/, 'Please enter a valid IBAN'],
    },
  },
  { _id: false }
)

const EmployeeSchema = new Schema<IEmployee>(
  {
    name: {
      type: String,
      required: [true, 'Employee name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [150, 'Name cannot exceed 150 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    position: {
      type: String,
      required: [true, 'Position is required'],
      trim: true,
      maxlength: [150, 'Position cannot exceed 150 characters'],
    },
    baseSalary: {
      type: Number,
      required: [true, 'Base salary is required'],
      min: [0, 'Salary cannot be negative'],
    },
    joiningDate: {
      type: Date,
      required: [true, 'Joining date is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['Active', 'Inactive', 'On-Leave'],
        message: '{VALUE} is not a valid employee status',
      },
      default: 'Active',
    },
    assignedClientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
    },
    assignedProjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    employeeCode: {
      type: String,
      required: [true, 'Employee code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    discipline: { type: String, trim: true, default: '' },
    employeeType: {
      type: String,
      enum: { values: ['Permanent', 'Contract', 'Freelance', 'Intern', 'Part-Time', ''], message: '{VALUE} is not valid' },
      default: '',
    },
    mobileNo: { type: String, trim: true, default: '' },
    gender: {
      type: String,
      enum: { values: ['Male', 'Female', 'Other', ''], message: '{VALUE} is not valid' },
      default: '',
    },
    dob: { type: Date, default: null },
    contractJoiningDate: { type: Date, default: null },
    nationality: {
      type: String,
      trim: true,
      default: '',
    },
    visaCompany: { type: String, trim: true, default: '' },
    totalSalary: { type: Number, min: 0, default: 0 },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    bankDetails: {
      type: BankDetailsSchema,
      default: () => ({ bankName: '', accountNumber: '', iban: '' }),
    },
    clientsWorkedWith: [
      {
        clientId: { type: Schema.Types.ObjectId, ref: 'Client' },
        clientCode: { type: String, default: '' },
        clientName: { type: String, default: '' },
      },
    ],
    currentMonthlySalary: { type: Number, min: 0, default: 0 },
    monthlySalaryContracted: { type: Number, min: 0, default: 0 },
    basicSalaryContracted: { type: Number, min: 0, default: 0 },
    noticePeriod: { type: Number, min: 0, default: 30 },
    probationPeriod: { type: Number, min: 0, default: 90 },
  },
  { timestamps: true }
)

// Indexes
EmployeeSchema.index({ status: 1 })
EmployeeSchema.index({ assignedClientId: 1 })
EmployeeSchema.index({ assignedProjectId: 1 })

const Employee: Model<IEmployee> =
  mongoose.models.Employee ??
  mongoose.model<IEmployee>('Employee', EmployeeSchema)

export default Employee
