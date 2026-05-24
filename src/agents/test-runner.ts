import { runPlaywrightTests } from '@/tools/playwright-runner'
import { TestResult } from '@/types'

export async function runTestRunner(repoPath: string): Promise<TestResult> {
  return await runPlaywrightTests(repoPath)
}
