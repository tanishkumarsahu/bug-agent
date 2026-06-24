import { getFileTree, readFile } from '@/tools/filesystem'
import { callClaude, parseJson } from '@/tools/claude'
import { BugContext, RelevantFile } from '@/types'

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte']
const MAX_FILES_TO_RANK = 12
const CONTENT_PREVIEW = 3000

export async function runCodeSearch(repoPath: string, bugContext: BugContext): Promise<RelevantFile[]> {
  const allFiles = getFileTree(repoPath)
  const codeFiles = allFiles.filter(f => CODE_EXTENSIONS.some(ext => f.endsWith(ext)))

  if (codeFiles.length === 0) return []

  const keywords = [
    ...bugContext.searchKeywords,
    bugContext.affectedFeature,
  ]
    .filter(Boolean)
    .map(k => k.toLowerCase())

  // Score every file by keyword hits in BOTH the path and the file contents.
  // Filename-only matching misses files like auth.service.ts for a "login" bug.
  const scored = codeFiles
    .map(path => {
      let content: string
      try {
        content = readFile(repoPath, path)
      } catch {
        return null
      }
      const haystack = (path + '\n' + content).toLowerCase()
      let score = 0
      for (const k of keywords) {
        // count occurrences; matches in the path count extra.
        const inContent = haystack.split(k).length - 1
        score += inContent
        if (path.toLowerCase().includes(k)) score += 5
      }
      return { path, content, score }
    })
    .filter((f): f is { path: string; content: string; score: number } => f !== null)

  // Prefer files with keyword hits; if nothing matched, fall back to all files
  // so the model still has something real to look at.
  const withHits = scored.filter(f => f.score > 0).sort((a, b) => b.score - a.score)
  const ranked = (withHits.length > 0 ? withHits : scored).slice(0, MAX_FILES_TO_RANK)

  const fileContents = ranked.map(f => ({ path: f.path, content: f.content.slice(0, CONTENT_PREVIEW) }))

  const system = `You are a codebase search expert. Given file contents and a bug context, rank files by relevance.
Respond with valid JSON only. No markdown.`

  const user = `Bug: ${bugContext.title}
Affected feature: ${bugContext.affectedFeature}
Keywords: ${bugContext.searchKeywords.join(', ')}

Files (path and first ${CONTENT_PREVIEW} chars):
${fileContents.map(f => `--- ${f.path} ---\n${f.content}`).join('\n\n')}

Pick ONLY from the file paths listed above — do not invent paths.
Return JSON array, top 5 most relevant files:
[{ "path": "string", "relevanceScore": 0-100, "reason": "string" }]`

  const raw = await callClaude(system, user)
  const modelRanked = parseRankedFiles(raw)

  // Resolve each model path back to a real file we actually scanned.
  const scannedPaths = ranked.map(f => f.path)
  const resolved: RelevantFile[] = []
  const seen = new Set<string>()

  for (const r of modelRanked) {
    const realPath = resolveRealPath(r.path, scannedPaths)
    if (!realPath || seen.has(realPath)) continue
    try {
      resolved.push({ path: realPath, content: readFile(repoPath, realPath), relevanceScore: r.relevanceScore })
      seen.add(realPath)
    } catch {
      // skip unreadable
    }
  }

  // If the model gave us nothing usable, fall back to our own top-scored files
  // so the pipeline never proceeds with zero code.
  if (resolved.length === 0) {
    return ranked.slice(0, 5).map(f => ({ path: f.path, content: f.content, relevanceScore: 50 }))
  }

  return resolved
}

type Ranked = { path: string; relevanceScore: number; reason?: string }

// Gemini may return a bare array or an object wrapping the array
// (e.g. { "files": [...] }). parseJson handles fences/prose; here we
// additionally unwrap the object case down to the array.
function parseRankedFiles(raw: string): Ranked[] {
  const parsed = parseJson<unknown>(raw)

  if (Array.isArray(parsed)) return parsed as Ranked[]

  if (parsed && typeof parsed === 'object') {
    const arr = Object.values(parsed as Record<string, unknown>).find(Array.isArray)
    if (arr) return arr as Ranked[]
  }

  throw new Error(`Code search: expected an array of files, got: ${JSON.stringify(parsed).slice(0, 200)}`)
}

// The model may return paths with different slashes, a leading "./", or just
// the basename. Match it back to a path we actually scanned.
function resolveRealPath(modelPath: string, scannedPaths: string[]): string | null {
  const norm = (p: string) => p.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase()
  const target = norm(modelPath)

  const exact = scannedPaths.find(p => norm(p) === target)
  if (exact) return exact

  const targetBase = target.split('/').pop()
  const byBase = scannedPaths.find(p => norm(p).split('/').pop() === targetBase)
  if (byBase) return byBase

  const bySuffix = scannedPaths.find(p => norm(p).endsWith(target) || target.endsWith(norm(p)))
  return bySuffix ?? null
}
