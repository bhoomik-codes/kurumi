import { ipcMain } from 'electron'
import os from 'os'
import { execFile } from 'child_process'

type SystemStats = {
  gpuName: string
  vramUsed: number
  vramTotal: number
  ramUsed: number
  ramTotal: number
  /** When nvidia-smi fails in-process, we may fill VRAM from Ollama `/api/ps` instead */
  vramSource?: 'nvidia' | 'ollama' | 'unknown'
}

function execFileAsync(file: string, args: string[], timeoutMs: number): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(file, args, { timeout: timeoutMs }, (err, stdout, stderr) => {
      if (err) reject(err)
      else resolve({ stdout: String(stdout ?? ''), stderr: String(stderr ?? '') })
    })
  })
}

function pickNvidiaSmiCandidates(): string[] {
  // In Electron production/dev, PATH can be different than an interactive shell.
  // Try common locations first, then fallback to PATH lookup.
  return [
    '/usr/bin/nvidia-smi',
    '/bin/nvidia-smi',
    '/usr/local/bin/nvidia-smi',
    'nvidia-smi',
  ]
}

async function queryNvidiaSmi(): Promise<Pick<SystemStats, 'gpuName' | 'vramUsed' | 'vramTotal'> | null> {
  for (const candidate of pickNvidiaSmiCandidates()) {
    try {
      const { stdout } = await execFileAsync(
        candidate,
        ['--query-gpu=name,memory.total,memory.used', '--format=csv,noheader,nounits'],
        2000
      )
      const line = stdout.trim().split('\n')[0]?.trim()
      if (!line) return null

      const parts = line.split(',').map(p => p.trim())
      const name = parts[0] || 'Unknown GPU'
      const totalMiB = Number(parts[1])
      const usedMiB = Number(parts[2])
      if (!Number.isFinite(totalMiB) || !Number.isFinite(usedMiB)) return null

      return {
        gpuName: name,
        vramTotal: Math.round((totalMiB / 1024) * 10) / 10,
        vramUsed: Math.round((usedMiB / 1024) * 10) / 10,
      }
    } catch {
      continue
    }
  }

  return null
}

async function queryOllamaLoadedVram(): Promise<Pick<SystemStats, 'gpuName' | 'vramUsed'> | null> {
  try {
    const res = await fetch('http://localhost:11434/api/ps')
    if (!res.ok) return null
    const data = await res.json()
    const models = Array.isArray(data?.models) ? data.models : []
    let sumBytes = 0
    let topName = ''
    let topBytes = 0
    for (const m of models) {
      const b = Number(m?.size_vram ?? 0)
      if (Number.isFinite(b)) sumBytes += b
      if (b > topBytes) {
        topBytes = b
        topName = String(m?.details?.family || m?.model || m?.name || '')
      }
    }
    if (sumBytes <= 0) return null
    const gb = Math.round((sumBytes / 1024 ** 3) * 10) / 10
    const label = topName ? `${topName} (Ollama)` : 'GPU via Ollama'
    return { gpuName: label, vramUsed: gb }
  } catch {
    return null
  }
}

export function registerSystemIpc() {
  ipcMain.handle('system:stats', async () => {
    const totalRam = os.totalmem()
    const freeRam = os.freemem()
    const usedRam = Math.max(0, totalRam - freeRam)

    const base: SystemStats = {
      gpuName: 'Unknown GPU',
      vramUsed: 0,
      vramTotal: 0,
      ramTotal: Math.round((totalRam / (1024 ** 3)) * 10) / 10,
      ramUsed: Math.round((usedRam / (1024 ** 3)) * 10) / 10,
      vramSource: 'unknown',
    }

    try {
      const gpu = await queryNvidiaSmi()
      if (gpu) {
        return { ...base, ...gpu, vramSource: 'nvidia' }
      }

      const ollamaGpu = await queryOllamaLoadedVram()
      if (ollamaGpu) {
        return {
          ...base,
          gpuName: ollamaGpu.gpuName,
          vramUsed: ollamaGpu.vramUsed,
          vramTotal: 0,
          vramSource: 'ollama',
        }
      }

      return base
    } catch {
      return base
    }
  })
}
