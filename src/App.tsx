import { useState } from 'react'
import { useAgent } from '@/hooks/useAgent'
import { StepIndicator } from '@/components/StepIndicator'
import { PersonaScreen } from '@/components/PersonaScreen'
import { TaskScreen } from '@/components/TaskScreen'
import { SkillGraphScreen } from '@/components/SkillGraphScreen'
import { ExecuteScreen, OutputScreen } from '@/components/ExecuteAndOutput'

export default function App() {
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_ANTHROPIC_API_KEY ?? '')
  const [keyInput, setKeyInput] = useState('')
  const [keySet, setKeySet] = useState(!!import.meta.env.VITE_ANTHROPIC_API_KEY)

  const { state, setStep, selectPersona, setTask, execute, reset } = useAgent(apiKey)

  if (!keySet) {
    return (
      <div className="shell">
        <div className="card" style={{ maxWidth: 460 }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 6 }}>Agentis</div>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
              Enter your Anthropic API key to get started.{' '}
              <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color: 'var(--fg)' }}>Get one here →</a>
            </p>
          </div>
          <input
            type="password"
            placeholder="sk-ant-..."
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && keyInput.startsWith('sk-')) { setApiKey(keyInput); setKeySet(true) } }}
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', fontSize: 14, borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontFamily: 'var(--font-mono)', marginBottom: 12, outline: 'none' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" disabled={!keyInput.startsWith('sk-')} onClick={() => { setApiKey(keyInput); setKeySet(true) }}>Continue →</button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 16, marginBottom: 0 }}>
            Your key is stored in memory only. Never sent anywhere except directly to api.anthropic.com.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="shell">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em' }}>Agentis</div>
          <button onClick={reset} style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>Reset</button>
        </div>

        <StepIndicator current={state.step} />

        {state.step === 'persona' && (
          <PersonaScreen selected={state.persona} onSelect={selectPersona} onNext={() => setStep('task')} />
        )}

        {state.step === 'task' && state.persona && (
          <TaskScreen
            persona={state.persona}
            task={state.task}
            onTask={setTask}
            onNext={() => setStep('graph')}
            onBack={() => setStep('persona')}
          />
        )}

        {state.step === 'graph' && state.persona && (
          <SkillGraphScreen
            skillIds={state.activeSkills}
            onNext={() => execute(state.task, state.persona!.id)}
            onBack={() => setStep('task')}
          />
        )}

        {state.step === 'execute' && (
          <ExecuteScreen
            pipeline={state.pipeline}
            loading={state.loading}
            error={state.error}
          />
        )}

        {state.step === 'output' && (
          <OutputScreen pipeline={state.pipeline} onReset={reset} />
        )}
      </div>
    </div>
  )
}
