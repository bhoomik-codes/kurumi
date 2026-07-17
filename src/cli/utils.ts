import fs from 'fs'
import path from 'path'

export interface InstructionsResult {
  content: string
  loadedFiles: string[]
}

export function findInstructions(): InstructionsResult | null {
  let currentDir = process.cwd()
  let combined: string[] = []
  let loadedFiles: string[] = []
  let seenRealPaths = new Set<string>()

  const loadFile = (filePath: string) => {
    if (fs.existsSync(filePath)) {
      try {
        const realPath = fs.realpathSync(filePath)
        if (!seenRealPaths.has(realPath)) {
          seenRealPaths.add(realPath)
          combined.push(fs.readFileSync(realPath, 'utf8'))
          loadedFiles.push(filePath)
        }
      } catch (e) {}
    }
  }

  while (true) {
    // 1. Precedence: .kurumi/instructions.md
    loadFile(path.join(currentDir, '.kurumi', 'instructions.md'))

    // 2. Precedence: CLAUDE.md variants
    try {
      const files = fs.readdirSync(currentDir)
      const claudeFiles = files.filter(f => f.toLowerCase() === 'claude.md')
      // Sort alphabetically for deterministic ordering in case of multiple distinct files
      claudeFiles.sort()
      for (const claudeFile of claudeFiles) {
        loadFile(path.join(currentDir, claudeFile))
      }
    } catch (e) {}

    if (combined.length > 0) {
      return {
        content: combined.join('\n\n---\n\n'),
        loadedFiles
      }
    }

    const parentDir = path.dirname(currentDir)
    if (parentDir === currentDir) break // root
    currentDir = parentDir
  }
  return null
}
