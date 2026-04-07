export interface AIProvider {
  generateInsight(prompt: string, data: unknown): Promise<AIResponse>
  detectAnomalies(data: unknown): Promise<AnomalyResult[]>
  fuzzyMatch(query: string, candidates: string[]): Promise<MatchResult[]>
  chat(messages: ChatMessage[]): Promise<string>
}

export interface AIResponse {
  insights: InsightItem[]
  summary: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  recommendations: string[]
  rawData: unknown
}

export interface AnomalyResult {
  type: string
  entity: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  expectedValue?: number
  actualValue?: number
  variance?: number
}

export interface MatchResult {
  candidate: string
  confidence: number
  reasoning: string
}

export interface InsightItem {
  category: string
  title: string
  value: string | number
  trend: 'up' | 'down' | 'neutral'
  alert: boolean
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}
