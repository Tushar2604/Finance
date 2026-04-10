'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import apiClient from '@/lib/api'
import {
  Sparkles, Send, User, Bot, ChevronDown,
  TrendingUp, AlertCircle, FileText, Users, Receipt, BarChart3,
} from 'lucide-react'

type QueryType =
  | 'profit_summary'
  | 'loss_making_employees'
  | 'unpaid_invoices'
  | 'top_clients'
  | 'expense_summary'
  | 'general'

interface Message {
  role: 'user' | 'assistant'
  content: string
  queryType?: QueryType
  timestamp: Date
  loading?: boolean
}

const queryTypeConfig: Record<QueryType, { label: string; icon: React.ReactNode; color: string }> = {
  profit_summary:        { label: 'P&L Summary',       icon: <TrendingUp className="h-3 w-3" />,   color: 'bg-emerald-100 text-emerald-700' },
  loss_making_employees: { label: 'Loss-Making Staff',  icon: <AlertCircle className="h-3 w-3" />,  color: 'bg-rose-100 text-rose-700' },
  unpaid_invoices:       { label: 'Unpaid Invoices',    icon: <FileText className="h-3 w-3" />,     color: 'bg-amber-100 text-amber-700' },
  top_clients:           { label: 'Top Clients',        icon: <Users className="h-3 w-3" />,        color: 'bg-blue-100 text-blue-700' },
  expense_summary:       { label: 'Expense Analysis',   icon: <Receipt className="h-3 w-3" />,      color: 'bg-purple-100 text-purple-700' },
  general:               { label: 'General Query',      icon: <BarChart3 className="h-3 w-3" />,    color: 'bg-slate-100 text-slate-600' },
}

const SUGGESTED_QUERIES = [
  'What is our profit margin this month?',
  'Which employees are loss-making?',
  'Show me all unpaid invoices',
  'Who are our top clients by revenue?',
  'Summarize this month\'s expenses by category',
]

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

interface GeneratedInsight {
  type?: string
  module?: string
  message?: string
  severity?: string
  content?: string
  title?: string
}

function GenerateInsightsPanel() {
  const [insightType, setInsightType] = useState('monthly')
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState<GeneratedInsight | null>(null)
  const [error, setError] = useState('')

  const severityClass = (s?: string) => {
    if (s === 'Critical') return 'bg-red-500/20 text-red-400 border-red-500/30'
    if (s === 'High') return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    if (s === 'Medium') return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
  }

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    setInsights(null)
    try {
      const { data } = await apiClient.post<any>('/ai/generate-insights', { type: insightType })
      setInsights(data.data)
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Failed to generate insights. Check your OpenAI API key.')
    } finally {
      setLoading(false)
    }
  }

  const typeOptions = [
    { value: 'monthly', label: 'Monthly Summary' },
    { value: 'revenue-leakage', label: 'Revenue Leakage' },
    { value: 'employee-performance', label: 'Employee Performance' },
    { value: 'cash-flow', label: 'Cash Flow' },
  ]

  return (
    <div className="bg-violet-950/30 border border-violet-800/40 rounded-xl p-4 mb-4 shrink-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-white text-sm font-semibold">Generate AI Insights</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={insightType}
            onChange={(e) => setInsightType(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
          >
            {typeOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={loading}
            className="bg-violet-600 hover:bg-violet-700 text-white text-xs gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {loading ? 'Generating…' : 'Generate'}
          </Button>
        </div>
      </div>

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

      {insights && (
        <div className="bg-slate-900/60 rounded-lg p-3 mt-2 space-y-2">
          {insights.severity && (
            <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border ${severityClass(insights.severity)}`}>
              {insights.severity}
            </span>
          )}
          {insights.title && <p className="text-white font-semibold text-sm">{insights.title}</p>}
          {(insights.message ?? insights.content) && (
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
              {insights.message ?? insights.content}
            </p>
          )}
          {/* Handle array of insights */}
          {Array.isArray(insights) && (insights as GeneratedInsight[]).map((ins, i) => (
            <div key={i} className="border-t border-slate-700/40 pt-2 mt-2">
              {ins.severity && (
                <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border mb-1 ${severityClass(ins.severity)}`}>
                  {ins.severity} · {ins.module}
                </span>
              )}
              <p className="text-slate-300 text-sm leading-relaxed">{ins.message ?? ins.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AIInsightsPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your BIM Finance Assistant. Ask me anything about your financial data — profit margins, outstanding invoices, employee costs, top clients, or expense breakdowns.',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendQuery = async (query: string) => {
    if (!query.trim() || loading) return

    const userMsg: Message = { role: 'user', content: query.trim(), timestamp: new Date() }
    const loadingMsg: Message = { role: 'assistant', content: '', timestamp: new Date(), loading: true }

    setMessages(prev => [...prev, userMsg, loadingMsg])
    setInput('')
    setLoading(true)

    try {
      const { data } = await apiClient.post<any>('/ai/chat', { query: query.trim() })
      const result = data.data

      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          role: 'assistant',
          content: result.answer,
          queryType: result.queryType,
          timestamp: new Date(),
        },
      ])
    } catch (err: unknown) {
      const errMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Something went wrong. Please try again.'
      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          role: 'assistant',
          content: `Sorry, I couldn't process that query. ${errMsg}`,
          timestamp: new Date(),
        },
      ])
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendQuery(input)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] space-y-0 animate-in fade-in">
      {/* Header */}
      <div className="flex justify-between items-center bg-white px-6 py-4 rounded-xl shadow-sm border mb-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-violet-600" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600">
              AI Finance Assistant
            </span>
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">Ask questions about profit, expenses, invoices, and more in plain English.</p>
        </div>
        <Badge variant="outline" className="text-violet-600 border-violet-300 gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
          Live
        </Badge>
      </div>

      <GenerateInsightsPanel />

      {/* Suggested queries */}
      <div className="flex gap-2 flex-wrap mb-3 shrink-0">
        {SUGGESTED_QUERIES.map(q => (
          <button
            key={q}
            onClick={() => sendQuery(q)}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-full border bg-white text-slate-600 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 transition-colors disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat window */}
      <Card className="flex-1 overflow-hidden border shadow-sm flex flex-col min-h-0">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}

              <div className={`max-w-[75%] space-y-1 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                {msg.loading ? (
                  <div className="bg-white border rounded-2xl rounded-tl-sm px-4 py-3 space-y-2 min-w-[120px]">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ) : (
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-tr-sm'
                        : 'bg-white border rounded-tl-sm text-slate-800'
                    }`}
                  >
                    {msg.content}
                  </div>
                )}
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs text-muted-foreground">{formatTime(msg.timestamp)}</span>
                  {msg.queryType && queryTypeConfig[msg.queryType] && (
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${queryTypeConfig[msg.queryType].color}`}>
                      {queryTypeConfig[msg.queryType].icon}
                      {queryTypeConfig[msg.queryType].label}
                    </span>
                  )}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-4 w-4 text-slate-600" />
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </CardContent>

        {/* Input area */}
        <div className="border-t bg-white p-4 shrink-0">
          <div className="flex gap-3 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about profit margins, unpaid invoices, top clients... (Enter to send)"
              className="resize-none min-h-[44px] max-h-32 text-sm"
              rows={1}
              disabled={loading}
            />
            <Button
              onClick={() => sendQuery(input)}
              disabled={!input.trim() || loading}
              className="bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shrink-0 h-[44px] w-[44px] p-0"
            >
              {loading ? (
                <ChevronDown className="h-4 w-4 animate-bounce" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Shift+Enter for new line · Enter to send</p>
        </div>
      </Card>
    </div>
  )
}
