import { ColumnDef, RowData } from '@tanstack/react-table';

// Extend the ColumnMeta type to include our custom properties
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    isNumeric?: boolean;
    align?: 'left' | 'center' | 'right';
  }
}

// Helper to create simple text columns
function createTextColumn<T>(accessorKey: keyof T, header: string, isNumeric: boolean = false): ColumnDef<T, any> {
  return {
    accessorKey,
    header,
    meta: {
      isNumeric,
      align: isNumeric ? 'center' : 'left',
    },
  };
}

// TIMESHEETS
export const TIMESHEET_COLUMNS: ColumnDef<any, any>[] = [
  createTextColumn('empCode', 'Emp Code'),
  createTextColumn('employeeName', 'Employee Name'),
  createTextColumn('referenceCode', 'Reference Code'),
  createTextColumn('siteName', 'Site Name'),
  createTextColumn('siteCode', 'Site Code'),
  createTextColumn('projectName', 'Project Name'),
  createTextColumn('projectCode', 'Project Code'),
  createTextColumn('monthYear', 'Month/Year'),
  createTextColumn('reqHrs', 'Req Hrs', true),
  createTextColumn('normalHrs', 'Normal Hrs', true),
  createTextColumn('otHrs', 'OT Hrs', true),
  createTextColumn('servedHrs', 'Served Hrs', true),
  createTextColumn('sumSitesHrs', 'Σ Sites Hrs', true),
  createTextColumn('servedDays', 'Served Days', true),
  createTextColumn('sumSitesDays', 'Σ Sites Days', true),
  createTextColumn('leaves', 'Leaves', true),
  createTextColumn('signedTs', 'Signed TS'),
];

// EMPLOYEES
export const EMPLOYEE_COLUMNS: ColumnDef<any, any>[] = [
  createTextColumn('employeeCode', 'Employee Code'),
  createTextColumn('employeeName', 'Employee Name'),
  createTextColumn('position', 'Position'),
  createTextColumn('discipline', 'Discipline'),
  createTextColumn('employeeType', 'Employee Type'),
  createTextColumn('email', 'Email'),
  createTextColumn('mobileNo', 'Mobile No'),
  createTextColumn('gender', 'Gender'),
  createTextColumn('dob', 'DOB'),
  createTextColumn('joiningDate', 'Joining Date'),
  createTextColumn('status', 'Status'),
  createTextColumn('nationality', 'Nationality'),
  createTextColumn('visaCompany', 'Visa Company'),
  createTextColumn('totalSalary', 'Total Salary', true),
];

// CLIENTS
export const CLIENT_COLUMNS: ColumnDef<any, any>[] = [
  createTextColumn('clientCode', 'Client Code'),
  createTextColumn('clientName', 'Client Name'),
  createTextColumn('website', 'Website'),
  createTextColumn('industry', 'Industry'),
  createTextColumn('email', 'Email'),
  createTextColumn('phone', 'Phone'),
  createTextColumn('address', 'Address'),
  createTextColumn('taxNumber', 'Tax Number'),
  createTextColumn('serviceAgreement', 'Service Agreement'),
  createTextColumn('signedAgreement', 'Signed Agreement'),
  createTextColumn('agreementNo', 'Agreement No'),
  createTextColumn('weeklyHoursDeal', 'Weekly Hours Deal', true),
  createTextColumn('validLpo', 'Valid LPO'),
  createTextColumn('contractDuration', 'Contract Duration', true),
  createTextColumn('discipline', 'Discipline'),
  createTextColumn('lpoNo', 'LPO No'),
  createTextColumn('monthlyDeal', 'Monthly Deal'),
  createTextColumn('workStation', 'Work Station'),
  createTextColumn('otDeal', 'OT Deal'),
  createTextColumn('invoiceType', 'Invoice Type'),
];

// SALARIES
export const SALARY_COLUMNS: ColumnDef<any, any>[] = [
  createTextColumn('employeeCode', 'Employee Code'),
  createTextColumn('employeeName', 'Employee Name'),
  createTextColumn('siteName', 'Site Name'),
  createTextColumn('labourCardNo', 'Labour Card No'),
  createTextColumn('wpsRoutingCode', 'WPS Routing Code'),
  createTextColumn('iban', 'IBAN'),
  createTextColumn('visaCompany', 'Visa Company'),
  createTextColumn('monthlySalary', 'Monthly Salary', true),
  createTextColumn('monthYear', 'Month/Year'),
  createTextColumn('servedDays', 'Served Days', true),
  createTextColumn('normalHrs', 'Normal Hrs', true),
  createTextColumn('otHrs', 'OT Hrs', true),
  createTextColumn('requiredHrs', 'Required Hrs', true),
  createTextColumn('servedHrs', 'Served Hrs', true),
  createTextColumn('siteServedHrs', 'Site Served Hrs', true),
  createTextColumn('salaryAmount', 'Salary Amount', true),
  createTextColumn('otAmount', 'OT Amount', true),
  createTextColumn('grossAmount', 'Gross Amount', true),
  createTextColumn('deductions', 'Deductions', true),
  createTextColumn('netSalary', 'Net Salary', true),
];

// PROJECTS
export const PROJECT_COLUMNS: ColumnDef<any, any>[] = [
  createTextColumn('projectName', 'Project Name'),
  createTextColumn('client', 'Client'),
  createTextColumn('description', 'Description'),
  createTextColumn('status', 'Status'),
  createTextColumn('budget', 'Budget', true),
  createTextColumn('startDate', 'Start Date'),
  createTextColumn('endDate', 'End Date'),
];

// BANK LEDGER
export const BANK_LEDGER_COLUMNS: ColumnDef<any, any>[] = [
  createTextColumn('description', 'Description'),
  createTextColumn('counterparty', 'Counterparty'),
  createTextColumn('type', 'Type'),
  createTextColumn('amount', 'Amount', true),
  createTextColumn('date', 'Date'),
  createTextColumn('reference', 'Reference'),
  createTextColumn('matchStatus', 'Match Status'),
];
