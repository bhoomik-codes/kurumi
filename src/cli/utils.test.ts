import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import { findInstructions } from './utils'

describe('Context Instructions Audit', () => {
  const testDir = path.join(__dirname, '__audit_test_dir__')
  const kurumiDir = path.join(testDir, '.kurumi')
  let originalCwd: string

  beforeEach(() => {
    originalCwd = process.cwd()
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
    fs.mkdirSync(testDir, { recursive: true })
    process.chdir(testDir)
    vi.restoreAllMocks()
  })

  afterEach(() => {
    process.chdir(originalCwd)
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
    vi.restoreAllMocks()
  })

  it('1. Test one by one: .kurumi/instructions.md', () => {
    fs.mkdirSync(kurumiDir)
    fs.writeFileSync(path.join(kurumiDir, 'instructions.md'), 'KURUMI_TEST')
    const result = findInstructions()
    expect(result?.content).toBe('KURUMI_TEST')
    expect(result?.loadedFiles[0]).toContain('instructions.md')
  })

  it('2. Parent directory resolution test', () => {
    fs.mkdirSync(kurumiDir)
    fs.writeFileSync(path.join(kurumiDir, 'instructions.md'), 'PARENT_DIR_TEST')
    
    // Create a sub-directory and chdir into it to prove it finds the parent's file
    const subDir = path.join(testDir, 'subdir', 'nested')
    fs.mkdirSync(subDir, { recursive: true })
    process.chdir(subDir)
    
    const result = findInstructions()
    expect(result?.content).toBe('PARENT_DIR_TEST')
    expect(result?.loadedFiles[0]).toContain('instructions.md')
  })

  it('3. Case-insensitive filesystem collision risk (Mocked realpathSync)', () => {
    // We mock realpathSync to simulate macOS/Windows where CLAUDE.md and claude.md point to the same inode
    const mockRealpathSync = vi.spyOn(fs, 'realpathSync').mockImplementation((p) => {
      // Force all CLAUDE.md case variants to resolve to the exact same lowercase path string
      if (p.toString().toLowerCase().endsWith('claude.md')) {
        return path.join(testDir, 'claude.md')
      }
      return p as string
    })

    // On Linux we can literally just write one file. But `readdirSync` in the real code
    // will see whatever is actually on disk. To simulate a case-insensitive fs where
    // `readdirSync` might somehow return both or we manually pass paths, we mock readdirSync too
    // just to force the `findInstructions` loop to process multiple case variants.
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['CLAUDE.md', 'claude.md'] as any)
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'readFileSync').mockReturnValue('MOCK_CONTENT')

    const result = findInstructions()
    
    // It should only be loaded ONCE due to the deduplication by realPath
    expect(result?.content).toBe('MOCK_CONTENT')
    expect(result?.loadedFiles.length).toBe(1)
  })

  it('4. Precedence order: .kurumi > CLAUDE.md', () => {
    fs.mkdirSync(kurumiDir)
    fs.writeFileSync(path.join(kurumiDir, 'instructions.md'), 'KURUMI_NATIVE')
    fs.writeFileSync(path.join(testDir, 'CLAUDE.md'), 'CLAUDE_COMPAT')
    
    const result = findInstructions()
    expect(result?.content).toBe('KURUMI_NATIVE\n\n---\n\nCLAUDE_COMPAT')
    expect(result?.loadedFiles[0]).toContain('instructions.md')
    expect(result?.loadedFiles[1]).toContain('CLAUDE.md')
  })
})
