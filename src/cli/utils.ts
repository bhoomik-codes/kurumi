import fs from 'fs'
import path from 'path'

export interface InstructionsResult {
  content: string
  loadedFiles: string[]
  warnings?: string[]
}

export function findInstructions(): InstructionsResult | null {
  let currentDir = process.cwd()
  let combined: string[] = []
  let loadedFiles: string[] = []
  let warnings: string[] = []
  let seenRealPaths = new Set<string>()

  const loadFile = (filePath: string) => {
    if (fs.existsSync(filePath)) {
      try {
        const realPath = fs.realpathSync(filePath)
        if (!seenRealPaths.has(realPath)) {
          seenRealPaths.add(realPath)
          
          let priority = 'General'
          if (filePath.includes('.kurumi/instructions.md')) {
            priority = 'Highest - Kurumi Native Instructions'
          } else if (filePath.toLowerCase().includes('claude.md')) {
            priority = 'High - Compatibility Instructions'
          }

          const rawContent = fs.readFileSync(realPath, 'utf8')
          combined.push(`[Priority: ${priority}]\n${rawContent}`)
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
      
      // Warn if multiple distinct case variants exist in the same directory (Linux collision)
      if (claudeFiles.length > 1) {
        warnings.push(`Warning: Multiple case-variants of CLAUDE.md found in ${currentDir}. To ensure deterministic behavior, please consolidate to a single file.`)
      }

      // Sort alphabetically for deterministic ordering
      claudeFiles.sort()
      for (const claudeFile of claudeFiles) {
        loadFile(path.join(currentDir, claudeFile))
      }
    } catch (e) {}

    if (combined.length > 0) {
      return {
        content: combined.join('\n\n---\n\n'),
        loadedFiles,
        warnings
      }
    }

    // Boundary check: stop if we hit a .git directory (don't traverse past project roots)
    if (fs.existsSync(path.join(currentDir, '.git'))) {
      break
    }

    const parentDir = path.dirname(currentDir)
    if (parentDir === currentDir) break // root
    currentDir = parentDir
  }
  return null
}
