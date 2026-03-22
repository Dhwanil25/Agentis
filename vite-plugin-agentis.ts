/// <reference types="node" />
/**
 * Agentis Engine — Vite dev server plugin.
 *
 * Replaces scripts/openfang-daemon.mjs entirely. Runs the engine daemon
 * inside the Vite process so there is only ONE local server (port 5173).
 *
 * Middleware endpoints registered on the Vite dev server:
 *   GET  /agentis/status     — JSON daemon status
 *   POST /agentis/configure  — Accept API key, restart daemon
 *   GET  /agentis/logs       — SSE stream of daemon stdout/stderr
 */

import type { Plugin } from 'vite'
import { spawn, execSync } from 'child_process'
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  unlinkSync,
  statSync,
  chmodSync,
  createWriteStream,
  copyFileSync,
  readdirSync,
} from 'fs'
import { get as httpsGet } from 'https'
import http from 'http'
import os from 'os'
import path from 'path'
import type { IncomingMessage, ServerResponse } from 'http'
import type { ChildProcess } from 'child_process'

// ── Constants ─────────────────────────────────────────────────────────────────

const IS_WIN   = process.platform === 'win32'
const IS_MAC   = process.platform === 'darwin'
const IS_ARM   = process.arch === 'arm64'
const BIN_NAME = IS_WIN ? 'openfang.exe' : 'openfang'
const BUILD_OUT = '/tmp/openfang/target/release/openfang'

// ── Mutable state ─────────────────────────────────────────────────────────────

type DaemonState =
  | 'idle' | 'downloading' | 'building' | 'starting' | 'running'
  | 'restarting' | 'error' | 'stopped' | 'not_installed' | 'needs_api_key'

let engineState: { state: DaemonState; message: string; port: number; binPath: string } = {
  state: 'idle',
  message: 'Initialising...',
  port: 4200,
  binPath: '',
}

let daemonProc: ChildProcess | null = null
let pendingBinPath: string | null = null
const sseClients: ServerResponse[] = []
const recentLogs: Array<{ line: string; ts: number }> = []

// ── Helpers ───────────────────────────────────────────────────────────────────

function setStatus(state: DaemonState, message: string) {
  engineState = { ...engineState, state, message }
  console.log(`[Agentis Engine] ${message}`)
}

// Strip ANSI/VT100 escape codes from terminal output
// eslint-disable-next-line no-control-regex
const ANSI_RE = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><~]/g

function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, '').replace(/\r/g, '')
}

function pushLog(line: string) {
  const clean = stripAnsi(line).trim()
  if (!clean) return
  const entry = { line: clean, ts: Date.now() }
  recentLogs.push(entry)
  if (recentLogs.length > 500) recentLogs.shift()
  const payload = `data: ${JSON.stringify(entry)}\n\n`
  for (const res of [...sseClients]) {
    try { res.write(payload) } catch { /* client disconnected */ }
  }
}

function loadEnvFiles(root: string) {
  for (const name of ['.env', '.env.local']) {
    const p = path.join(root, name)
    if (!existsSync(p)) continue
    try {
      for (const line of readFileSync(p, 'utf8').split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const idx = trimmed.indexOf('=')
        if (idx < 0) continue
        const key = trimmed.slice(0, idx).trim()
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
        if (key && !process.env[key]) process.env[key] = val
      }
    } catch { /* ignore */ }
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise(resolve => {
    let body = ''
    req.on('data', (chunk: Buffer) => { body += chunk })
    req.on('end', () => resolve(body))
    req.on('error', () => resolve(''))
  })
}

// ── Binary management ─────────────────────────────────────────────────────────

function isValidBinary(p: string): boolean {
  try {
    const st = statSync(p)
    if (st.size < 10 * 1024) return false
    if (!IS_WIN) chmodSync(p, 0o755)
    return true
  } catch { return false }
}

function findInPath(): string | null {
  try {
    const r = execSync(IS_WIN ? 'where openfang' : 'which openfang', { encoding: 'utf8', stdio: 'pipe' })
    return r.trim().split('\n')[0].trim() || null
  } catch { return null }
}

function tryDownload(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(dest)
    mkdirSync(dir, { recursive: true })
    const file = createWriteStream(dest)
    function doGet(u: string) {
      httpsGet(u, res => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          doGet(res.headers.location!)
          return
        }
        if (res.statusCode !== 200) {
          file.close()
          reject(new Error(`HTTP ${res.statusCode}`))
          return
        }
        res.pipe(file as NodeJS.WritableStream)
        file.on('finish', () => {
          file.close()
          if (!IS_WIN) chmodSync(dest, 0o755)
          resolve()
        })
      }).on('error', (e: Error) => { file.close(); reject(e) })
    }
    doGet(url)
  })
}

