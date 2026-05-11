import { ipcMain } from 'electron'
import os from 'os'
import { execFile } from 'child_process'

type SystemStats = {
  gpuName: string
  vramUsed: number
  vramTotal: number
  ramUsed: number
  ramTotal: number
}

function execFileAsync(file: string, args: string[], timeoutMs: number): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(file, args, { timeout: timeoutMs }, (err, stdout, stderr) => {
      if (err) reject(err)
      else resolve({ stdout: String(stdout ?? ''), stderr: String(stderr ?? '') })
    })
  })
}

async function queryNvidiaSmi(): Promise<Pick<SystemStats, 'gpuName' | 'vramUsed' | 'vramTotal'> | null> {
  const { stdout } = await execFileAsync(
    'nvidia-smi',
    ['--query-gpu=name,memory.total,memory.used', '--format=csv,noheader,nounits'],
    1500
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
    }

    try {
      const gpu = await queryNvidiaSmi()
      return gpu ? { ...base, ...gpu } : base
    } catch {
      return base
    }
  })
}
