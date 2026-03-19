import { useState } from 'react'

type ApprovalFilter = 'all' | 'pending' | 'approved' | 'rejected'

export function ApprovalsPage() {
  const [filter, setFilter] = useState<ApprovalFilter>('all')

  const filters: { id: ApprovalFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="of-page-header">
        <span className="of-page-title">Approvals</span>
        <button className="btn-ghost" style={{ fontSize: 12 }}>
          Refresh
        </button>
      </div>

      <div className="of-page-content">
        {/* Filter tabs */}
        <div className="tab-bar">
          {filters.map(f => (
            <button
              key={f.id}
              className={`tab-btn${filter === f.id ? ' active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Empty state */}
        <div style={{
          padding: '48px 24px',
          textAlign: 'center',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)', marginBottom: 8 }}>
            No approvals
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>
            When agents request permission for sensitive actions such as file writes, external API calls, or destructive operations, they will appear here for your review.
          </div>
        </div>

        {/* Info about approvals */}
        <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
          Approvals are a safety mechanism. Configure approval requirements per agent in Settings. Agents will pause and wait for your response before proceeding with the flagged action.
        </div>
      </div>
    </div>
  )
}
