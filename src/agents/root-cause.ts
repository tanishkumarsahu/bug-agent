import { callClaude, parseJson } from '@/tools/claude'
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
  const rootCause = parseJson<RootCause>(raw)

  // The model can return a path that isn't one of the files we gave it.
  // Snap it back to a real file so downstream steps don't try to open a
  // non-existent path (the classic "N/A - Code not provided" crash).
  const norm = (p: string) => p.replace(/\\/g, '/').toLowerCase()
  const match = files.find(f => norm(f.path) === norm(rootCause.file))
    || files.find(f => norm(f.path).endsWith(norm(rootCause.file)))
  if (!match) {
    rootCause.file = files[0].path
    rootCause.confidence = 'low'
  } else {
    rootCause.file = match.path
  }

  return rootCause
}
