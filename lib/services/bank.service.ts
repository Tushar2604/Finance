import dbConnect from '@/lib/db/connection'
import BankTransaction, { IBankTransaction } from '@/lib/db/models/BankTransaction'
import UploadBatch from '@/lib/db/models/UploadBatch'
import AuditLog from '@/lib/db/models/AuditLog'
import mongoose from 'mongoose'
import { paginate, buildPaginationMeta } from '@/lib/utils'
import { parse } from 'csv-parse/sync'

export interface BankTransactionFilters {
  matchStatus?: 'Matched' | 'Unmatched' | 'Partial'
  transactionType?: 'Debit' | 'Credit'
  uploadBatchId?: string
  description?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

export interface PaginatedBankTransactions {
  data: IBankTransaction[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export async function getBankTransactions(filters: BankTransactionFilters): Promise<PaginatedBankTransactions> {
  await dbConnect()

  const { matchStatus, transactionType, uploadBatchId, description, dateFrom, dateTo, page = 1, limit = 50 } = filters
  const { skip, limit: safeLimit } = paginate(page, limit)

  const query: mongoose.FilterQuery<IBankTransaction> = {}

  if (matchStatus) query.matchStatus = matchStatus
  if (transactionType) query.transactionType = transactionType
  if (uploadBatchId && mongoose.Types.ObjectId.isValid(uploadBatchId)) {
    query.uploadBatchId = new mongoose.Types.ObjectId(uploadBatchId)
  }
  if (description) query.description = { $regex: description, $options: 'i' }
  if (dateFrom || dateTo) {
    query.date = {}
    if (dateFrom) query.date.$gte = new Date(dateFrom)
    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59, 999)
      query.date.$lte = end
    }
  }

  const [data, total] = await Promise.all([
    BankTransaction.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    BankTransaction.countDocuments(query),
  ])

  return {
    data: data as unknown as IBankTransaction[],
    pagination: buildPaginationMeta(total, page, safeLimit),
  }
}

export async function uploadBankStatement(
  fileBuffer: Buffer,
  filename: string,
  userId: string,
  batchName?: string
): Promise<{ batchId: string; count: number }> {
  await dbConnect()

  const session = await mongoose.startSession()
  let batchIdStr = ''
  let finalCount = 0

  await session.withTransaction(async () => {
    // Determine file type and parse
    let records: any[] = []
    
    // We expect a CSV file, but can easily be extended to XLSX via a different parser
    const csvContent = fileBuffer.toString('utf-8')
    try {
      records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      })
    } catch (err: any) {
       throw Object.assign(new Error('Failed to parse CSV file: ' + err.message), { statusCode: 400 })
    }

    if (records.length === 0) {
       throw Object.assign(new Error('The uploaded CSV file is empty or invalid.'), { statusCode: 400 })
    }

    // 1. Create UploadBatch
    const batch = await UploadBatch.create([{
      fileName: filename,
      fileType: 'text/csv',
      originalName: batchName || filename,
      uploadedBy: new mongoose.Types.ObjectId(userId),
      recordCount: records.length,
      status: 'Processing',
    }], { session })

    const batchId = batch[0]._id
    batchIdStr = batchId.toString()

    // 2. Map CSV records to IBankTransaction format
    const transactions = records.map((r) => {
      // Flexible column mapping — handles common bank CSV formats
      const dateStr = r['Date'] || r['date'] || r['Transaction Date'] || r['Value Date'] || r['Txn Date'] || new Date().toISOString()
      const desc = r['Description'] || r['description'] || r['Narration'] || r['narration'] || r['Details'] || r['Particulars'] || 'No Description'
      const reference = r['Reference'] || r['reference'] || r['Ref No'] || r['Reference No'] || r['Cheque No'] || r['Transaction ID'] || r['Txn ID'] || ''
      const counterparty = r['Counterparty'] || r['counterparty'] || r['Beneficiary'] || r['Payee'] || r['Vendor'] || ''
      const debitRaw = r['Debit'] || r['debit'] || r['Withdrawal'] || r['withdrawal'] || r['Dr'] || r['Debit Amount'] || '0'
      const creditRaw = r['Credit'] || r['credit'] || r['Deposit'] || r['deposit'] || r['Cr'] || r['Credit Amount'] || '0'
      const balanceRaw = r['Balance'] || r['balance'] || r['Running Balance'] || r['Closing Balance'] || '0'
      const amountRaw = r['Amount'] || r['amount'] || ''

      let debit = Math.abs(parseFloat(debitRaw.replace(/[^0-9.-]+/g, '')) || 0)
      let credit = Math.abs(parseFloat(creditRaw.replace(/[^0-9.-]+/g, '')) || 0)
      const balance = parseFloat(balanceRaw.replace(/[^0-9.-]+/g, '')) || 0

      // If CSV has single Amount column (negative = debit, positive = credit)
      if (!debit && !credit && amountRaw) {
        const amt = parseFloat(amountRaw.replace(/[^0-9.-]+/g, '')) || 0
        if (amt < 0) debit = Math.abs(amt)
        else credit = amt
      }

      const transactionType = credit > 0 ? 'Credit' : 'Debit'

      return {
        date: new Date(dateStr),
        description: desc,
        counterparty,
        reference,
        debit,
        credit,
        balance,
        transactionType,
        matchStatus: 'Unmatched',
        uploadBatchId: batchId
      }
    })

    // 3. Bulk Insert
    const inserted = await BankTransaction.insertMany(transactions, { session })
    finalCount = inserted.length

    // Update batch status
    await UploadBatch.findByIdAndUpdate(batchId, { 
      status: 'Completed',
      recordCount: finalCount
    }, { session })

    await AuditLog.create([{
      userId: new mongoose.Types.ObjectId(userId),
      action: 'SYSTEM',
      entityType: 'UploadBatch',
      entityId: batchId,
      previousData: null,
      newData: { filename, count: finalCount },
    }], { session })
  })

  session.endSession()
  return { batchId: batchIdStr, count: finalCount }
}

export async function deleteBankTransaction(id: string, userId: string): Promise<void> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid transaction ID'), { statusCode: 400 })
  }

  const existing = await BankTransaction.findById(id)
  if (!existing) {
    throw Object.assign(new Error('Transaction not found'), { statusCode: 404 })
  }

  if (existing.matchStatus !== 'Unmatched') {
    throw Object.assign(new Error('Cannot delete a matched transaction'), { statusCode: 400 })
  }

  const previousData = existing.toObject()
  await BankTransaction.findByIdAndDelete(id)

  await AuditLog.create({
    userId: new mongoose.Types.ObjectId(userId),
    action: 'DELETE',
    entityType: 'BankTransaction',
    entityId: new mongoose.Types.ObjectId(id),
    previousData,
    newData: null,
  })
}
