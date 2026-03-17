import { useEffect, useRef, useState } from 'react'
import { SKILLS } from '@/data/skills'
import { SkillPill } from './SkillPill'

interface Props {
  skillIds: string[]
  onNext: () => void
  onBack: () => void
}

export function SkillGraphScreen({ skillIds, onNext, onBack }: Props) {
  const [revealed, setRevealed] = useState<string[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [ready, setReady] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setRevealed([])
    setLogs([])
    setReady(false)

    const addLog = (msg: string) =>
      setLogs(l => [...l, msg])

    let cancelled = false

    const run = async () => {
      const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
      addLog('Parsing task intent...')
      await delay(400)
      if (cancelled) return

      for (const sid of skillIds) {
        const sk = SKILLS[sid]
        if (!sk) continue
        setRevealed(r => [...r, sid])
        addLog(`${sk.label} skill: loaded — ${sk.description}`)
        await delay(350)
        if (cancelled) return
      }

      await delay(200)
      addLog('Skill graph complete. Ready to execute.')
      setReady(true)
    }

    run()
    return () => { cancelled = true }
  }, [skillIds])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 6px' }}>Skill graph</h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 20px' }}>
        Agentis builds an orchestration graph for your task.
      </p>

      {/* Skill nodes */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        {skillIds.map((sid, i) => {
          const sk = SKILLS[sid]
          if (!sk) return null
          const active = revealed.includes(sid)
          return (
            <div key={sid} style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  padding: '10px 18px',
                  borderRadius: 10,
                  border: `1px solid ${sk.color.border}`,
                  background: active ? sk.color.bg : 'var(--surface)',
                  opacity: active ? 1 : 0.3,
                  transition: 'all 0.4s',
                  textAlign: 'center',
                  minWidth: 100,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: active ? sk.color.text : 'var(--muted)' }}>
                  {sk.label}
                </div>
                <div style={{ fontSize: 11, color: active ? sk.color.text : 'var(--muted)', marginTop: 2, opacity: 0.8 }}>
                  {sk.description}
                </div>
              </div>
              {i < skillIds.length - 1 && (
                <div
                  style={{
                    width: 32,
                    height: 1,
                    background: revealed.length > i + 1 ? '#1D9E75' : 'var(--border)',
                    transition: 'background 0.4s',
                    flexShrink: 0,
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Log */}
      <div
        ref={logRef}
        style={{
          background: 'var(--surface)',
          border: '0.5px solid var(--border)',
          borderRadius: 10,
          padding: '10px 14px',
          maxHeight: 130,
          overflowY: 'auto',
          marginBottom: 20,
        }}
      >
        {logs.map((l, i) => (
          <div
            key={i}
            style={{
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              color: i === logs.length - 1 ? 'var(--fg)' : 'var(--muted)',
              padding: '3px 0',
              borderBottom: i < logs.length - 1 ? '0.5px solid var(--border)' : 'none',
            }}
          >
            {'> ' + l}
          </div>
        ))}
      </div>

      {/* Active skills summary */}
      <div style={{ marginBottom: 20 }}>
        {skillIds.map(sid => <SkillPill key={sid} skillId={sid} />)}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn-primary" onClick={onNext} disabled={!ready}>
          Run agent →
        </button>
      </div>
    </div>
  )
}
