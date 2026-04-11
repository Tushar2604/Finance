import mongoose, { Document, Model, Schema } from 'mongoose'

export type TimesheetStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected'
export type SignedTimesheetStatus = 'Pending' | 'Uploaded' | 'Verified'
export type HRApprovalStatus = 'Pending' | 'Approved' | 'Rejected'

export interface ITimesheetSite {
  siteName: string
  siteCode: string
  projectName: string
  projectCode: string
  requiredHours: number
  normalHours: number
  otHours: number
  servedHours: number
  servedDays: number
}

export interface ITimesheet extends Document {
  _id: mongoose.Types.ObjectId
  referenceCode: string
  employeeId: mongoose.Types.ObjectId
  clientId: mongoose.Types.ObjectId | null
  projectId: mongoose.Types.ObjectId | null
  month: string // YYYY-MM
  workingDays: number
  hours: number
  billableHours: number
  nonBillableHours: number
  overtimeHours: number
  leaveDays: number
  absentDays: number
  approvedBy: mongoose.Types.ObjectId | null
  approvalDate: Date | null
  status: TimesheetStatus
  notes: string
  sites: ITimesheetSite[]
  totalRequiredHours: number
  normalServedHours: number
  totalOTHours: number
  totalServedHours: number
  totalServedDays: number
  totalLeave: number
  signedTimesheetStatus: SignedTimesheetStatus
  hrApprovalStatus: HRApprovalStatus
  employeeSignedStatus: 'Pending' | 'Uploaded'
  createdAt: Date
  updatedAt: Date
}

const TimesheetSchema = new Schema<ITimesheet>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee is required'],
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    month: {
      type: String,
      required: [true, 'Month is required'],
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format'],
    },
    workingDays: {
      type: Number,
      required: [true, 'Working days is required'],
      min: [0, 'Working days cannot be negative'],
      max: [31, 'Working days cannot exceed 31'],
    },
    hours: {
      type: Number,
      required: [true, 'Hours is required'],
      min: [0, 'Hours cannot be negative'],
      max: [744, 'Hours cannot exceed 744 per month'],
    },
    billableHours: {
      type: Number,
      min: [0, 'Billable hours cannot be negative'],
      default: 0,
    },
    nonBillableHours: {
      type: Number,
      min: [0, 'Non-billable hours cannot be negative'],
      default: 0,
    },
    overtimeHours: {
      type: Number,
      min: [0, 'Overtime hours cannot be negative'],
      default: 0,
    },
    leaveDays: {
      type: Number,
      min: [0, 'Leave days cannot be negative'],
      max: [31, 'Leave days cannot exceed 31'],
      default: 0,
    },
    absentDays: {
      type: Number,
      min: [0, 'Absent days cannot be negative'],
      max: [31, 'Absent days cannot exceed 31'],
      default: 0,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvalDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ['Draft', 'Submitted', 'Approved', 'Rejected'],
        message: '{VALUE} is not a valid timesheet status',
      },
      default: 'Draft',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      default: '',
    },
    referenceCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
      default: '',
    },
    sites: [
      {
        siteName: { type: String, default: '' },
        siteCode: { type: String, default: '' },
        projectName: { type: String, default: '' },
        projectCode: { type: String, default: '' },
        requiredHours: { type: Number, min: 0, default: 0 },
        normalHours: { type: Number, min: 0, default: 0 },
        otHours: { type: Number, min: 0, default: 0 },
        servedHours: { type: Number, min: 0, default: 0 },
        servedDays: { type: Number, min: 0, default: 0 },
      },
    ],
    totalRequiredHours: { type: Number, min: 0, default: 0 },
    normalServedHours: { type: Number, min: 0, default: 0 },
    totalOTHours: { type: Number, min: 0, default: 0 },
    totalServedHours: { type: Number, min: 0, default: 0 },
    totalServedDays: { type: Number, min: 0, default: 0 },
    totalLeave: { type: Number, min: 0, default: 0 },
    signedTimesheetStatus: {
      type: String,
      enum: ['Pending', 'Uploaded', 'Verified'],
      default: 'Pending',
    },
    hrApprovalStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    employeeSignedStatus: {
      type: String,
      enum: ['Pending', 'Uploaded'],
      default: 'Pending',
    },
  },
  { timestamps: true }
)

// Compound index — no longer unique (employees can have multiple timesheets per site)
TimesheetSchema.index({ employeeId: 1, clientId: 1, month: 1 })
TimesheetSchema.index({ referenceCode: 1 }, { unique: true, sparse: true })
TimesheetSchema.index({ month: 1 })
TimesheetSchema.index({ status: 1 })
TimesheetSchema.index({ clientId: 1 })
TimesheetSchema.index({ employeeId: 1 })

// Always recompile so schema changes (e.g. removing required) take effect without a full restart
delete (mongoose.models as Record<string, unknown>)['Timesheet']
const Timesheet: Model<ITimesheet> = mongoose.model<ITimesheet>('Timesheet', TimesheetSchema)

export default Timesheet
