import OpenAI from 'openai'
import type {
  AIProvider,
  AIResponse,
  AnomalyResult,
  MatchResult,
  ChatMessage,
  InsightItem,
} from './provider.interface'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
const MAX_RETRIES = 1

// In-memory rate limiting: userId -> { count, resetAt }
interface RateLimitEntry {
  count: number
  resetAt: number
}
const rateLimitMap = new Map<string, RateLimitEntry>()
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60 * 1000

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }

  entry.count++
  return true
}

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  return new OpenAI({ apiKey })
}

function mockAIResponse(data: unknown): AIResponse {
  return {
    insights: [
      {
        category: 'System',
        title: 'AI unavailable',
        value: 'OpenAI API key not configured',
        trend: 'neutral',
        alert: false,
      },
    ],
    summary:
      'AI insights are unavailable because OPENAI_API_KEY is not set. Please configure the API key to enable AI features.',
    severity: 'low',
    recommendations: ['Configure OPENAI_API_KEY environment variable to enable AI insights'],
    rawData: data,
  }
}

function mockAnomalyResults(): AnomalyResult[] {
  return [
    {
      type: 'SystemNotice',
      entity: 'system',
      description: 'AI anomaly detection unavailable — OPENAI_API_KEY not set',
      severity: 'low',
    },
  ]
}

function mockMatchResults(candidates: string[]): MatchResult[] {
  return candidates.map((c) => ({
    candidate: c,
    confidence: 0,
    reasoning: 'AI matching unavailable — OPENAI_API_KEY not set',
  }))
}

async function callWithRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  try {
    return await fn()
  } catch (error: unknown) {
    const openAIError = error as { status?: number; message?: string }
    if (openAIError?.status === 429 && retries > 0) {
      // Wait 2 seconds before retry on rate limit
      await new Promise((resolve) => setTimeout(resolve, 2000))
      return callWithRetry(fn, retries - 1)
    }
    throw error
  }
}

export class OpenAIProvider implements AIProvider {
  private client: OpenAI | null
  private userId: string

  constructor(userId = 'anonymous') {
    this.client = getClient()
    this.userId = userId
  }

  async generateInsight(prompt: string, data: unknown): Promise<AIResponse> {
    if (!this.client) return mockAIResponse(data)
    if (!checkRateLimit(this.userId)) {
      return {
        ...mockAIResponse(data),
        summary: 'Rate limit exceeded. Please wait before making more AI requests.',
      }
    }

    try {
      const systemPrompt = `You are a financial analyst for a UAE-based staffing company.
Analyze the provided financial data and return a structured JSON response with the following shape:
{
  "insights": [{ "category": string, "title": string, "value": string|number, "trend": "up"|"down"|"neutral", "alert": boolean }],
  "summary": string,
  "severity": "low"|"medium"|"high"|"critical",
  "recommendations": string[]
}
Focus on: profitability, cash flow, cost anomalies, revenue gaps, and employee/client margins.
Amounts are in AED (UAE Dirham). Be concise and actionable.`

      const response = await callWithRetry(() =>
        this.client!.chat.completions.create({
          model: MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `${prompt}\n\nData:\n${JSON.stringify(data, null, 2)}` },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 2000,
        })
      )

      const content = response.choices[0]?.message?.content ?? '{}'
      const parsed = JSON.parse(content)

      return {
        insights: parsed.insights ?? [],
        summary: parsed.summary ?? '',
        severity: parsed.severity ?? 'low',
        recommendations: parsed.recommendations ?? [],
        rawData: data,
      }
    } catch (error) {
      console.error('[OpenAIProvider.generateInsight]', error)
      return mockAIResponse(data)
    }
  }

  async detectAnomalies(data: unknown): Promise<AnomalyResult[]> {
    if (!this.client) return mockAnomalyResults()
    if (!checkRateLimit(this.userId)) return mockAnomalyResults()

    try {
      const systemPrompt = `You are a financial fraud and anomaly detection system for a UAE staffing company.
Analyze the provided financial data and identify anomalies, inconsistencies, and suspicious patterns.
Return a JSON array of anomaly objects with shape:
[{ "type": string, "entity": string, "description": string, "severity": "low"|"medium"|"high"|"critical", "expectedValue"?: number, "actualValue"?: number, "variance"?: number }]
Focus on: duplicate payments, unusual amounts, missing records, pattern deviations, and regulatory concerns.`

      const response = await callWithRetry(() =>
        this.client!.chat.completions.create({
          model: MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `Detect anomalies in this financial data:\n${JSON.stringify(data, null, 2)}`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
          max_tokens: 2000,
        })
      )

      const content = response.choices[0]?.message?.content ?? '{"anomalies":[]}'
      const parsed = JSON.parse(content)

      // Support both array and { anomalies: [] } shaped responses
      const results: AnomalyResult[] = Array.isArray(parsed)
        ? parsed
        : (parsed.anomalies ?? [])

      return results
    } catch (error) {
      console.error('[OpenAIProvider.detectAnomalies]', error)
      return mockAnomalyResults()
    }
  }

  async fuzzyMatch(query: string, candidates: string[]): Promise<MatchResult[]> {
    if (!this.client) return mockMatchResults(candidates)
    if (!checkRateLimit(this.userId)) return mockMatchResults(candidates)

    if (candidates.length === 0) return []

    try {
      const systemPrompt = `You are a financial record matching system.
Given a query string (bank transaction description or reference) and a list of candidate strings (invoice numbers, employee names, expense descriptions),
score each candidate's match confidence from 0-100 and provide brief reasoning.
Return JSON array: [{ "candidate": string, "confidence": number, "reasoning": string }]
Consider: partial name matches, reference number patterns, amount proximity indicators, and common banking abbreviations.`

      const response = await callWithRetry(() =>
        this.client!.chat.completions.create({
          model: MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `Query: "${query}"\n\nCandidates:\n${candidates.map((c, i) => `${i + 1}. ${c}`).join('\n')}`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 1500,
        })
      )

      const content = response.choices[0]?.message?.content ?? '{"matches":[]}'
      const parsed = JSON.parse(content)
      const results: MatchResult[] = Array.isArray(parsed)
        ? parsed
        : (parsed.matches ?? parsed.results ?? [])

      return results
    } catch (error) {
      console.error('[OpenAIProvider.fuzzyMatch]', error)
      return mockMatchResults(candidates)
    }
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    if (!this.client) {
      return 'AI chat is unavailable because OPENAI_API_KEY is not configured.'
    }
    if (!checkRateLimit(this.userId)) {
      return 'Rate limit exceeded. Please wait before sending more messages.'
    }

    try {
      const response = await callWithRetry(() =>
        this.client!.chat.completions.create({
          model: MODEL,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          temperature: 0.4,
          max_tokens: 1500,
        })
      )

      return response.choices[0]?.message?.content ?? 'No response generated.'
    } catch (error) {
      console.error('[OpenAIProvider.chat]', error)
      return 'An error occurred while processing your request. Please try again.'
    }
  }
}

export function setRateLimitUserId(provider: OpenAIProvider, userId: string): void {
  // Allow updating userId post-construction for rate limiting
  ;(provider as unknown as { userId: string }).userId = userId
}
