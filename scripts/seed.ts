/**
 * BIM Finance — Database Seed Script
 *
 * Creates realistic UAE staffing company data for investor/demo dashboard.
 *
 * Run with: npm run seed
 */

import mongoose from 'mongoose'
import * as dotenv from 'dotenv'
import path from 'path'
// Load environment variables from .env.local then .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

// Import models
import User from '../lib/db/models/User'
import Client from '../lib/db/models/Client'
import Project from '../lib/db/models/Project'
import Employee from '../lib/db/models/Employee'
import Timesheet from '../lib/db/models/Timesheet'
import Invoice from '../lib/db/models/Invoice'
import Salary from '../lib/db/models/Salary'
import Expense from '../lib/db/models/Expense'
import BankTransaction from '../lib/db/models/BankTransaction'
import Alert from '../lib/db/models/Alert'
import ReconciliationRecord from '../lib/db/models/ReconciliationRecord'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function log(msg: string) { console.log(`\n[SEED] ${msg}`) }
function ok(msg: string) { console.log(`  ✓ ${msg}`) }

function randAmount(min: number, max: number): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2))
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

// ─── Connection ─────────────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/bim-finance'

async function connect() {
  log(`Connecting to MongoDB`)
  await mongoose.connect(MONGODB_URI, { bufferCommands: false, maxPoolSize: 5 })
  ok('Connected to MongoDB')
}

// ─── Clear ───────────────────────────────────────────────────────────────────
async function clearCollections() {
  log('Clearing existing data...')
  await Promise.all([
    User.deleteMany({}),
    Client.deleteMany({}),
    Project.deleteMany({}),
    Employee.deleteMany({}),
    Timesheet.deleteMany({}),
    Invoice.deleteMany({}),
    Salary.deleteMany({}),
    Expense.deleteMany({}),
    BankTransaction.deleteMany({}),
    Alert.deleteMany({}),
    ReconciliationRecord.deleteMany({})
  ])
  ok('All collections cleared')
}

// ─── Seed Users ─────────────────────────────────────────────────────────────
async function seedUsers() {
  log('Seeding Demo Users...')
  const plainPassword = 'Demo@123'

  const users = await User.create([
    { name: 'Admin Manager', email: 'admin@demo.com', password: plainPassword, role: 'Admin', isActive: true, lastLogin: new Date() },
    { name: 'Finance Lead', email: 'finance@demo.com', password: plainPassword, role: 'Finance', isActive: true, lastLogin: new Date() },
    { name: 'HR Coordinator', email: 'hr@demo.com', password: plainPassword, role: 'Manager', isActive: true, lastLogin: null }
  ])

  users.forEach((u) => ok(`${u.role}: ${u.email}`))
  return users
}

// ─── Seed Clients ───────────────────────────────────────────────────────────
async function seedClients() {
  log('Seeding 10 Clients...')

  const clientNames = [
    'Abu Dhabi National Energy Company (TAQA)', 'Emirates Steel Arkan', 'Aldar Properties PJSC',
    'Dubai Electricity & Water Authority (DEWA)', 'Emaar Properties', 'Etisalat Group',
    'DP World Logistics', 'Mubadala Investment', 'ADNOC Offshore', 'Nakheel Developments'
  ]

  const clients = await Promise.all(clientNames.map(async (name, i) => {
    return Client.create({
      name,
      companyDetails: {
        address: `Business Bay, Office ${100 + i}, UAE`,
        phone: `+971 50 ${randInt(1000000, 9999999)}`,
        email: `finance@${name.replace(/[^a-zA-Z]/g, '').toLowerCase()}.ae`,
        taxNumber: `TRN${randInt(100000000000000, 999999999999999)}`,
      },
      contractType: i % 2 === 0 ? 'Agreement' : 'LPO',
      rateCard: randInt(120, 350),
      billingType: 'Monthly',
      creditTerms: i % 3 === 0 ? 60 : 30, // Mix of 30 and 60 day terms
      isActive: i !== 9 // One inactive client
    })
  }))

  ok(`Seeded ${clients.length} clients`)
  return clients
}

