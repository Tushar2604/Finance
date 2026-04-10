export { default as connectDB } from './connection'
export { default as User } from './models/User'
export { default as Client } from './models/Client'
export { default as Project } from './models/Project'
export { default as Employee } from './models/Employee'
export { default as Timesheet } from './models/Timesheet'
export { default as Invoice } from './models/Invoice'
export { default as Salary } from './models/Salary'
export { default as Expense } from './models/Expense'
export { default as BankTransaction } from './models/BankTransaction'
export { default as ReconciliationRecord } from './models/ReconciliationRecord'
export { default as Alert } from './models/Alert'
export { default as AuditLog } from './models/AuditLog'
export { default as UploadBatch } from './models/UploadBatch'
export { default as Deployment } from './models/Deployment'

// Type re-exports
export type { IUser, UserRole, IUserPublic } from './models/User'
export type { IClient, ContractType, BillingType, ICompanyDetails, ClientStatus, IScopePricing } from './models/Client'
export type { IProject, ProjectStatus } from './models/Project'
export type { IEmployee, EmployeeStatus, IBankDetails, IClientWorked } from './models/Employee'
export type { ITimesheet, TimesheetStatus, SignedTimesheetStatus, HRApprovalStatus, ITimesheetSite } from './models/Timesheet'
export type { IInvoice, InvoiceStatus, IInvoiceLineItem } from './models/Invoice'
export type { ISalary, PaymentMode, PaymentStatus, SalaryStatus, WPSStatus } from './models/Salary'
export type {
  IExpense,
  ExpenseCategory,
  ExpensePaymentMode,
  ExpenseStatus,
} from './models/Expense'
export type {
  IBankTransaction,
  TransactionType,
  MatchStatus,
  MatchedEntityType,
} from './models/BankTransaction'
export type {
  IReconciliationRecord,
  ReconciliationType,
  ReconciliationStatus,
} from './models/ReconciliationRecord'
export type { IAlert, AlertType, AlertSeverity } from './models/Alert'
export type { IAuditLog } from './models/AuditLog'
export type {
  IUploadBatch,
  UploadBatchType,
  UploadBatchStatus,
  IUploadBatchError,
} from './models/UploadBatch'
export type { IDeployment, DeploymentStatus, DeploymentBillingType } from './models/Deployment'
