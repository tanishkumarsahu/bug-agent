import simpleGit from 'simple-git'
import fs from 'fs'
import path from 'path'

const TEMP_DIR = process.env.TEMP_DIR || 'C:\\Temp\\bugagent-repos'

export async function cloneRepo(repoUrl: string, sessionId: string): Promise<string> {
  const repoPath = path.join(TEMP_DIR, sessionId)
  if (fs.existsSync(repoPath)) fs.rmSync(repoPath, { recursive: true })
  fs.mkdirSync(repoPath, { recursive: true })
  await simpleGit().clone(repoUrl, repoPath, ['--depth', '1'])
  return repoPath
}

export function getFileTree(repoPath: string): string[] {
  const results: string[] = []
  const ignored = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage'])

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (ignored.has(entry.name)) continue
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(fullPath)
      else results.push(path.relative(repoPath, fullPath))
    }
  }
  walk(repoPath)
  return results
}

export function readFile(repoPath: string, filePath: string): string {
  return fs.readFileSync(path.join(repoPath, filePath), 'utf-8')
}

export function writeFile(repoPath: string, filePath: string, content: string): void {
  const fullPath = path.join(repoPath, filePath)
  fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  fs.writeFileSync(fullPath, content, 'utf-8')
}

export function cleanupRepo(sessionId: string): void {
  const repoPath = path.join(TEMP_DIR, sessionId)
  if (fs.existsSync(repoPath)) fs.rmSync(repoPath, { recursive: true })
}