// ─── Seed Projects ──────────────────────────────────────────────────────────
async function seedProjects(clients: any[]) {
  log('Seeding 15 Projects...')
  
  const projects = []
  for (let i = 0; i < 15; i++) {
    const client = clients[i % 8] // Distribute across first 8 clients
    projects.push(await Project.create({
      name: `Strategic Initiative Phase ${i + 1}`,
      clientId: client._id,
      startDate: new Date(`2024-0${randInt(1, 6)}-01`),
      endDate: i > 12 ? new Date('2024-08-01') : null, // A few completed
      status: i > 12 ? 'Completed' : 'Active',
      description: `Project execution for ${client.name}`,
      budget: randAmount(500000, 5000000),
    }))
  }

  ok(`Seeded ${projects.length} projects`)
  return projects
}

// ─── Seed Employees ─────────────────────────────────────────────────────────
async function seedEmployees(clients: any[], projects: any[]) {
  log('Seeding 25 Employees...')
  
  const roles = [
    'Senior Mechanical Engineer', 'Instrument Technician', 'Electrical Engineer',
    'QA/QC Engineer', 'Project Manager', 'HSE Officer', 'Developer', 'Designer'
  ]

  const employees = []
  for (let i = 0; i < 25; i++) {
    const isInternal = i > 20 // 4 internal employees
    const client = isInternal ? null : clients[i % 8]
    const psts = isInternal ? [] : projects.filter(p => p.clientId.toString() === client._id.toString())
    const project = isInternal ? null : (psts.length > 0 ? psts[0] : null)

    employees.push(await Employee.create({
      name: `Emp${i} Demo`,
      email: `emp${i}@bimstaff.ae`,
      position: roles[i % roles.length],
      employeeCode: `BIM-EMP-${String(i+1).padStart(5, '0')}`,
      baseSalary: isInternal ? randInt(8000, 15000) : randInt(12000, 25000),
      joiningDate: new Date(`2023-01-15`),
      status: i === 24 ? 'Inactive' : 'Active',
      assignedClientId: client ? client._id : null,
      assignedProjectId: project ? project._id : null,
      nationality: 'Expat',
      bankDetails: {
        bankName: 'Emirates NBD',
        accountNumber: `000${randInt(100000, 999999)}`,
        iban: `AE${randInt(10,99)}026000${randInt(100000000, 999999999)}`,
      },
    }))
  }

  ok(`Seeded ${employees.length} employees`)
  return employees
}

