import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import { getChildLogger } from './logger'

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
    // Point to the airllm_server.py in the project root
    args: [path.join(__dirname, '..', '..', 'airllm_server.py')],
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
