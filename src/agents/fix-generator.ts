import { callClaude, parseJson } from '@/tools/claude'
import { RootCause, FixResult, BugContext } from '@/types'
import { readFile, writeFile } from '@/tools/filesystem'

export async function runFixGenerator(
  repoPath: string,
  bugContext: BugContext,
  rootCause: RootCause,
  previousError?: string
): Promise<FixResult> {
  const originalContent = readFile(repoPath, rootCause.file)

  const system = `You are an expert software engineer. Write minimal, targeted bug fixes.
Do not rewrite the whole file. Fix only what is broken.
Respond with valid JSON only. No markdown.`

  const user = `Bug: ${bugContext.title}
Root cause: ${rootCause.explanation}
File: ${rootCause.file}
Lines ${rootCause.lineStart}-${rootCause.lineEnd} are the problem.
${previousError ? `\nPrevious fix attempt FAILED with this error:\n${previousError}\nDo NOT repeat the same fix. Try a different approach.` : ''}

Original file content:
${originalContent}

Return:
{
  "fixedFileContent": "complete fixed file content as string",
  "testFileContent": "playwright test content to validate this fix",
  "testFileName": "tests/fix-validation.spec.ts",
  "diffSummary": "1-2 sentence summary of what was changed and why"
}`

  const raw = await callClaude(system, user)
  const result = parseJson<{
    fixedFileContent?: string
    testFileContent?: string
    testFileName?: string
    diffSummary?: string
  }>(raw)

  // The fix itself is required — without it there's nothing to apply.
  if (typeof result.fixedFileContent !== 'string' || result.fixedFileContent.trim() === '') {
    throw new Error('Fix generator: model response did not include "fixedFileContent".')
  }
  writeFile(repoPath, rootCause.file, result.fixedFileContent)

  // The test file is optional — the model sometimes omits it (especially on a
  // retry). Only write it when both name and content are valid strings.
  const hasTest =
    typeof result.testFileName === 'string' && result.testFileName.trim() !== '' &&
    typeof result.testFileContent === 'string' && result.testFileContent.trim() !== ''
  if (hasTest) {
    writeFile(repoPath, result.testFileName!, result.testFileContent!)
  }

  return {
    fixedFilePath: rootCause.file,
    fixedFileContent: result.fixedFileContent,
    testFilePath: hasTest ? result.testFileName! : '',
    testFileContent: hasTest ? result.testFileContent! : '',
    diffSummary: result.diffSummary ?? 'Applied a targeted fix.',
  }
}
