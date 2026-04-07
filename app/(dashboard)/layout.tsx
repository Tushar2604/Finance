import React from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main content area — offset by sidebar width */}
      <div className="ml-64 flex flex-col min-h-screen transition-all duration-300">
        {/* Fixed header */}
        <Header />

        {/* Scrollable page content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
