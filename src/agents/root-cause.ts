import { callClaude } from '@/tools/claude'
import { BugContext, RelevantFile, RootCause } from '@/types'

export async function runRootCause(bugContext: BugContext, files: RelevantFile[]): Promise<RootCause> {
  const system = `You are an expert debugger. Analyze code and identify the root cause of bugs.
Respond with valid JSON only. No markdown.`

  const user = `Bug: ${bugContext.title}
Expected: ${bugContext.expectedBehavior}
Actual: ${bugContext.actualBehavior}

Relevant code files:
${files.map(f => `=== ${f.path} ===\n${f.content}`).join('\n\n')}

Identify the root cause. Return:
{
  "file": "exact/file/path.ts",
  "lineStart": 42,
  "lineEnd": 55,
  "explanation": "detailed explanation of what is wrong and why",
  "confidence": "high|medium|low"
}`

  const raw = await callClaude(system, user)
  return JSON.parse(raw.replace(/```json|```/g, '').trim()) as RootCause
}
