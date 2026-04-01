import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { agentisEnginePlugin } from './vite-plugin-agentis'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const engineTarget = env.VITE_OPENFANG_URL || 'http://localhost:4200'

  return {
    plugins: [react(), agentisEnginePlugin()],
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
