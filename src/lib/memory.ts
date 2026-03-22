// ── Persistent agent memory ───────────────────────────────────────────────────
// Write: localStorage (instant) + PocketBase background sync
// Read:  PocketBase if enabled, else localStorage

import { isPbEnabled, pbUpsertMemory, pbDeleteMemory, pbDeleteAgentMemories, pbLoadMemories } from './pb'

export interface MemoryEntry {
  id: string
  agentId: string
  key: string
  value: string
  ts: number
  source: 'auto' | 'manual'
}

const STORAGE_KEY = 'agentis_memory'

function loadLocal(): MemoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as MemoryEntry[]) : []
  } catch { return [] }
}

function saveLocal(entries: MemoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-500)))
    window.dispatchEvent(new CustomEvent('agentis_memory_update'))
  } catch { /* ignore */ }
}

// Pull from PocketBase and overwrite localStorage — call on app load
export async function syncMemoriesFromPb(): Promise<void> {
  if (!isPbEnabled()) return
  try {
    const remote = await pbLoadMemories()
    if (!remote.length) return
    const mapped: MemoryEntry[] = remote.map(r => ({
      id: r.id,
      agentId: r.agent_id,
      key: r.key,
      value: r.value,
      ts: r.ts,
      source: r.source,
    }))
    saveLocal(mapped)
  } catch { /* keep local */ }
}

export function loadMemories(): MemoryEntry[] {
  return loadLocal()
}

export function getAgentMemories(agentId: string): MemoryEntry[] {
  return loadLocal().filter(m => m.agentId === agentId)
}

export function addMemory(entry: Omit<MemoryEntry, 'id'>): MemoryEntry {
  const full: MemoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  }
  const all = loadLocal()
  const idx = all.findIndex(m => m.agentId === entry.agentId && m.key === entry.key)
  if (idx >= 0) {
    all[idx] = { ...all[idx], value: entry.value, ts: entry.ts, source: entry.source }
  } else {
    all.push(full)
  }
  saveLocal(all)

  if (isPbEnabled()) {
    pbUpsertMemory({
      agent_id: entry.agentId,
      key: entry.key,
      value: entry.value,
      source: entry.source,
      ts: entry.ts,
    }).catch(() => { /* silent */ })
  }

  return full
}

export function deleteMemory(id: string): void {
  saveLocal(loadLocal().filter(m => m.id !== id))
  if (isPbEnabled()) pbDeleteMemory(id).catch(() => { /* silent */ })
}

export function clearAgentMemories(agentId: string): void {
  saveLocal(loadLocal().filter(m => m.agentId !== agentId))
  if (isPbEnabled()) pbDeleteAgentMemories(agentId).catch(() => { /* silent */ })
}

export function autoSaveTaskMemory(agentId: string, task: string, outputSnippet: string): void {
  const key = task.slice(0, 60).replace(/\s+/g, '_').toLowerCase()
  addMemory({
    agentId,
    key,
    value: outputSnippet.slice(0, 300),
    ts: Date.now(),
    source: 'auto',
  })
}
