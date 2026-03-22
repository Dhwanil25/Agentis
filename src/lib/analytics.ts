// ── Real token usage analytics ────────────────────────────────────────────────
// Write: localStorage (instant) + PocketBase background sync

import { isPbEnabled, pbAddAnalytics } from './pb'

export interface UsageRecord {
  id: string
  ts: number
  model: string
  persona: string
  task: string
  inputTokens: number
  outputTokens: number
  cost: number
  stepCount: number
}

export interface AnalyticsSummary {
  totalTokens: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCost: number
  apiCalls: number
  byModel: Record<string, { inputTokens: number; outputTokens: number; cost: number; calls: number }>
  byPersona: Record<string, { tokens: number; cost: number; calls: number }>
  daily: { date: string; tokens: number; cost: number; calls: number }[]
}

const STORAGE_KEY = 'agentis_analytics'

// USD per million tokens
const MODEL_PRICING: Record<string, { inputPerM: number; outputPerM: number }> = {
  'claude-sonnet-4-20250514':  { inputPerM: 3.0,   outputPerM: 15.0  },
  'claude-sonnet-4-6':         { inputPerM: 3.0,   outputPerM: 15.0  },
  'claude-haiku-4-5-20251001': { inputPerM: 0.8,   outputPerM: 4.0   },
  'claude-haiku-4-5':          { inputPerM: 0.8,   outputPerM: 4.0   },
  'claude-opus-4-6':           { inputPerM: 15.0,  outputPerM: 75.0  },
  'gpt-4o':                    { inputPerM: 2.5,   outputPerM: 10.0  },
  'gpt-4o-mini':               { inputPerM: 0.15,  outputPerM: 0.60  },
  'gemini-1.5-pro':            { inputPerM: 1.25,  outputPerM: 5.0   },
}

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const p = MODEL_PRICING[model] ?? { inputPerM: 3.0, outputPerM: 15.0 }
  return (inputTokens / 1_000_000) * p.inputPerM + (outputTokens / 1_000_000) * p.outputPerM
}

export function addUsageRecord(record: Omit<UsageRecord, 'id'>): void {
  try {
    const records = loadUsageRecords()
    records.push({ ...record, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(-1000)))
    window.dispatchEvent(new CustomEvent('agentis_analytics_update'))
  } catch { /* storage full */ }

  if (isPbEnabled()) {
    pbAddAnalytics({
      model: record.model,
      persona: record.persona,
      task: record.task,
      input_tokens: record.inputTokens,
      output_tokens: record.outputTokens,
      cost: record.cost,
      step_count: record.stepCount,
      ts: record.ts,
    }).catch(() => { /* silent */ })
  }
}

export function loadUsageRecords(): UsageRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as UsageRecord[]) : []
  } catch { return [] }
}

export function clearUsageRecords(): void {
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new CustomEvent('agentis_analytics_update'))
}

export function getAnalyticsSummary(records: UsageRecord[]): AnalyticsSummary {
  const s: AnalyticsSummary = {
    totalTokens: 0, totalInputTokens: 0, totalOutputTokens: 0,
    totalCost: 0, apiCalls: records.length,
    byModel: {}, byPersona: {}, daily: [],
  }
  const dailyMap: Record<string, { tokens: number; cost: number; calls: number }> = {}

  for (const r of records) {
    s.totalInputTokens  += r.inputTokens
    s.totalOutputTokens += r.outputTokens
    s.totalTokens       += r.inputTokens + r.outputTokens
    s.totalCost         += r.cost

    if (!s.byModel[r.model])
      s.byModel[r.model] = { inputTokens: 0, outputTokens: 0, cost: 0, calls: 0 }
    s.byModel[r.model].inputTokens  += r.inputTokens
    s.byModel[r.model].outputTokens += r.outputTokens
    s.byModel[r.model].cost         += r.cost
    s.byModel[r.model].calls++

    if (!s.byPersona[r.persona])
      s.byPersona[r.persona] = { tokens: 0, cost: 0, calls: 0 }
    s.byPersona[r.persona].tokens += r.inputTokens + r.outputTokens
    s.byPersona[r.persona].cost   += r.cost
    s.byPersona[r.persona].calls++

    const date = new Date(r.ts).toISOString().split('T')[0]
    if (!dailyMap[date]) dailyMap[date] = { tokens: 0, cost: 0, calls: 0 }
    dailyMap[date].tokens += r.inputTokens + r.outputTokens
    dailyMap[date].cost   += r.cost
    dailyMap[date].calls++
  }

  s.daily = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, d]) => ({ date, ...d }))

  return s
}

export function formatCost(usd: number): string {
  if (usd < 0.001) return '$0.00'
  if (usd < 1)     return `$${usd.toFixed(4)}`
  return `$${usd.toFixed(2)}`
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}
