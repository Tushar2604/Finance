# BIM Finance

AI-powered financial reconciliation SaaS platform for staffing companies.

## Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, Shadcn UI, Recharts, TanStack Query
- **Backend**: Next.js API Routes, Node.js 
- **Database**: MongoDB (Mongoose)

## Core Features
1. **Financial Overview Dashboard**: KPI monitoring and monthly revenue trends reporting.
2. **Reconciliation Engine**: Reconciles Salaries, Invoices, and Expenses against Bank Statements, utilizing standard matching rules and fuzzy fallback.
3. **Automated Bank Statement Parsing**: CSV drag-and-drop parsing routing directly into the ledger. 
4. **WPS Payroll System**: Automatic net salary calculation based on timesheet allowances, and generation of WPS `.csv` formats.
5. **AI Insights & Alerts**: Background anomaly detection picking up unmatched deposits, double-paid salaries, and leaking margins.
6. **UAE VAT Reporting**: Live aggregation of invoice outputs and input taxation.

## Setup Instructions

### 1. Requirements
- Node.js 20+
- MongoDB instance (Atlas or Local)

### 2. Environment Variables
Create a `.env.local` file in the root based on `.env.example`:
```env
# MongoDB Connection String
MONGODB_URI=mongodb://127.0.0.1:27017/bim-finance

# JWT Secret
JWT_SECRET=super-secret-key-1234
JWT_EXPIRES_IN=1d

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OpenAI (For AI Insights)
OPENAI_API_KEY=sk-xxxxxx
```

### 3. Installation
```bash
npm install
```

### 4. Database Seeding
To populate your MongoDB cluster with mock staffing data:
```bash
npm run seed
```
This script cleanly wipes existing tables and establishes interconnected data (Clients > Projects > Employees > Invoices > Salaries).
A default **Admin** user is created:
- Email: `tushar@example.com`
- Password: `Password123!`

### 5. Running the Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3000`. 
Log in with the local seeded Admin credentials to access the Dashboard.

## Architecture Guidelines for Developers
- `/app/api`: Follows RESTful paradigms. Includes Role-Based Access Control logic via the `withAuth` wrapper.
- `/lib/services`: Clean service methods. API routes should not include direct DB aggregation logic.
- `/lib/db/models`: Defining robust Mongoose Schemas and pre-save hooks (e.g. dynamic net salary computations).
- `/lib/hooks`: Utilizes `useQuery` mapped tightly to standard generic hooks enforcing cache re-validation periods.
