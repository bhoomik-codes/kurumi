import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { getChildLogger } from './logger'

const configDir = path.join(os.homedir(), '.config', 'kurumi')
const extractedAirLLMPath = path.join(configDir, 'airllm_server.py')

try {
  fs.mkdirSync(configDir, { recursive: true })
  
  // Find the real path of airllm_server.py (next to executable when packaged, or in root when dev)
  const isPackaged = typeof process.pkg !== 'undefined' || process.argv[0].endsWith('kurumi-cli') || process.argv[0].endsWith('kurumi-cli.exe')
  const baseDir = isPackaged ? path.dirname(process.execPath) : path.join(__dirname, '..', '..')
  const sourcePath = path.join(baseDir, 'airllm_server.py')
  
  if (fs.existsSync(sourcePath)) {
    const scriptContent = fs.readFileSync(sourcePath, 'utf-8')
    fs.writeFileSync(extractedAirLLMPath, scriptContent)
  } else {
    // If running in dev from kurumi-electron/src/daemon
    const devPath = path.join(__dirname, '..', '..', 'airllm_server.py')
    if (fs.existsSync(devPath)) {
       const scriptContent = fs.readFileSync(devPath, 'utf-8')
       fs.writeFileSync(extractedAirLLMPath, scriptContent)
    } else {
       console.error(`[Supervisor] Could not find airllm_server.py at ${sourcePath} or ${devPath}`)
    }
  }
} catch (err) {
  console.error('Failed to extract airllm_server.py:', err)
}

const airllmLogger = getChildLogger('airllm')
const ollamaLogger = getChildLogger('ollama')

interface SupervisedProcess {
  name: string
  command: string
  args: string[]
  process: ChildProcess | null
  restartCount: number
  backoffMs: number
  owned: boolean // If true, the daemon spawned it and should kill it on exit
}

const MAX_BACKOFF_MS = 60000 // 1 minute
const INITIAL_BACKOFF_MS = 2000

const processes: Record<string, SupervisedProcess> = {
  airllm: {
    name: 'airllm',
    // We expect Python to be in PATH or configured. For now, use 'python3'
    command: process.platform === 'win32' ? 'python' : 'python3',
    // Point to the extracted airllm_server.py
    args: [extractedAirLLMPath],
    process: null,
    restartCount: 0,
    backoffMs: INITIAL_BACKOFF_MS,
    owned: true // We always own the airllm server
  },
  ollama: {
    name: 'ollama',
    command: 'ollama',
    args: ['serve'],
    process: null,
    restartCount: 0,
    backoffMs: INITIAL_BACKOFF_MS,
    owned: false // Checked at runtime
  }
}

export function startSupervisedProcess(name: string) {
  const procDef = processes[name]
  if (!procDef) {
    throw new Error(`Unknown process to supervise: ${name}`)
  }
  
  if (procDef.process) {
    return // Already running
  }

  const logger = name === 'airllm' ? airllmLogger : getChildLogger(name)
  logger.info(`Starting supervised process: ${name}`)

  procDef.owned = true // If we are calling start, we own it

  try {
    const env = { ...process.env }
    // If we have custom env vars for AirLLM, pass them here
    
    const child = spawn(procDef.command, procDef.args, {
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    procDef.process = child

    child.stdout?.on('data', (data) => {
      logger.info(data.toString().trim())
    })

    child.stderr?.on('data', (data) => {
      logger.error(data.toString().trim())
    })

    child.on('close', (code) => {
      logger.warn(`Process ${name} exited with code ${code}`)
      procDef.process = null
      
      // Exponential backoff restart
      setTimeout(() => {
        logger.info(`Restarting ${name} (attempt ${procDef.restartCount + 1})...`)
        procDef.restartCount++
        procDef.backoffMs = Math.min(procDef.backoffMs * 2, MAX_BACKOFF_MS)
        startSupervisedProcess(name)
      }, procDef.backoffMs)
    })
    
    child.on('error', (err) => {
      logger.error(`Failed to start process ${name}: ${err.message}`)
    })

  } catch (err) {
    logger.error(`Exception while starting process ${name}`, { error: err })
  }
}

export function getProcessStatus(name: string): boolean {
  if (name === 'ollama' && !processes.ollama.owned) {
    return true // Assume running if not owned (we verified it at startup)
  }
  return !!processes[name]?.process
}

export async function ensureOllama() {
  try {
    const res = await fetch('http://127.0.0.1:11434', { signal: AbortSignal.timeout(2000) })
    if (res.ok) {
      ollamaLogger.info('Ollama is already running externally. Attached as unowned.')
      processes.ollama.owned = false
      return
    }
  } catch {
    // not reachable
  }
  ollamaLogger.info('Ollama is not reachable. Spawning supervised instance.')
  startSupervisedProcess('ollama')
}

export function stopAllSupervisedProcesses() {
  for (const name in processes) {
    const procDef = processes[name]
    if (procDef.process && procDef.owned) {
      procDef.process.kill('SIGTERM')
      procDef.process = null
    }
  }
}
