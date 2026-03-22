import type { LLMProvider } from './multiAgentEngine'

export type TestResult = 'idle' | 'testing' | 'ok' | 'fail'

export async function testProviderKey(provider: LLMProvider, key: string): Promise<'ok' | 'fail'> {
  if (!key.trim()) return 'fail'
  try {
    let res: Response

    switch (provider) {

      // ── Anthropic ─────────────────────────────────────────────────────────────
      // Must call directly (same as the engine) with the browser-access header;
      // the Vite proxy path strips auth headers and returns 401 even for valid keys.
      case 'anthropic':
        res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'hi' }],
          }),
        })
        break

      // ── OpenAI ────────────────────────────────────────────────────────────────
      // GET /v1/models — no tokens consumed, strict 401 on bad key
      case 'openai':
        res = await fetch('/openai-proxy/v1/models', {
          headers: { Authorization: `Bearer ${key}` },
        })
        break

      // ── Google Gemini ─────────────────────────────────────────────────────────
      // List models endpoint — lightweight, returns 400/403 on bad key
      case 'google':
        res = await fetch(`/google-proxy/v1beta/models?key=${key}`)
        break

      // ── Groq ──────────────────────────────────────────────────────────────────
      case 'groq':
        res = await fetch('/groq-proxy/openai/v1/models', {
          headers: { Authorization: `Bearer ${key}` },
        })
        break

      // ── Mistral ───────────────────────────────────────────────────────────────
      case 'mistral':
        res = await fetch('/mistral-proxy/v1/models', {
          headers: { Authorization: `Bearer ${key}` },
        })
        break

      // ── DeepSeek ──────────────────────────────────────────────────────────────
      case 'deepseek':
        res = await fetch('/deepseek-proxy/v1/models', {
          headers: { Authorization: `Bearer ${key}` },
        })
        break

      // ── OpenRouter ────────────────────────────────────────────────────────────
      // /api/v1/auth/key — dedicated key-info endpoint, strict auth required
      case 'openrouter':
        res = await fetch('/openrouter-proxy/api/v1/auth/key', {
          headers: { Authorization: `Bearer ${key}` },
        })
        break

      // ── Cohere ────────────────────────────────────────────────────────────────
      case 'cohere':
        res = await fetch('/cohere-proxy/v1/models', {
          headers: { Authorization: `Bearer ${key}` },
        })
        break

      // ── xAI ───────────────────────────────────────────────────────────────────
      case 'xai':
        res = await fetch('/xai-proxy/v1/models', {
          headers: { Authorization: `Bearer ${key}` },
        })
        break

      // ── Together ──────────────────────────────────────────────────────────────
      case 'together':
        res = await fetch('/together-proxy/v1/models', {
          headers: { Authorization: `Bearer ${key}` },
        })
        break

      // ── Ollama (local) ────────────────────────────────────────────────────────
      // Just check if the server is reachable — no auth needed
      case 'ollama': {
        const base = key.replace(/\/$/, '') || 'http://localhost:11434'
        res = await fetch(`${base}/api/tags`)
        break
      }

      // ── LM Studio (local) ────────────────────────────────────────────────────
      case 'lmstudio': {
        const base = key.replace(/\/$/, '') || 'http://localhost:1234'
        res = await fetch(`${base}/v1/models`)
        break
      }

      default:
        return 'fail'
    }

    return res.ok ? 'ok' : 'fail'
  } catch {
    return 'fail'
  }
}
