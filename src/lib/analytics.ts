// ── Real token usage analytics ────────────────────────────────────────────────
// Storage: IndexedDB via Dexie — no PocketBase, no localStorage cap

import { db } from './db'
import type { AnalyticsRecord } from './db'

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

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function dispatch(): void {
  window.dispatchEvent(new CustomEvent('agentis_analytics_update'))
}

// ── One-time migration from localStorage ─────────────────────────────────────

let _migrated = false

async function ensureMigrated(): Promise<void> {
  if (_migrated) return
  _migrated = true
  try {
    const raw = localStorage.getItem('agentis_analytics')
    if (!raw) return
    const entries = JSON.parse(raw) as Array<{
      id?: string; model: string; persona: string; task: string
      inputTokens: number; outputTokens: number; cost: number; stepCount: number; ts: number
    }>
    if (!entries.length) return
    const count = await db.analytics.count()
    if (count > 0) return
    const records: AnalyticsRecord[] = entries.map(e => ({
      id: e.id ?? newId(),
      model: e.model,
      persona: e.persona,
      task: e.task,
      inputTokens: e.inputTokens,
      outputTokens: e.outputTokens,
      cost: e.cost,
      stepCount: e.stepCount,
      ts: e.ts,
    }))
    await db.analytics.bulkPut(records)
    console.log(`[Analytics] Migrated ${records.length} records from localStorage → IndexedDB`)
  } catch (err) {
    console.warn('[Analytics] Migration failed:', err)
  }
}

// ── API ───────────────────────────────────────────────────────────────────────

export function addUsageRecord(record: Omit<UsageRecord, 'id'>): void {
  const full: AnalyticsRecord = { ...record, id: newId() }
  db.analytics.add(full).then(() => dispatch()).catch(() => { /* storage error */ })
}

export async function loadUsageRecords(): Promise<UsageRecord[]> {
  await ensureMigrated()
  const records = await db.analytics.orderBy('ts').toArray()
  return records as UsageRecord[]
}

export async function clearUsageRecords(): Promise<void> {
  await db.analytics.clear()
  dispatch()
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
