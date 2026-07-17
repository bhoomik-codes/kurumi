import fs from 'fs'
import path from 'path'

export function findInstructions(): string | null {
  let currentDir = process.cwd()
  let combined: string[] = []

  while (true) {
    const kurumiPath = path.join(currentDir, '.kurumi', 'instructions.md')
    if (fs.existsSync(kurumiPath)) {
      try {
        combined.push(fs.readFileSync(kurumiPath, 'utf8'))
      } catch {}
    }

    try {
      const files = fs.readdirSync(currentDir)
      const claudeFiles = files.filter(f => f.toLowerCase() === 'claude.md')
      for (const claudeFile of claudeFiles) {
        combined.push(fs.readFileSync(path.join(currentDir, claudeFile), 'utf8'))
      }
    } catch {}

    if (combined.length > 0) {
      return combined.join('\n\n---\n\n')
    }

    const parentDir = path.dirname(currentDir)
    if (parentDir === currentDir) break // root
    currentDir = parentDir
  }
  return null
}