// ─── Seed Monthly Transactions (3 Months) ───────────────────────────────────
async function seedTransactions(employees: any[], clients: any[], projects: any[], adminId: any) {
  log('Seeding 3 months of full lifecycle data (Timesheets, Invoices, Salaries, Bank, Expenses, Alerts)...')
  
  const months = ['2024-09', '2024-10', '2024-11']
  let invSeq = 1

  for (let mIdx = 0; mIdx < months.length; mIdx++) {
    const month = months[mIdx]
    const year = parseInt(month.split('-')[0])
    let totalSalariesCost = 0
    let totalInvoiced = 0

    log(` Processing ${month}...`)

    for (const emp of employees) {
      if (emp.status === 'Terminated') continue

      // 1. Salaries (For everyone)
      const baseSalary = emp.baseSalary
      const overtime = randAmount(0, 1500)
      const deductions = Math.random() > 0.8 ? randAmount(100, 500) : 0
      const netSalary = parseFloat((baseSalary + overtime - deductions).toFixed(2))

      const paymentDate = new Date(`${month}-28`)
      const isDuplicate = month === '2024-10' && emp.employeeCode === 'BIM-EMP-00005'

      const salaryDoc = await Salary.create({
        employeeId: emp._id,
        month,
        baseSalary, overtime, deductions, netSalary,
        paymentDate,
        paymentMode: 'WPS',
        paymentStatus: 'Paid',
        bankReference: `SAL-${month}-${emp.employeeCode}`
      })

      // Correct Bank Transaction for Salary
      const bankTx = await BankTransaction.create({
        date: paymentDate,
        description: `WPS Salary Transfer ${emp.employeeCode}`,
        debit: netSalary,
        credit: 0,
        balance: 1000000 - netSalary, // Dummy balance
        reference: `WPS-${month}-${emp.employeeCode}`,
        transactionType: 'Debit',
        matchStatus: 'Matched',
        matchedEntityType: 'Salary',
        matchedEntityId: salaryDoc._id,
        matchConfidence: 100
      })

      // Duplicate Anomaly Injection for October
      if (isDuplicate) {
        // Second bank debit lacking a salary document
        const dupBankTx = await BankTransaction.create({
          date: paymentDate,
          description: `Duplicate WPS Salary Transfer ${emp.employeeCode}`,
          debit: netSalary,
          credit: 0,
          balance: 950000,
          reference: `WPS-DUP-${month}-${emp.employeeCode}`,
          transactionType: 'Debit',
          matchStatus: 'Unmatched',
          matchedEntityType: null,
          matchedEntityId: null,
          matchConfidence: 0
        })

        await Alert.create({
          type: 'SalaryMismatch',
          severity: 'Critical',
          title: 'Duplicate Salary Payment Detected',
          message: `Multiple identical bank debits for employee ${emp.name} in ${month}. Expected 1 payment.`,
          entityType: 'BankTransaction',
          entityId: dupBankTx._id
        })

        await ReconciliationRecord.create({
          type: 'Salary',
          entityId: emp._id,
          bankTransactionId: dupBankTx._id,
          status: 'Duplicate',
          discrepancyAmount: netSalary,
          notes: 'Flagged by automated reconciliation. Pending investigation.',
          month
        })
      }

      totalSalariesCost += netSalary

      // 2. Timesheets & Invoices (Only for billable clients)
      if (emp.assignedClientId && emp.assignedProjectId) {
        const client = clients.find(c => c._id.toString() === emp.assignedClientId.toString())
        
        let rate = client.rateCard
        if (emp.employeeCode === 'BIM-EMP-00001') rate = 65 // Loss
        if (emp.employeeCode === 'BIM-EMP-00002') rate = 450 // Profitable
        
        const hours = 176
        const billableAmount = hours * rate
        totalInvoiced += billableAmount
        
        const ts = await Timesheet.create({
          employeeId: emp._id,
          clientId: emp.assignedClientId,
          projectId: emp.assignedProjectId,
          month,
          workingDays: 22,
          hours: hours,
          overtimeHours: 0,
          status: 'Approved',
          notes: `Standard hours ${month}`
        })

        const subtotal = billableAmount
        const vatAmount = parseFloat((subtotal * 0.05).toFixed(2)) // 5% VAT
        const invTotal = parseFloat((subtotal + vatAmount).toFixed(2))
        
        // Pick an invoice status
        let invStatus = mIdx === 2 ? (Math.random() > 0.5 ? 'Sent' : 'Overdue') : 'Paid'
        let paidAmount = invStatus === 'Paid' ? invTotal : 0

        // Create a PartiallyPaid scenario in October
        if (month === '2024-10' && emp.employeeCode === 'BIM-EMP-00003') {
          invStatus = 'PartiallyPaid'
          paidAmount = parseFloat((invTotal * 0.5).toFixed(2))
        }

        const dueDateObj = addDays(new Date(`${month}-05`), client.creditTerms)

        const inv = await Invoice.create({
          invoiceNumber: `INV-${year}-${String(invSeq++).padStart(5, '0')}`,
          clientId: client._id,
          employeeId: emp._id,
          projectId: emp.assignedProjectId,
          month,
          rate,
          hours,
          subtotal,
          vatAmount,
          totalAmount: invTotal,
          status: invStatus,
          timesheetId: ts._id,
          invoiceDate: new Date(`${month}-05`),
          dueDate: dueDateObj,
          paidAmount: paidAmount,
          paidDate: paidAmount > 0 ? addDays(dueDateObj, -5) : null
        })

        // Bank tx for Paid/Partially paid
        if (paidAmount > 0) {
          await BankTransaction.create({
            date: inv.paidDate,
            description: `Payment Recv ${client.name} ${inv.invoiceNumber}`,
            debit: 0,
            credit: paidAmount,
            balance: 1000000 + paidAmount,
            reference: `TRF-${inv.invoiceNumber}`,
            transactionType: 'Credit',
            matchStatus: 'Matched',
            matchedEntityType: 'Invoice',
            matchedEntityId: inv._id,
            matchConfidence: 95
          })
        }

        // Overdue Invoice Alert
        if (invStatus === 'Overdue' && mIdx === 1) { 
          await Alert.create({
            type: 'UnpaidInvoice', severity: 'High',
            title: `Critical Overdue Invoice: ${inv.invoiceNumber}`,
            message: `Invoice for ${client.name} is severely overdue. Cashflow impact: AED ${invTotal.toLocaleString()}.`,
            entityType: 'Invoice', entityId: inv._id
          })
        }

        // Negative Margin Alert
        if (month === '2024-11' && emp.employeeCode === 'BIM-EMP-00001') {
           await Alert.create({
             type: 'NegativeMargin', severity: 'High',
             title: `Negative Margin Alert: ${emp.name}`,
             message: `Employee costs (AED ${netSalary}) exceed billable revenue (AED ${billableAmount}). Margin is ${(100 * (billableAmount-netSalary)/billableAmount).toFixed(1)}%.`,
             entityType: 'Employee', entityId: emp._id
           })
        }
      }
    }

    // 3. Expenses & Cost Anomalies
    for (let c = 0; c < 5; c++) {
      const isAnomaly = month === '2024-11' && c === 0;
      const amt = isAnomaly ? randAmount(50000, 80000) : randAmount(500, 4000)
      const ex = await Expense.create({
        category: isAnomaly ? 'Marketing' : 'Software',
        description: isAnomaly ? 'Excessive Ad Spend Campaign' : 'SaaS Licenses',
        amount: amt,
        date: new Date(`${month}-15`),
        paidTo: isAnomaly ? 'Media Agency XYZ' : 'Microsoft',
        paymentMode: 'Bank',
        status: 'Approved',
        bankReference: `EXP-${month}-${c}`
      })

      await BankTransaction.create({
        date: ex.date,
        description: ex.description,
        debit: amt, credit: 0, balance: 800000,
        reference: ex.bankReference, transactionType: 'Debit',
        matchStatus: 'Matched', matchedEntityType: 'Expense', matchedEntityId: ex._id, matchConfidence: 90
      })

      if (isAnomaly) {
        await Alert.create({
          type: 'CostAnomaly', severity: 'Critical',
          title: 'Suspicious Expense Spike Detected',
          message: `Marketing expense of AED ${amt.toLocaleString()} is 900% above historical monthly average.`,
          entityType: 'Expense', entityId: ex._id
        })
      }
    }

    // Unmatched Bank Credit
    if (month === '2024-11') {
      const unk = await BankTransaction.create({
        date: new Date(`2024-11-20`),
        description: `INWARD REMITTANCE - UNKNOWN SUB`,
        debit: 0, credit: 25000, balance: 900000,
        reference: `REMIT-999999`, transactionType: 'Credit',
        matchStatus: 'Unmatched', matchedEntityType: null, matchedEntityId: null, matchConfidence: 0
      })
      await Alert.create({
        type: 'UnmatchedBank', severity: 'Medium',
        title: 'Unmatched Bank Credit',
        message: 'Inward remittance of AED 25,000 does not match any current open invoices.',
        entityType: 'BankTransaction', entityId: unk._id
      })
      await ReconciliationRecord.create({
        type: 'Invoice', entityId: clients[0]._id, bankTransactionId: unk._id, status: 'Missing',
        discrepancyAmount: 25000, notes: 'Awaiting client confirmation of payment details.', month
      })
    }
  }
  
  ok('Monthly data seeded successfully')
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  BIM Finance — Production Demo Seeder')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  try {
    await connect()
    await clearCollections()

    const users = await seedUsers()
    const admin = users[0]

    const clients = await seedClients()
    const projects = await seedProjects(clients)
    const employees = await seedEmployees(clients, projects)

    await seedTransactions(employees, clients, projects, admin._id)

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('  Seed completed successfully! Dashboard metrics populated.')
    console.log('\n  Test Login Credentials:')
    console.log('  Email   : admin@demo.com')
    console.log('  Email   : finance@demo.com')
    console.log('  Email   : hr@demo.com')
    console.log('  Password: Demo@123')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  } catch (err) {
    console.error('\n[SEED] ERROR:', err)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
  }
}

main()
