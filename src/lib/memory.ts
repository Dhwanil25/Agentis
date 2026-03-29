// ── Advanced Agent Memory ─────────────────────────────────────────────────────
// Storage: IndexedDB via Dexie (gigabytes, no server, no PocketBase required)
// Features: importance scoring, memory decay, categories, tags, full-text search,
//           export/import, auto-migration from localStorage

import { db } from './db'
import type { MemoryRecord, MemoryCategory } from './db'

// ── Public types ──────────────────────────────────────────────────────────────

export type { MemoryCategory }

export interface MemoryEntry {
  id: string
  agentId: string
  key: string
  value: string
  ts: number
  source: 'auto' | 'manual'
  category: MemoryCategory
  tags: string[]
  importance: number
  accessCount: number
  lastAccessed: number
}

export interface MemoryStats {
  total: number
  byAgent: Record<string, number>
  byCategory: Record<MemoryCategory, number>
  avgImportance: number
  oldestTs: number
  newestTs: number
}

// ── Decay configuration ───────────────────────────────────────────────────────
// importance = base * e^(-decayRate * daysSinceLastAccess)
// Default 0.05 = ~5% importance loss per day

const DECAY_RATE_KEY = 'agentis_memory_decay_rate'

export function getDecayRate(): number {
  return parseFloat(localStorage.getItem(DECAY_RATE_KEY) ?? '0.05')
}

export function setDecayRate(rate: number): void {
  localStorage.setItem(DECAY_RATE_KEY, String(Math.max(0, Math.min(1, rate))))
}

function decayedImportance(record: MemoryRecord): number {
  const daysSince = (Date.now() - record.lastAccessed) / 86_400_000
  return record.importance * Math.exp(-getDecayRate() * daysSince)
}

// ── Category inference ────────────────────────────────────────────────────────

function inferCategory(key: string, value: string): MemoryCategory {
  const text = `${key} ${value}`.toLowerCase()
  if (/code|function|implement|build|create|file|debug|test|api|class|method|deploy|fix|bug/.test(text)) return 'procedural'
  if (/fact|concept|definition|meaning|knowledge|understand|theory|explain|what is|how does/.test(text)) return 'semantic'
  if (/session|task|did|completed|ran|happened|result|output|last time|previously|used to/.test(text)) return 'episodic'
  return 'general'
}

// ── One-time migration from localStorage ─────────────────────────────────────

let _migrated = false

