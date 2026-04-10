/**
 * BIM Finance — Selective Data Cleaner
 * Removes all seeded data from Employee, Timesheet, and Salary collections.
 * Run with: npx ts-node -r tsconfig-paths/register scripts/clear-data.ts
 */

import mongoose from 'mongoose'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

import Employee from '../lib/db/models/Employee'
import Timesheet from '../lib/db/models/Timesheet'
import Salary from '../lib/db/models/Salary'

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/bim-finance'

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  BIM Finance — Clear Employee / Timesheet / Salary Data')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  await mongoose.connect(MONGODB_URI, { bufferCommands: false })
  console.log('Connected to MongoDB')

  const [empRes, tsRes, salRes] = await Promise.all([
    Employee.deleteMany({}),
    Timesheet.deleteMany({}),
    Salary.deleteMany({}),
  ])

  console.log(`  ✓ Employees deleted : ${empRes.deletedCount}`)
  console.log(`  ✓ Timesheets deleted: ${tsRes.deletedCount}`)
  console.log(`  ✓ Salaries deleted  : ${salRes.deletedCount}`)

  await mongoose.disconnect()
  console.log('\nDone.\n')
}

main().catch(err => { console.error(err); process.exit(1) })
