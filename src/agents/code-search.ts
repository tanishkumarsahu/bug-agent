import { getFileTree, readFile } from '@/tools/filesystem'
import { callClaude } from '@/tools/claude'
import { BugContext, RelevantFile } from '@/types'

export async function runCodeSearch(repoPath: string, bugContext: BugContext): Promise<RelevantFile[]> {
  const allFiles = getFileTree(repoPath)

  const codeFiles = allFiles.filter(f =>
    ['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte'].some(ext => f.endsWith(ext))
  )

  const keywords = bugContext.searchKeywords.map(k => k.toLowerCase())
  const shortlisted = codeFiles.filter(f =>
    keywords.some(k => f.toLowerCase().includes(k))
  ).slice(0, 15)

  const filesToScan = shortlisted.length > 0 ? shortlisted : codeFiles.slice(0, 10)

  const fileContents = filesToScan.map(f => {
    try {
      return { path: f, content: readFile(repoPath, f).slice(0, 3000) }
    } catch {
      return null
    }
  }).filter(Boolean) as { path: string; content: string }[]

  const system = `You are a codebase search expert. Given file contents and a bug context, rank files by relevance.
Respond with valid JSON only. No markdown.`

  const user = `Bug: ${bugContext.title}
Affected feature: ${bugContext.affectedFeature}
Keywords: ${bugContext.searchKeywords.join(', ')}

Files (path and first 3000 chars):
${fileContents.map(f => `--- ${f.path} ---\n${f.content}`).join('\n\n')}

Return JSON array, top 5 most relevant files:
[{ "path": "string", "relevanceScore": 0-100, "reason": "string" }]`

  const raw = await callClaude(system, user)
  const ranked = JSON.parse(raw.replace(/```json|```/g, '').trim()) as { path: string; relevanceScore: number }[]

  return ranked.map(r => ({
    path: r.path,
    content: readFile(repoPath, r.path),
    relevanceScore: r.relevanceScore,
  }))
}
