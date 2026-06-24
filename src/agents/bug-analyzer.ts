import { callClaude, parseJson } from '@/tools/claude'
import { BugContext } from '@/types'

export async function runBugAnalyzer(title: string, description: string): Promise<BugContext> {
  const system = `You are a bug analysis expert. Given a bug report, extract structured information.
Always respond with valid JSON only. No markdown, no explanation, just JSON.`

  const user = `Bug Title: ${title}
Bug Description: ${description}

Respond with this exact JSON structure:
{
  "title": "string",
  "description": "string",
  "affectedFeature": "string (e.g. login, payment, navigation)",
  "expectedBehavior": "string",
  "actualBehavior": "string",
  "searchKeywords": ["array", "of", "keywords", "to", "search", "in", "codebase"],
  "likelyFileTypes": [".tsx", ".ts", ".js"]
}`

  const raw = await callClaude(system, user)
  return parseJson<BugContext>(raw)
}
