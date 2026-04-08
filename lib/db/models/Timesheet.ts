import mongoose, { Document, Model, Schema } from 'mongoose'

export type TimesheetStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected'

export interface ITimesheet extends Document {
  _id: mongoose.Types.ObjectId
  employeeId: mongoose.Types.ObjectId
  clientId: mongoose.Types.ObjectId
  projectId: mongoose.Types.ObjectId | null
  month: string // YYYY-MM
  workingDays: number
  hours: number           // total hours logged
  billableHours: number   // hours billed to client
  nonBillableHours: number
  overtimeHours: number
  leaveDays: number
  absentDays: number
  approvedBy: mongoose.Types.ObjectId | null
  approvalDate: Date | null
  status: TimesheetStatus
  notes: string
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
      required: [true, 'Client is required'],
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
  },
  { timestamps: true }
)

// Compound unique index — one timesheet per employee per client per month
TimesheetSchema.index(
  { employeeId: 1, clientId: 1, month: 1 },
  { unique: true }
)
TimesheetSchema.index({ month: 1 })
TimesheetSchema.index({ status: 1 })
TimesheetSchema.index({ clientId: 1 })
TimesheetSchema.index({ employeeId: 1 })

const Timesheet: Model<ITimesheet> =
  mongoose.models.Timesheet ??
  mongoose.model<ITimesheet>('Timesheet', TimesheetSchema)

export default Timesheet
