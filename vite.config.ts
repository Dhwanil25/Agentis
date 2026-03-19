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
      },
    },
    build: {
      rollupOptions: {
        input: {
          main:    path.resolve(__dirname, 'index.html'),
          landing: path.resolve(__dirname, 'landing.html'),
        },
      },
    },
  }
})