async function tryAutoDownload(binPath: string): Promise<boolean> {
  const base = 'https://github.com/RightNow-AI/openfang/releases/latest/download'
  const candidates = IS_WIN
    ? [`${base}/openfang-windows-x64.exe`]
    : IS_MAC
    ? [
        `${base}/openfang-macos-${IS_ARM ? 'arm64' : 'x64'}`,
        `${base}/openfang-${IS_ARM ? 'aarch64' : 'x86_64'}-apple-darwin`,
      ]
    : [
        `${base}/openfang-linux-${IS_ARM ? 'arm64' : 'x64'}`,
        `${base}/openfang-${IS_ARM ? 'aarch64' : 'x86_64'}-unknown-linux-gnu`,
      ]
  for (const url of candidates) {
    try {
      setStatus('downloading', 'Downloading Agentis Engine binary...')
      await tryDownload(url, binPath)
      if (isValidBinary(binPath)) return true
      try { unlinkSync(binPath) } catch { /* ok */ }
    } catch { /* try next */ }
  }
  return false
}

// ── Config management ─────────────────────────────────────────────────────────

function writeConfig(port: number) {
  const dir  = path.join(os.homedir(), '.openfang')
  const file = path.join(dir, 'config.toml')
  mkdirSync(dir, { recursive: true })
  writeFileSync(file, [
    '# Agentis Engine config',
    `api_listen = "127.0.0.1:${port}"`,
    '',
    '[default_model]',
    'provider = "anthropic"',
    'model    = "claude-sonnet-4-20250514"',
    'api_key_env = "ANTHROPIC_API_KEY"',
    '',
    '[memory]',
    'decay_rate = 0.05',
    '',
  ].join('\n'))
}

function ensureConfig(port: number) {
  const file = path.join(os.homedir(), '.openfang', 'config.toml')
  if (!existsSync(file)) writeConfig(port)
}

// ── Health / agent revival ────────────────────────────────────────────────────

function checkHealth(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const req = http.get(`http://127.0.0.1:${port}/api/health`, res => {
      resolve(res.statusCode === 200)
    })
    req.on('error', () => resolve(false))
    req.setTimeout(2000, () => { req.destroy(); resolve(false) })
  })
}

