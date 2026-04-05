import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import http from 'http'
import https from 'https'
import type { IncomingMessage, ServerResponse } from 'http'
import { agentisEnginePlugin } from './vite-plugin-agentis'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const engineTarget = env.VITE_OPENFANG_URL || 'http://localhost:4200'

  return {
    plugins: [
      react(),
      agentisEnginePlugin(),
      // Manual Discord API proxy — Vite's built-in proxy strips Authorization header
      {
        name: 'discord-proxy',
        configureServer(server) {
          server.middlewares.use('/discord-api', (req: IncomingMessage, res: ServerResponse) => {
            const targetPath = req.url ?? '/'
            const options = {
              hostname: 'discord.com',
              port: 443,
              path: targetPath,
              method: req.method ?? 'GET',
              headers: {
                ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}),
                ...(req.headers['content-type'] ? { 'content-type': req.headers['content-type'] } : {}),
                host: 'discord.com',
                'user-agent': 'DiscordBot (Agentis, 1.0)',
              },
            }

            const proxy = https.request(options, (upstream) => {
              res.statusCode = upstream.statusCode ?? 200
              res.setHeader('content-type', upstream.headers['content-type'] ?? 'application/json')
              res.setHeader('access-control-allow-origin', '*')
              upstream.pipe(res)
            })

            proxy.on('error', (err) => {
              res.statusCode = 502
              res.end(JSON.stringify({ message: err.message }))
            })

            req.pipe(proxy)
          })
        },
      },
      // Mock A2A agent card for local testing
      {
        name: 'mock-a2a',
        configureServer(server) {
          server.middlewares.use('/.well-known/agent.json', (_req, res) => {
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.end(JSON.stringify({
              name: 'Agentis Local Agent',
              description: 'A local Agentis instance acting as an A2A-compatible agent endpoint.',
              version: '0.3',
              url: 'http://localhost:5173',
              capabilities: {
                streaming: true,
                multiAgent: true,
                pushNotifications: false,
                memory: true,
              },
              skills: [
                { id: 'research',  name: 'Research',    description: 'Web research and knowledge synthesis' },
                { id: 'coding',    name: 'Coding',      description: 'Code generation and review' },
                { id: 'analysis',  name: 'Analysis',    description: 'Data and document analysis' },
                { id: 'writing',   name: 'Writing',     description: 'Content creation and editing' },
                { id: 'universe',  name: 'Multi-Agent', description: 'Spawn and coordinate agent teams' },
              ],
            }))
          })
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        // Forward agent API calls to the engine daemon (bypasses CORS)
        '/agentis-proxy': {
          target: engineTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/agentis-proxy/, ''),
        },
        // Forward PinchTab API calls (bypasses browser CORS restriction)
        '/pinchtab': {
          target: 'http://localhost:9867',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/pinchtab/, ''),
        },
        // Forward PocketBase API calls (bypasses CORS in dev)
        '/pb-proxy': {
          target: 'http://localhost:8090',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/pb-proxy/, ''),
        },
        // Forward Anthropic API calls (bypasses browser CORS for streaming SSE)
        '/anthropic': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/anthropic/, ''),
        },
        '/openai-proxy':     { target: 'https://api.openai.com',                       changeOrigin: true, rewrite: (p) => p.replace(/^\/openai-proxy/, '')     },
        '/google-proxy':     { target: 'https://generativelanguage.googleapis.com',    changeOrigin: true, rewrite: (p) => p.replace(/^\/google-proxy/, '')     },
        '/groq-proxy':       { target: 'https://api.groq.com',                         changeOrigin: true, rewrite: (p) => p.replace(/^\/groq-proxy/, '')       },
        '/mistral-proxy':    { target: 'https://api.mistral.ai',                       changeOrigin: true, rewrite: (p) => p.replace(/^\/mistral-proxy/, '')    },
        '/deepseek-proxy':   { target: 'https://api.deepseek.com',                     changeOrigin: true, rewrite: (p) => p.replace(/^\/deepseek-proxy/, '')   },
        '/openrouter-proxy': { target: 'https://openrouter.ai',                        changeOrigin: true, rewrite: (p) => p.replace(/^\/openrouter-proxy/, '') },
        '/cohere-proxy':     { target: 'https://api.cohere.com',                       changeOrigin: true, rewrite: (p) => p.replace(/^\/cohere-proxy/, '')     },
        '/xai-proxy':        { target: 'https://api.x.ai',                             changeOrigin: true, rewrite: (p) => p.replace(/^\/xai-proxy/, '')        },
        '/together-proxy':   { target: 'https://api.together.ai',                      changeOrigin: true, rewrite: (p) => p.replace(/^\/together-proxy/, '')   },
        '/tavily-proxy':     { target: 'https://api.tavily.com',                       changeOrigin: true, rewrite: (p) => p.replace(/^\/tavily-proxy/, '')     },
        '/github-raw':       { target: 'https://raw.githubusercontent.com',             changeOrigin: true, rewrite: (p) => p.replace(/^\/github-raw/, '')        },
        '/github-api':       { target: 'https://api.github.com',                         changeOrigin: true, rewrite: (p) => p.replace(/^\/github-api/, '')         },
        '/skills-sh':        { target: 'https://skills.sh',                              changeOrigin: true, rewrite: (p) => p.replace(/^\/skills-sh/, '')          },
      },
    },
    build: {
      rollupOptions: {
        input: {
          landing: path.resolve(__dirname, 'index.html'),
          app:     path.resolve(__dirname, 'app.html'),
        },
      },
    },
  }
})
