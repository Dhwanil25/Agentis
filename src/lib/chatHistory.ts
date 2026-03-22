import type { MAState } from './multiAgentEngine'

export interface ChatSession {
  id: string
  title: string        // first ~60 chars of the task
  task: string
  state: MAState
  createdAt: number
  updatedAt: number
}

const KEY = 'agentis_chat_history'
const MAX_SESSIONS = 60

function load(): ChatSession[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as ChatSession[]
  } catch {
    return []
  }
}

function persist(sessions: ChatSession[]) {
  localStorage.setItem(KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)))
}

// Take the first 6 meaningful words for a clean sidebar title
function makeTitle(task: string): string {
  const words = task.trim().split(/\s+/).filter(w => w.length > 0)
  if (words.length === 0) return 'Untitled'
  if (words.length <= 6) return words.join(' ')
  return words.slice(0, 6).join(' ') + '…'
}

export function loadSessions(): ChatSession[] {
  return load().sort((a, b) => b.updatedAt - a.updatedAt)
}

export function saveSession(task: string, state: MAState, existingId?: string): ChatSession {
  const sessions = load()
  const now = Date.now()
  const title = makeTitle(task)

  if (existingId) {
    const idx = sessions.findIndex(s => s.id === existingId)
    if (idx !== -1) {
      sessions[idx] = { ...sessions[idx], task, title, state, updatedAt: now }
      persist(sessions)
      return sessions[idx]
    }
  }

  const session: ChatSession = {
    id: `chat-${now}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    task,
    state,
    createdAt: now,
    updatedAt: now,
  }
  persist([session, ...sessions])
  return session
}

export function deleteSession(id: string) {
  persist(load().filter(s => s.id !== id))
}