async function reviveAgents(port: number) {
  try {
    const agents = await new Promise<Array<{ id: string; name: string; state: string; ready: boolean }>>(
      (resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}/api/agents`, res => {
          let data = ''
          res.on('data', (d: Buffer) => { data += d })
          res.on('end', () => { try { resolve(JSON.parse(data)) } catch { resolve([]) } })
        })
        req.on('error', reject)
      }
    )
    for (const agent of agents) {
      if (agent.state === 'Terminated' || !agent.ready) {
        console.log(`[Agentis Engine] Reviving agent: ${agent.name} (${agent.id})`)
        await new Promise<void>(resolve => {
          const body = '{}'
          const req = http.request({
            hostname: '127.0.0.1', port,
            path: `/api/agents/${agent.id}/restart`, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': body.length },
          }, res => { res.on('data', () => {}); res.on('end', resolve) })
          req.on('error', resolve)
          req.write(body); req.end()
        })
      }
    }
  } catch { /* daemon not ready yet */ }
}

// ── Daemon lifecycle ──────────────────────────────────────────────────────────

function startDaemon(binPath: string, port: number) {
  if (daemonProc) return
  ensureConfig(port)
  setStatus('starting', `Starting Agentis Engine on port ${port}...`)
  engineState.binPath = binPath

  const env = {
    ...process.env,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? process.env.VITE_ANTHROPIC_API_KEY ?? '',
  }

  daemonProc = spawn(binPath, ['start'], { stdio: 'pipe', env })

  daemonProc.on('error', err => {
    daemonProc = null
    setStatus('error', `Failed to start engine: ${(err as Error).message}`)
  })

  daemonProc.stdout?.on('data', (d: Buffer) => {
    const line = d.toString().trim()
    if (line) pushLog(line)
  })

  daemonProc.stderr?.on('data', (d: Buffer) => {
    const line = d.toString().trim()
    if (line) pushLog(line)
  })

  daemonProc.on('exit', code => {
    daemonProc = null
    if (code !== 0 && code !== null) {
      setStatus('restarting', `Engine exited (code ${code}) — restarting in 3s...`)
      setTimeout(() => startDaemon(binPath, port), 3000)
    } else {
      setStatus('stopped', 'Engine stopped.')
    }
  })

  // Poll until healthy, then revive agents
  const startTime = Date.now()
  void (async () => {
    let up = false
    while (!up && Date.now() - startTime < 30000) {
      up = await checkHealth(port)
      if (!up) await new Promise(r => setTimeout(r, 1000))
    }
    if (up) {
      await reviveAgents(port)
      setStatus('running', `Agentis Engine running on port ${port}`)
    } else {
      setStatus('error', `Engine failed to start on port ${port}`)
    }
  })()
}

function restartWithKey(apiKey: string, binPath: string, port: number) {
  if (daemonProc) { try { daemonProc.kill() } catch { /* ok */ }; daemonProc = null }
  process.env.ANTHROPIC_API_KEY = apiKey

  // Wipe database so engine spawns a fresh agent (prevents "Agent processing failed")
  const dataDir = path.join(os.homedir(), '.openfang', 'data')
  for (const f of ['openfang.db', 'openfang.db-wal', 'openfang.db-shm']) {
    try { unlinkSync(path.join(dataDir, f)) } catch { /* already gone */ }
  }

  writeConfig(port)
  setTimeout(() => startDaemon(binPath, port), 500)
}

function maybeStartOrWait(binPath: string, port: number) {
  pendingBinPath = binPath
  engineState.binPath = binPath
  const key = process.env.ANTHROPIC_API_KEY ?? process.env.VITE_ANTHROPIC_API_KEY ?? ''
  if (key && key.startsWith('sk-')) {
    startDaemon(binPath, port)
  } else {
    setStatus('needs_api_key', 'API key required — enter it in Agentis to start the engine.')
  }
}

async function boot(root: string, port: number) {
  const BIN_DIR  = path.join(root, 'bin')
  const BIN_PATH = path.join(BIN_DIR, BIN_NAME)
  engineState.binPath = BIN_PATH

  if (existsSync(BIN_PATH) && isValidBinary(BIN_PATH)) {
    console.log(`[Agentis Engine] Binary found at ${BIN_PATH}`)
    maybeStartOrWait(BIN_PATH, port)
    return
  }

  if (existsSync(BIN_PATH)) {
    console.warn('[Agentis Engine] Stale binary removed.')
    try { unlinkSync(BIN_PATH) } catch { /* ok */ }
  }

  if (existsSync(BUILD_OUT) && isValidBinary(BUILD_OUT)) {
    console.log(`[Agentis Engine] Using build output from ${BUILD_OUT}`)
    mkdirSync(BIN_DIR, { recursive: true })
    copyFileSync(BUILD_OUT, BIN_PATH)
    chmodSync(BIN_PATH, 0o755)
    maybeStartOrWait(BIN_PATH, port)
    return
  }

  const pathBin = findInPath()
  if (pathBin && isValidBinary(pathBin)) {
    console.log(`[Agentis Engine] Found in PATH: ${pathBin}`)
    maybeStartOrWait(pathBin, port)
    return
  }

  setStatus('downloading', 'Looking for engine release binary...')
  const downloaded = await tryAutoDownload(BIN_PATH)
  if (downloaded) {
    maybeStartOrWait(BIN_PATH, port)
    return
  }

  if (existsSync('/tmp/openfang')) {
    setStatus('building', 'Building engine from source — this takes ~5 min on first run.')
    const poll = setInterval(() => {
      if (existsSync(BUILD_OUT) && isValidBinary(BUILD_OUT)) {
        clearInterval(poll)
        mkdirSync(BIN_DIR, { recursive: true })
        copyFileSync(BUILD_OUT, BIN_PATH)
        chmodSync(BIN_PATH, 0o755)
        startDaemon(BIN_PATH, port)
      }
    }, 5000)
    return
  }

  setStatus('not_installed', [
    'Engine binary not found. Build it once:',
    '  git clone https://github.com/RightNow-AI/openfang /tmp/openfang',
    '  cd /tmp/openfang && cargo build --release -p openfang-cli',
    `  cp /tmp/openfang/target/release/openfang ${BIN_PATH}`,
    'Then restart Agentis.',
  ].join('\n'))
}

// ── OpenClaw migration helpers ────────────────────────────────────────────────

const TOOL_MAP: Record<string, string> = {
  read_file:        'file_read',
  write_file:       'file_write',
  execute_command:  'shell_exec',
  run_command:      'shell_exec',
  list_directory:   'dir_list',
  search_files:     'file_search',
  http_request:     'http_fetch',
  send_message:     'comms_send',
  create_agent:     'agent_spawn',
  call_agent:       'agent_call',
}

function countFiles(dir: string, exts: string[]): number {
  try {
    return readdirSync(dir, { recursive: true } as Parameters<typeof readdirSync>[1])
      .filter((f): f is string => typeof f === 'string' && exts.some(e => f.endsWith(e)))
      .length
  } catch { return 0 }
}

function detectOpenClaw(): { path: string; agents: number; channels: number; memories: number; files: number } | null {
  const candidates = [
    path.join(os.homedir(), '.openclaw'),
    path.join(os.homedir(), 'openclaw'),
    path.join(os.homedir(), '.config', 'openclaw'),
  ]
  for (const p of candidates) {
    if (!existsSync(p)) continue
    return {
      path: p,
      agents:   countFiles(path.join(p, 'agents'),    ['.yaml', '.yml', '.toml']),
      channels: countFiles(path.join(p, 'channels'),  ['.yaml', '.yml', '.toml', '.json']),
      memories: countFiles(path.join(p, 'memory'),    ['.json', '.db']),
      files:    countFiles(path.join(p, 'workspace'), ['*']),
    }
  }
  return null
}

function convertYamlToToml(yamlContent: string): string {
  // Best-effort YAML→TOML line-by-line conversion for agent files
  const lines = yamlContent.split('\n')
  const out: string[] = []
  for (const line of lines) {
    let l = line
    // Remap tool names
    for (const [from, to] of Object.entries(TOOL_MAP)) {
      l = l.replace(new RegExp(`\\b${from}\\b`, 'g'), to)
    }
    // Convert YAML key: value → TOML key = "value" (simple scalars only)
    l = l.replace(/^(\s*)(\w[\w_]*):\s+(.+)$/, (_m, indent, key, val) => {
      const trimmed = val.trim()
      if (trimmed === 'true' || trimmed === 'false' || /^-?\d/.test(trimmed)) {
        return `${indent}${key} = ${trimmed}`
      }
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        return `${indent}${key} = ${trimmed}`
      }
      return `${indent}${key} = "${trimmed.replace(/"/g, '\\"')}"`
    })
    // Convert YAML list items (- value) to TOML array items (keep as-is, handled above)
    out.push(l)
  }
  return out.join('\n')
}

