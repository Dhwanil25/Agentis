// ── Human-in-the-loop approval system ────────────────────────────────────────

export type ApprovalRisk   = 'low' | 'medium' | 'high'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface ApprovalRequest {
  id: string
  ts: number
  agentId: string
  agentName: string
  action: string
  description: string
  risk: ApprovalRisk
  status: ApprovalStatus
  resolvedAt?: number
}

const STORAGE_KEY = 'agentis_approvals'

// Promise resolvers for in-flight approval requests
const pendingResolvers = new Map<string, (approved: boolean) => void>()

function load(): ApprovalRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ApprovalRequest[]) : []
  } catch { return [] }
}

function save(requests: ApprovalRequest[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests.slice(-200)))
  } catch { /* ignore */ }
}

export function loadApprovals(): ApprovalRequest[] {
  return load()
}

export function getPendingCount(): number {
  return load().filter(a => a.status === 'pending').length
}

export function resolveApproval(id: string, approved: boolean): void {
  const all = load()
  const idx = all.findIndex(a => a.id === id)
  if (idx >= 0) {
    all[idx] = { ...all[idx], status: approved ? 'approved' : 'rejected', resolvedAt: Date.now() }
    save(all)
  }
  window.dispatchEvent(new CustomEvent('agentis_approval_resolved', { detail: { id, approved } }))
  const resolver = pendingResolvers.get(id)
  if (resolver) {
    resolver(approved)
    pendingResolvers.delete(id)
  }
}

export function dismissApproval(id: string): void {
  save(load().filter(a => a.id !== id))
  window.dispatchEvent(new CustomEvent('agentis_approval_resolved', { detail: { id, approved: false } }))
}

export function clearResolvedApprovals(): void {
  save(load().filter(a => a.status === 'pending'))
  window.dispatchEvent(new CustomEvent('agentis_approval_resolved', { detail: { id: '', approved: false } }))
}

/**
 * Submit an approval request and block until the user approves or rejects it.
 * Call from inside an agent execution flow. Returns true if approved.
 */
export async function requestApproval(opts: {
  agentId: string
  agentName: string
  action: string
  description: string
  risk?: ApprovalRisk
  timeoutMs?: number
}): Promise<boolean> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const req: ApprovalRequest = {
    id,
    ts: Date.now(),
    agentId: opts.agentId,
    agentName: opts.agentName,
    action: opts.action,
    description: opts.description,
    risk: opts.risk ?? 'medium',
    status: 'pending',
  }

  const all = load()
  all.push(req)
  save(all)
  window.dispatchEvent(new CustomEvent('agentis_approval_new', { detail: req }))

  return new Promise<boolean>((resolve) => {
    pendingResolvers.set(id, resolve)
    if (opts.timeoutMs) {
      setTimeout(() => {
        if (pendingResolvers.has(id)) resolveApproval(id, false)
      }, opts.timeoutMs)
    }
  })
}
