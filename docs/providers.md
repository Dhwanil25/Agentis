# LLM Providers

Agentis supports 12 providers out of the box. Add as many or as few as you want — each is optional.

Configure keys in **Settings → Providers**.

---

## Supported Providers

| Provider | Models | Key Prefix | Get Key |
|---|---|---|---|
| **Anthropic** | Claude Opus 4.6, Sonnet 4.6, Haiku 4.5 | `sk-ant-` | [console.anthropic.com](https://console.anthropic.com) |
| **OpenAI** | GPT-4.1, o4-mini, GPT-4o, GPT-4o Mini | `sk-` | [platform.openai.com](https://platform.openai.com/api-keys) |
| **Google AI** | Gemini 2.5 Pro, Flash, experimental | `AIzaSy` | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| **Groq** | Llama 3.3, Mixtral, Gemma | `gsk_` | [console.groq.com](https://console.groq.com/keys) |
| **Mistral AI** | Large, Small, Codestral, Nemo | — | [console.mistral.ai](https://console.mistral.ai/api-keys) |
| **DeepSeek** | V3, R1 (reasoning) | `sk-` | [platform.deepseek.com](https://platform.deepseek.com/api_keys) |
| **OpenRouter** | 200+ models via one key | `sk-or-` | [openrouter.ai](https://openrouter.ai/keys) |
| **Cohere** | Command R+, Command R | — | [dashboard.cohere.com](https://dashboard.cohere.com/api-keys) |
| **xAI (Grok)** | Grok 3, Grok 3 Mini | `xai-` | [console.x.ai](https://console.x.ai) |
| **Together AI** | Llama, Mistral, Qwen, DeepSeek | — | [api.together.ai](https://api.together.ai) |
| **Ollama** | Any local model | *(no key — endpoint)* | [ollama.ai](https://ollama.ai) |
| **LM Studio** | Any GGUF model | *(no key — endpoint)* | [lmstudio.ai](https://lmstudio.ai) |

---

## Recommended Setup

**Minimum (free tier works):** Anthropic Sonnet 4.6 — best balance of quality and speed.

**Best for multi-agent:** Add at least 2 providers. Universe uses provider failover — if one is rate-limited, it automatically switches to the next.

**Best for cost:** Add Groq (free tier, extremely fast) as a secondary provider for lightweight tasks.

---

## Local Providers (No API Key)

### Ollama
Run models locally with zero cost.

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama3.2

# Start server (default: localhost:11434)
ollama serve
```

In Agentis Settings → Providers → Ollama: set endpoint to `http://localhost:11434`.

### LM Studio
Download LM Studio, load any GGUF model, and start the local server (default port `1234`).

In Agentis Settings → Providers → LM Studio: set endpoint to `http://localhost:1234`.

---

## How Provider Failover Works

In Universe (multi-agent mode), each agent has an assigned provider. If that provider:
- Returns an error
- Hits a rate limit
- Times out

Agentis automatically tries the next available provider in your configured list. This means tasks keep running even if one provider is down.

---

## Cost Reference

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|---|---|---|
| Claude Sonnet 4.6 | $3.00 | $15.00 |
| Claude Haiku 4.5 | $0.80 | $4.00 |
| Claude Opus 4.6 | $15.00 | $75.00 |
| GPT-4o | $2.50 | $10.00 |
| GPT-4o Mini | $0.15 | $0.60 |
| Gemini 1.5 Pro | $1.25 | $5.00 |
| Groq (Llama) | Free tier | Free tier |
| Ollama / LM Studio | Free (local) | Free (local) |

Track your actual spend in real time under **Analytics**.
