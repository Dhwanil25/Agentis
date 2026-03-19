import { useState } from 'react'

type SchedulerTab = 'jobs' | 'triggers' | 'history'

export function SchedulerPage() {
  const [tab, setTab] = useState<SchedulerTab>('jobs')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="of-page-header">
        <span className="of-page-title">Scheduler</span>
        <button className="btn-primary" style={{ fontSize: 12 }}>
          New Job
        </button>
      </div>

      <div className="of-page-content">
        <div className="tab-bar">
          <button className={`tab-btn${tab === 'jobs' ? ' active' : ''}`} onClick={() => setTab('jobs')}>Scheduled Jobs</button>
          <button className={`tab-btn${tab === 'triggers' ? ' active' : ''}`} onClick={() => setTab('triggers')}>Event Triggers</button>
          <button className={`tab-btn${tab === 'history' ? ' active' : ''}`} onClick={() => setTab('history')}>Run History</button>
        </div>

        {tab === 'jobs' && (
          <div>
            <div className="of-info-banner">
              <span style={{ fontWeight: 600 }}>Scheduled Jobs</span>
              <span style={{ color: 'var(--muted)', marginLeft: 8 }}>
                Schedule agent tasks to run automatically using cron syntax. Jobs run on the Agentis Engine.
              </span>
            </div>

            <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)', marginBottom: 8 }}>No scheduled jobs</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
                Create a cron job to run agent tasks automatically on a schedule.
              </div>
              <button className="btn-primary">Create Scheduled Job</button>
            </div>
          </div>
        )}

        {tab === 'triggers' && (
          <div>
            <div className="of-info-banner">
              <span style={{ fontWeight: 600 }}>Event Triggers</span>
              <span style={{ color: 'var(--muted)', marginLeft: 8 }}>
                Trigger agent workflows in response to external events: webhooks, file changes, API calls.
              </span>
            </div>

            <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)', marginBottom: 8 }}>No event triggers</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
                Configure a webhook or event listener to trigger agents automatically.
              </div>
              <button className="btn-primary">Create Event Trigger</button>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <table className="of-table">
              <thead>
                <tr>
                  <th>Job Name</th>
                  <th>Schedule</th>
                  <th>Last Run</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px' }}>
                    No run history yet.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