function migrateOpenClaw(src: string, dst: string): { agents: number; channels: number; memories: number; files: number } {
  mkdirSync(dst, { recursive: true })

  let agents = 0, channels = 0, memories = 0, files = 0

  // Convert agent.yaml → agent.toml
  const agentsSrc = path.join(src, 'agents')
  const agentsDst = path.join(dst, 'agents')
  if (existsSync(agentsSrc)) {
    mkdirSync(agentsDst, { recursive: true })
    for (const f of readdirSync(agentsSrc)) {
      const srcFile = path.join(agentsSrc, f)
      if (f.endsWith('.yaml') || f.endsWith('.yml')) {
        const content = readFileSync(srcFile, 'utf8')
        const toml = convertYamlToToml(content)
        const dstFile = path.join(agentsDst, f.replace(/\.ya?ml$/, '.toml'))
        writeFileSync(dstFile, toml)
        agents++
      } else if (f.endsWith('.toml')) {
        copyFileSync(srcFile, path.join(agentsDst, f))
        agents++
      }
    }
  }

  // Merge channel configs into config.toml
  const channelsSrc = path.join(src, 'channels')
  if (existsSync(channelsSrc)) {
    const sections: string[] = ['\n# Channels (migrated from OpenClaw)\n[channels]']
    for (const f of readdirSync(channelsSrc)) {
      const srcFile = path.join(channelsSrc, f)
      try {
        const content = readFileSync(srcFile, 'utf8')
        sections.push(`\n# ${f}\n${convertYamlToToml(content)}`)
        channels++
      } catch { /* skip unreadable */ }
    }
    const configPath = path.join(dst, 'config.toml')
    const existing = existsSync(configPath) ? readFileSync(configPath, 'utf8') : ''
    writeFileSync(configPath, existing + sections.join('\n'))
  }

  // Copy memory data
  const memorySrc = path.join(src, 'memory')
  const memoryDst = path.join(dst, 'memory')
  if (existsSync(memorySrc)) {
    mkdirSync(memoryDst, { recursive: true })
    for (const f of readdirSync(memorySrc)) {
      try { copyFileSync(path.join(memorySrc, f), path.join(memoryDst, f)); memories++ } catch { /* skip */ }
    }
  }

  // Copy workspace files
  const workspaceSrc = path.join(src, 'workspace')
  const workspaceDst = path.join(dst, 'workspace')
  if (existsSync(workspaceSrc)) {
    mkdirSync(workspaceDst, { recursive: true })
    for (const f of readdirSync(workspaceSrc)) {
      try { copyFileSync(path.join(workspaceSrc, f), path.join(workspaceDst, f)); files++ } catch { /* skip */ }
    }
  }

  return { agents, channels, memories, files }
}