async function ensureMigrated(): Promise<void> {
  if (_migrated) return
  _migrated = true
  try {
    const raw = localStorage.getItem('agentis_memory')
    if (!raw) return
    const entries = JSON.parse(raw) as Array<{
      id?: string; agentId: string; key: string; value: string; ts: number; source: 'auto' | 'manual'
    }>
    if (!entries.length) return
    const count = await db.memories.count()
    if (count > 0) return // already migrated
    const records: MemoryRecord[] = entries.map(e => ({
      id: e.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      agentId: e.agentId,
      key: e.key,
      value: e.value,
      ts: e.ts,
      source: e.source,
      category: inferCategory(e.key, e.value),
      tags: [],
      importance: e.source === 'manual' ? 0.8 : 0.5,
      accessCount: 0,
      lastAccessed: e.ts,
    }))
    await db.memories.bulkPut(records)
    console.log(`[Memory] Migrated ${records.length} entries from localStorage → IndexedDB`)
  } catch (err) {
    console.warn('[Memory] Migration failed, starting fresh:', err)
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function recordToEntry(r: MemoryRecord): MemoryEntry {
  return { ...r, importance: decayedImportance(r) }
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function dispatch(): void {
  window.dispatchEvent(new CustomEvent('agentis_memory_update'))
}

// ── Core API ──────────────────────────────────────────────────────────────────

export async function loadMemories(): Promise<MemoryEntry[]> {
  await ensureMigrated()
  const records = await db.memories.orderBy('ts').reverse().toArray()
  return records.map(recordToEntry)
}

export async function getAgentMemories(agentId: string): Promise<MemoryEntry[]> {
  await ensureMigrated()
  const records = await db.memories.where('agentId').equals(agentId).toArray()
  return records
    .map(recordToEntry)
    .sort((a, b) => b.importance - a.importance)
}

export async function addMemory(
  entry: Pick<MemoryEntry, 'agentId' | 'key' | 'value'> &
         Partial<Pick<MemoryEntry, 'ts' | 'source' | 'category' | 'tags' | 'importance'>>
): Promise<MemoryEntry> {
  await ensureMigrated()

  const now = Date.now()

  // Upsert: update if same agentId+key already exists
  const existing = await db.memories
    .where('[agentId+key]')
    .equals([entry.agentId, entry.key])
    .first()

  if (existing) {
    const updated: MemoryRecord = {
      ...existing,
      value: entry.value,
      ts: entry.ts ?? now,
      source: entry.source ?? 'auto',
      importance: Math.min(1.0, decayedImportance(existing) + 0.15),
      accessCount: existing.accessCount + 1,
      lastAccessed: Date.now(),
    }
    await db.memories.put(updated)
    dispatch()
    return recordToEntry(updated)
  }

  const record: MemoryRecord = {
    id: newId(),
    agentId: entry.agentId,
    key: entry.key,
    value: entry.value,
    ts: entry.ts ?? now,
    source: entry.source ?? 'auto',
    category: entry.category ?? inferCategory(entry.key, entry.value),
    tags: entry.tags ?? [],
    importance: entry.importance ?? (entry.source === 'manual' ? 0.8 : 0.5),
    accessCount: 0,
    lastAccessed: Date.now(),
  }
  await db.memories.add(record)
  dispatch()
  return recordToEntry(record)
}

export async function updateMemory(id: string, changes: Partial<Pick<MemoryEntry, 'value' | 'tags' | 'category' | 'importance'>>): Promise<void> {
  await db.memories.update(id, changes)
  dispatch()
}

export async function deleteMemory(id: string): Promise<void> {
  await db.memories.delete(id)
  dispatch()
}

export async function clearAgentMemories(agentId: string): Promise<void> {
  await db.memories.where('agentId').equals(agentId).delete()
  dispatch()
}

// ── Access tracking — call when an agent reads a memory ──────────────────────

export async function recordMemoryAccess(id: string): Promise<void> {
  const record = await db.memories.get(id)
  if (!record) return
  await db.memories.update(id, {
    importance: Math.min(1.0, decayedImportance(record) + 0.1),
    accessCount: record.accessCount + 1,
    lastAccessed: Date.now(),
  })
}

// ── Auto-save after task completion ──────────────────────────────────────────

export async function autoSaveTaskMemory(
  agentId: string,
  task: string,
  outputSnippet: string
): Promise<void> {
  const key = task.slice(0, 60).replace(/\s+/g, '_').toLowerCase()
  await addMemory({
    agentId,
    key,
    value: outputSnippet.slice(0, 400),
    ts: Date.now(),
    source: 'auto',
    category: 'episodic',
  })
}

// ── Search ────────────────────────────────────────────────────────────────────

export async function searchMemories(query: string): Promise<MemoryEntry[]> {
  await ensureMigrated()
  const q = query.toLowerCase().trim()
  if (!q) return loadMemories()
  const all = await db.memories.toArray()
  return all
    .filter(r =>
      r.key.toLowerCase().includes(q) ||
      r.value.toLowerCase().includes(q) ||
      r.tags.some(t => t.toLowerCase().includes(q)) ||
      r.agentId.toLowerCase().includes(q)
    )
    .map(recordToEntry)
    .sort((a, b) => b.importance - a.importance)
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getMemoryStats(): Promise<MemoryStats> {
  const all = await db.memories.toArray()
  const byAgent: Record<string, number> = {}
  const byCategory: Record<MemoryCategory, number> = { episodic: 0, semantic: 0, procedural: 0, general: 0 }
  let totalImportance = 0
  let oldest = Infinity, newest = 0

  for (const r of all) {
    byAgent[r.agentId] = (byAgent[r.agentId] ?? 0) + 1
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1
    totalImportance += decayedImportance(r)
    if (r.ts < oldest) oldest = r.ts
    if (r.ts > newest) newest = r.ts
  }

  return {
    total: all.length,
    byAgent,
    byCategory,
    avgImportance: all.length ? totalImportance / all.length : 0,
    oldestTs: oldest === Infinity ? 0 : oldest,
    newestTs: newest,
  }
}

// ── Export / Import ───────────────────────────────────────────────────────────

export async function exportMemories(): Promise<string> {
  const memories = await db.memories.toArray()
  return JSON.stringify({ version: 2, exported: Date.now(), memories }, null, 2)
}

export async function importMemories(json: string): Promise<{ imported: number; skipped: number }> {
  const data = JSON.parse(json) as { version?: number; memories?: MemoryRecord[] }
  if (!Array.isArray(data.memories) || !data.memories.length) return { imported: 0, skipped: 0 }

  const existing = new Set((await db.memories.toArray()).map(r => r.id))
  const toImport = data.memories.filter(r => !existing.has(r.id))
  const skipped = data.memories.length - toImport.length

  if (toImport.length) {
    // Ensure all records have the required shape
    const sanitized: MemoryRecord[] = toImport.map(r => ({
      id: r.id ?? newId(),
      agentId: r.agentId ?? 'unknown',
      key: r.key ?? 'imported',
      value: r.value ?? '',
      ts: r.ts ?? Date.now(),
      source: r.source ?? 'manual',
      category: r.category ?? 'general',
      tags: Array.isArray(r.tags) ? r.tags : [],
      importance: typeof r.importance === 'number' ? r.importance : 0.5,
      accessCount: typeof r.accessCount === 'number' ? r.accessCount : 0,
      lastAccessed: r.lastAccessed ?? r.ts ?? Date.now(),
    }))
    await db.memories.bulkPut(sanitized)
    dispatch()
  }

  return { imported: toImport.length, skipped }
}

// ── Pruning — remove memories whose importance has decayed below threshold ────

export async function pruneDecayedMemories(threshold = 0.05): Promise<number> {
  const all = await db.memories.toArray()
  const stale = all.filter(r => decayedImportance(r) < threshold).map(r => r.id)
  if (stale.length) {
    await db.memories.bulkDelete(stale)
    dispatch()
  }
  return stale.length
}
