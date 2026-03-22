// ── PocketBase client singleton ───────────────────────────────────────────────
// Dual-write strategy:
//   Reads  → PocketBase (fallback: localStorage)
//   Writes → localStorage immediately + PocketBase in background
// This keeps the UI instant while persisting to the cloud.

import PocketBase from 'pocketbase'

export const PB_URL_KEY = 'agentis_pb_url'

let _client: PocketBase | null = null

export function getPbUrl(): string {
  return localStorage.getItem(PB_URL_KEY) ?? ''
}

export function setPbUrl(url: string): void {
  localStorage.setItem(PB_URL_KEY, url.replace(/\/$/, ''))
  _client = null
}

export function pb(): PocketBase | null {
  const url = getPbUrl()
  if (!url) return null
  if (!_client) _client = new PocketBase(url)
  return _client
}

export function isPbEnabled(): boolean {
  return !!getPbUrl()
}

// ── Health check ──────────────────────────────────────────────────────────────

export async function checkPbHealth(): Promise<{ ok: boolean; version: string }> {
  const client = pb()
  if (!client) return { ok: false, version: '' }
  try {
    const res = await client.health.check()
    return { ok: true, version: (res as { version?: string }).version ?? 'unknown' }
  } catch {
    return { ok: false, version: '' }
  }
}

// ── Collection names ──────────────────────────────────────────────────────────
// Create these collections in your PocketBase admin UI (/_/)

export const COLLECTIONS = {
  memories:  'memories',
  analytics: 'analytics',
  sessions:  'sessions',
} as const

// ── Memory records ────────────────────────────────────────────────────────────

export interface PbMemory {
  id: string
  agent_id: string
  key: string
  value: string
  source: 'auto' | 'manual'
  ts: number
}

export async function pbLoadMemories(): Promise<PbMemory[]> {
  const client = pb()
  if (!client) return []
  try {
    const records = await client.collection(COLLECTIONS.memories).getFullList({
      sort: '-ts',
    })
    return records as unknown as PbMemory[]
  } catch { return [] }
}

export async function pbUpsertMemory(entry: Omit<PbMemory, 'id'>): Promise<void> {
  const client = pb()
  if (!client) return
  try {
    // Try to find existing record with same agent_id + key
    const existing = await client.collection(COLLECTIONS.memories).getFirstListItem(
      `agent_id="${entry.agent_id}" && key="${entry.key}"`,
    ).catch(() => null)

    if (existing) {
      await client.collection(COLLECTIONS.memories).update(existing.id, {
        value: entry.value,
        ts: entry.ts,
        source: entry.source,
      })
    } else {
      await client.collection(COLLECTIONS.memories).create(entry)
    }
  } catch { /* silent — localStorage already has it */ }
}

export async function pbDeleteMemory(id: string): Promise<void> {
  const client = pb()
  if (!client) return
  try {
    await client.collection(COLLECTIONS.memories).delete(id)
  } catch { /* silent */ }
}

export async function pbDeleteAgentMemories(agentId: string): Promise<void> {
  const client = pb()
  if (!client) return
  try {
    const records = await client.collection(COLLECTIONS.memories).getFullList({
      filter: `agent_id="${agentId}"`,
    })
    await Promise.all(records.map(r => client.collection(COLLECTIONS.memories).delete(r.id)))
  } catch { /* silent */ }
}

// ── Analytics records ─────────────────────────────────────────────────────────

export interface PbAnalytics {
  id: string
  model: string
  persona: string
  task: string
  input_tokens: number
  output_tokens: number
  cost: number
  step_count: number
  ts: number
}

export async function pbAddAnalytics(record: Omit<PbAnalytics, 'id'>): Promise<void> {
  const client = pb()
  if (!client) return
  try {
    await client.collection(COLLECTIONS.analytics).create(record)
  } catch { /* silent */ }
}

export async function pbLoadAnalytics(): Promise<PbAnalytics[]> {
  const client = pb()
  if (!client) return []
  try {
    const records = await client.collection(COLLECTIONS.analytics).getFullList({
      sort: '-ts',
    })
    return records as unknown as PbAnalytics[]
  } catch { return [] }
}

// ── Session records ───────────────────────────────────────────────────────────

export interface PbSession {
  id: string
  persona: string
  task: string
  mode: string
  status: string
  ts: number
}

export async function pbAddSession(entry: Omit<PbSession, 'id'>): Promise<void> {
  const client = pb()
  if (!client) return
  try {
    await client.collection(COLLECTIONS.sessions).create(entry)
  } catch { /* silent */ }
}

export async function pbLoadSessions(): Promise<PbSession[]> {
  const client = pb()
  if (!client) return []
  try {
    const records = await client.collection(COLLECTIONS.sessions).getFullList({
      sort: '-ts',
    })
    return records as unknown as PbSession[]
  } catch { return [] }
}

// ── Sync: import localStorage data into PocketBase (run once on setup) ────────

export async function syncLocalStorageToPb(): Promise<{ memories: number; analytics: number; sessions: number }> {
  const client = pb()
  if (!client) return { memories: 0, analytics: 0, sessions: 0 }

  let memories = 0, analytics = 0, sessions = 0

  try {
    // Memories
    const rawMem = localStorage.getItem('agentis_memory')
    if (rawMem) {
      const entries = JSON.parse(rawMem) as Array<{
        id: string; agentId: string; key: string; value: string; source: string; ts: number
      }>
      for (const e of entries) {
        await pbUpsertMemory({ agent_id: e.agentId, key: e.key, value: e.value, source: e.source as 'auto' | 'manual', ts: e.ts })
        memories++
      }
    }

    // Analytics
    const rawAn = localStorage.getItem('agentis_analytics')
    if (rawAn) {
      const records = JSON.parse(rawAn) as Array<{
        model: string; persona: string; task: string; inputTokens: number; outputTokens: number; cost: number; stepCount: number; ts: number
      }>
      for (const r of records) {
        await pbAddAnalytics({ model: r.model, persona: r.persona, task: r.task, input_tokens: r.inputTokens, output_tokens: r.outputTokens, cost: r.cost, step_count: r.stepCount, ts: r.ts })
        analytics++
      }
    }

    // Sessions
    const rawSess = localStorage.getItem('agentis_history')
    if (rawSess) {
      const entries = JSON.parse(rawSess) as Array<{
        persona: string; task: string; mode: string; status: string; ts: number
      }>
      for (const e of entries) {
        await pbAddSession({ persona: e.persona, task: e.task, mode: e.mode, status: e.status, ts: e.ts })
        sessions++
      }
    }
  } catch { /* partial sync is fine */ }

  return { memories, analytics, sessions }
}
