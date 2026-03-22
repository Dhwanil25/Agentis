import { useState, useEffect } from 'react'
import {
  loadApprovals, resolveApproval, dismissApproval, clearResolvedApprovals,
} from '@/lib/approvals'
import type { ApprovalRequest, ApprovalStatus } from '@/lib/approvals'

type Filter = 'all' | 'pending' | 'approved' | 'rejected'

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60)   return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

const RISK_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  low:    { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.35)',  text: '#10b981' },
  medium: { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.35)',  text: '#f59e0b' },
  high:   { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.35)',   text: '#ef4444' },
}

const STATUS_BADGE: Record<ApprovalStatus, { label: string; className: string }> = {
  pending:  { label: 'PENDING',  className: 'badge badge-orange' },
  approved: { label: 'APPROVED', className: 'badge badge-green'  },
  rejected: { label: 'REJECTED', className: 'badge badge-red'    },
}

function ApprovalCard({ req, onResolve }: { req: ApprovalRequest; onResolve: () => void }) {
  const risk   = RISK_COLOR[req.risk] ?? RISK_COLOR.medium
  const badge  = STATUS_BADGE[req.status]
  const isPending = req.status === 'pending'

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderLeft: `3px solid ${risk.border}`,
      borderRadius: 8, padding: '14px 16px', marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{req.action}</span>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
              background: risk.bg, border: `1px solid ${risk.border}`, color: risk.text,
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              {req.risk} risk
            </span>
            <span className={badge.className} style={{ fontSize: 9, marginLeft: 'auto' }}>
              {badge.label}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 6 }}>
            {req.description}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 12 }}>
            <span>Agent: <strong style={{ color: 'var(--fg)' }}>{req.agentName}</strong></span>
            <span>{isPending ? timeAgo(req.ts) : formatDateTime(req.ts)}</span>
            {req.resolvedAt && (
              <span>Resolved: {formatDateTime(req.resolvedAt)}</span>
            )}
          </div>
        </div>
      </div>

      {isPending && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-primary"
            style={{ fontSize: 12, padding: '6px 18px', background: '#10b981', borderColor: '#10b981' }}
            onClick={() => { resolveApproval(req.id, true); onResolve() }}
          >
            Approve
          </button>
          <button
            className="btn-secondary"
            style={{ fontSize: 12, padding: '6px 18px', color: '#ef4444', borderColor: '#ef4444' }}
            onClick={() => { resolveApproval(req.id, false); onResolve() }}
          >
            Reject
          </button>
        </div>
      )}

      {!isPending && (
        <button
          className="btn-ghost"
          style={{ fontSize: 11 }}
          onClick={() => { dismissApproval(req.id); onResolve() }}
        >
          Dismiss
        </button>
      )}
    </div>
  )
}

export function ApprovalsPage() {
  const [filter, setFilter]     = useState<Filter>('all')
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([])

  const refresh = () => setApprovals(loadApprovals())

  useEffect(() => {
    refresh()
    const onNew      = () => refresh()
    const onResolved = () => refresh()
    window.addEventListener('agentis_approval_new',      onNew)
    window.addEventListener('agentis_approval_resolved', onResolved)
    return () => {
      window.removeEventListener('agentis_approval_new',      onNew)
      window.removeEventListener('agentis_approval_resolved', onResolved)
    }
  }, [])

  const filtered = approvals
    .filter(a => filter === 'all' || a.status === filter)
    .reverse()

  const pendingCount  = approvals.filter(a => a.status === 'pending').length
  const approvedCount = approvals.filter(a => a.status === 'approved').length
  const rejectedCount = approvals.filter(a => a.status === 'rejected').length

  const filters: { id: Filter; label: string; count?: number }[] = [
    { id: 'all',      label: 'All',      count: approvals.length  },
    { id: 'pending',  label: 'Pending',  count: pendingCount       },
    { id: 'approved', label: 'Approved', count: approvedCount      },
    { id: 'rejected', label: 'Rejected', count: rejectedCount      },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="of-page-header">
        <span className="of-page-title">Approvals</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {pendingCount > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
              background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)',
              color: '#f59e0b',
            }}>
              {pendingCount} pending
            </span>
          )}
          {approvals.some(a => a.status !== 'pending') && (
            <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => { clearResolvedApprovals(); refresh() }}>
              Clear resolved
            </button>
          )}
          <button className="btn-ghost" style={{ fontSize: 11 }} onClick={refresh}>
            Refresh
          </button>
        </div>
      </div>

      <div className="of-page-content">
        <div style={{ padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
          When agents request permission for sensitive actions — browser write operations, external API calls, destructive operations — they pause and appear here.
          Approve or reject each request to allow the agent to continue.
          <br />
          <span style={{ color: 'var(--fg)', fontWeight: 500 }}>
            Enable approval gates in Hands → Browser Agent using the "Require approval for write actions" toggle.
          </span>
        </div>

        {/* Filter tabs */}
        <div className="tab-bar">
          {filters.map(f => (
            <button
              key={f.id}
              className={`tab-btn${filter === f.id ? ' active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              {f.count !== undefined && f.count > 0 && (
                <span style={{
                  marginLeft: 5, fontSize: 9, padding: '1px 5px', borderRadius: 8,
                  background: f.id === 'pending' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.08)',
                  color: f.id === 'pending' ? '#f59e0b' : 'var(--muted)',
                }}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)', marginBottom: 8 }}>
              {filter === 'pending' ? 'No pending approvals' : 'No approvals'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>
              {filter === 'pending'
                ? 'All clear — no agents are waiting for permission right now.'
                : 'Run a browser agent task with approval mode enabled to see requests here.'}
            </div>
          </div>
        ) : (
          <div>
            {filtered.map(req => (
              <ApprovalCard key={req.id} req={req} onResolve={refresh} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
