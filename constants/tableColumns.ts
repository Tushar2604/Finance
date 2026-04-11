import { ColumnDef, RowData } from '@tanstack/react-table';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    isNumeric?: boolean;
    align?: 'left' | 'center' | 'right';
  }
}

function col<T>(accessorKey: keyof T, header: string, numeric = false): ColumnDef<T, any> {
  return { accessorKey, header, meta: { isNumeric: numeric, align: numeric ? 'right' : 'left' } }
}

// ─── 1. EMPLOYEES (exact spec order) ─────────────────────────────────────────
export const EMPLOYEE_COLUMNS: ColumnDef<any, any>[] = [
  col('employeeCode',        'Employee Code'),
  col('name',                'Employee Name'),
  col('position',            'Position'),
  col('discipline',          'Discipline'),
  col('employeeType',        'Employee Type'),
  col('email',               'Email'),
  col('mobileNo',            'Mobile No.'),
  col('gender',              'Gender'),
  col('dob',                 'Date of Birth'),
  col('contractJoiningDate', 'Contract Joining Date'),
  col('status',              'Status'),
  col('nationality',         'Nationality'),
  col('visaCompany',         'Visa Company'),
  col('totalSalary',         'Total Salary', true),
]

// ─── 2. CLIENTS (exact spec order) ───────────────────────────────────────────
export const CLIENT_COLUMNS: ColumnDef<any, any>[] = [
  col('clientCode',               'Client Code'),
  col('name',                     'Client Name'),
  col('website',                  'Website'),
  col('industry',                 'Industry'),
  col('email',                    'Email'),
  col('phone',                    'Phone'),
  col('address',                  'Address'),
  col('taxNumber',                'Tax Number'),
  col('serviceType',              'Service (Agreement/LPO)'),
  col('signedAgreement',          'Signed Agreement'),
  col('agreementNo',              'Agreement No.'),
  col('requiredWeeklyHoursDeal',  'Weekly Hours Deal',       true),
  col('validLPO',                 'Valid LPO'),
  col('contractDuration',         'Contract Duration'),
  col('discipline',               'Discipline'),
  col('lpoNo',                    'LPO No.'),
  col('monthlyDealAmount',        'Monthly Deal Amount',     true),
  col('workStation',              'Work Station'),
  col('otHourlyDealAmount',       'OT Hourly Deal Amount',   true),
  col('invoiceType',              'Invoice (Hourly/Daily)'),
  col('requiredWeeklyHoursSite',  'Weekly Hours (Site)',      true),
  col('lpoDate',                  'LPO Date'),
  col('lpoValidity',              'LPO Validity'),
  col('remarks',                  'Remarks'),
]

// ─── 3. TIMESHEETS (exact spec order) ────────────────────────────────────────
export const TIMESHEET_COLUMNS: ColumnDef<any, any>[] = [
  col('employeeCode',          'Employee Code'),
  col('email',                 'Email'),
  col('referenceCode',         'Reference Code'),
  col('siteName',              'Site Name'),
  col('siteCode',              'Site Code (ERP)'),
  col('projectName',           'Project Name'),
  col('projectCode',           'Project Code'),
  col('month',                 'Month/Year'),
  col('totalRequiredHours',    'Total Required Hours',    true),
  col('normalServedHours',     'Normal Served Hours',     true),
  col('totalOTHours',          'Total OT Hours',          true),
  col('totalServedHours',      'Total Served Hours',      true),
  col('totalServedDays',       'Total Served Days',       true),
  col('totalLeave',            'Total Leave',             true),
  col('signedTimesheetStatus', 'Signed Timesheet Status'),
  col('hrApprovalStatus',      'HR Approval Status'),
  col('employeeSignedStatus',  'Employee Signed Status'),
]

// ─── 4. SALARIES (exact spec order) ──────────────────────────────────────────
export const SALARY_COLUMNS: ColumnDef<any, any>[] = [
  col('employeeCode',                'Employee Code'),
  col('employeeName',                'Employee Name'),
  col('siteName',                    'Site Name'),
  col('labourCardNo',                'Labour Card No'),
  col('wpsRoutingCode',              'WPS Routing Code'),
  col('iban',                        'IBAN'),
  col('visaUnderCompany',            'Visa Under Company'),
  col('monthlySalary',               'Monthly Salary',              true),
  col('month',                       'Month/Year'),
  col('totalServedDays',             'Total Served Days',           true),
  col('normalServedHours',           'Normal Served Hours',         true),
  col('otHours',                     'OT Hours',                    true),
  col('totalRequiredHours',          'Total Required Hours',        true),
  col('totalServedHrs',              'Total Served Hrs.',           true),
  col('totalSiteServedHours',        'Total Site Served Hours',     true),
  col('salaryAmount',                'Salary Amount',               true),
  col('previousMonthOvertimeAmt',    'Prev. Month OT Amt.',         true),
  col('otAmount',                    'OT Amount',                   true),
  col('grossAmount',                 'Gross Amount',                true),
  col('otherPayable',                'Other Payable',               true),
  col('compensationAmount',          'Compensation Amount',         true),
  col('advanceDeduction',            'Advance Deduction',           true),
  col('pettyCashAmount',             'Petty Cash Amount',           true),
  col('otherDeduction',              'Other Deduction',             true),
  col('wpsViolation',                'WPS Violation',               true),
  col('differenceFromCurrentSalary', 'Diff. From Current Salary',  true),
  col('netPayable',                  'Net Payable',                 true),
  col('totalSiteNetPayable',         'Total Site Net Payable',      true),
  col('signedTimesheetUploadStatus', 'Signed TS Status'),
  col('paymentSource',               'Payment Source'),
]

// ─── 5. PROJECTS (exact spec order) ──────────────────────────────────────────
export const PROJECT_COLUMNS: ColumnDef<any, any>[] = [
  col('name',        'Project Name'),
  col('client',      'Client'),
  col('description', 'Description'),
  col('status',      'Status'),
  col('budget',      'Budget',     true),
  col('startDate',   'Start Date'),
  col('endDate',     'End Date'),
]

// ─── 6. BANK LEDGER (exact spec order) ───────────────────────────────────────
export const BANK_LEDGER_COLUMNS: ColumnDef<any, any>[] = [
  col('description', 'Description'),
  col('counterparty','Counterparty'),
  col('type',        'Type'),
  col('amount',      'Amount',       true),
  col('date',        'Date'),
  col('reference',   'Reference'),
  col('matchStatus', 'Match Status'),
]