// ── Vite plugin ───────────────────────────────────────────────────────────────

export function agentisEnginePlugin(): Plugin {
  return {
    name: 'agentis-engine',
    apply: 'serve',

    configureServer(server) {
      const root = server.config.root
      const port = parseInt(process.env.VITE_OPENFANG_PORT ?? '4200', 10)

      loadEnvFiles(root)

      // Register all /agentis/* middleware in a single handler
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url?.split('?')[0]

        // ── GET /agentis/status ───────────────────────────────────────────────
        if (url === '/agentis/status' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-cache')
          res.end(JSON.stringify(engineState))
          return
        }

        // ── POST /agentis/configure ───────────────────────────────────────────
        if (url === '/agentis/configure' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json')
          try {
            const body = await readBody(req)
            const { apiKey } = JSON.parse(body) as { apiKey?: string }
            if (apiKey && apiKey.startsWith('sk-')) {
              const bin = pendingBinPath ?? path.join(root, 'bin', BIN_NAME)
              console.log('[Agentis Engine] Received API key — (re)starting engine')
              restartWithKey(apiKey, bin, port)
              res.end(JSON.stringify({ ok: true }))
            } else {
              res.writeHead(400)
              res.end(JSON.stringify({ error: 'Invalid API key' }))
            }
          } catch {
            res.writeHead(400)
            res.end(JSON.stringify({ error: 'Bad request' }))
          }
          return
        }

        // ── GET /agentis/migrate/detect ───────────────────────────────────────
        if (url === '/agentis/migrate/detect' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          const result = detectOpenClaw()
          if (result) {
            res.end(JSON.stringify(result))
          } else {
            res.end(JSON.stringify({ path: null }))
          }
          return
        }

        // ── POST /agentis/migrate ─────────────────────────────────────────────
        if (url === '/agentis/migrate' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json')
          try {
            const body = await readBody(req)
            const { source, target } = JSON.parse(body) as { source?: string; target?: string }
            const src = (source ?? '~/.openclaw').replace(/^~/, os.homedir())
            const dst = (target ?? '~/.openfang').replace(/^~/, os.homedir())
            if (!existsSync(src)) {
              res.writeHead(404)
              res.end(JSON.stringify({ error: `Source directory not found: ${src}` }))
              return
            }
            const result = migrateOpenClaw(src, dst)
            res.end(JSON.stringify(result))
          } catch (e) {
            res.writeHead(500)
            res.end(JSON.stringify({ error: String(e) }))
          }
          return
        }

        // ── GET /agentis/logs (SSE) ───────────────────────────────────────────
        if (url === '/agentis/logs' && req.method === 'GET') {
          res.setHeader('Content-Type', 'text/event-stream')
          res.setHeader('Cache-Control', 'no-cache')
          res.setHeader('Connection', 'keep-alive')
          res.writeHead(200)
          // Replay recent buffered logs
          for (const entry of recentLogs) {
            res.write(`data: ${JSON.stringify(entry)}\n\n`)
          }
          sseClients.push(res)
          req.on('close', () => {
            const idx = sseClients.indexOf(res)
            if (idx >= 0) sseClients.splice(idx, 1)
          })
          return
        }

        next()
      })

      // Start boot sequence after server is ready
      server.httpServer?.once('listening', () => {
        setTimeout(() => void boot(root, port), 200)
      })
    },

    closeBundle() {
      if (daemonProc) { try { daemonProc.kill() } catch { /* ok */ } }
    },
  }
}
