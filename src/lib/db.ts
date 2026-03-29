// ── Agentis IndexedDB Database (Dexie) ────────────────────────────────────────
// Replaces localStorage + PocketBase with a fully local, browser-native database.
// Storage: unlimited (browser quota), survives page reloads, no server required.

import Dexie, { type Table } from 'dexie'

// ── Schema types ──────────────────────────────────────────────────────────────

export type MemoryCategory = 'episodic' | 'semantic' | 'procedural' | 'general'

export interface MemoryRecord {
  id: string
  agentId: string
  key: string
  value: string
  ts: number
  source: 'auto' | 'manual'
  category: MemoryCategory
  tags: string[]
  importance: number        // 0–1, decays over time
  accessCount: number
  lastAccessed: number
}

export interface AnalyticsRecord {
  id: string
  model: string
  persona: string
  task: string
  inputTokens: number
  outputTokens: number
  cost: number
  stepCount: number
  ts: number
}

export interface SessionRecord {
  id: string
  persona: string
  task: string
  mode: string
  status: string
  ts: number
}

// ── Database definition ───────────────────────────────────────────────────────

class AgentisDatabase extends Dexie {
  memories!:  Table<MemoryRecord>
  analytics!: Table<AnalyticsRecord>
  sessions!:  Table<SessionRecord>

  constructor() {
    super('agentis_db')
    this.version(1).stores({
      // Primary key first, then indexed fields, compound index for upsert by agentId+key
      memories:  'id, agentId, key, ts, importance, category, lastAccessed, [agentId+key]',
      analytics: 'id, ts, model, persona',
      sessions:  'id, ts, persona',
    })
  }
}

export const db = new AgentisDatabase()
