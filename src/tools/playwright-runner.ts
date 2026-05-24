import { execSync } from 'child_process'
import { TestResult } from '@/types'

export async function runPlaywrightTests(repoPath: string): Promise<TestResult> {
  try {
    const output = execSync(
      'npx playwright test --reporter=line 2>&1',
      {
        cwd: repoPath,
        timeout: 60000,
        env: { ...process.env, CI: 'true' },
      }
    ).toString()

    return { passed: true, output }
  } catch (error: unknown) {
    const err = error as { stdout?: Buffer; stderr?: Buffer; message?: string }
    return {
      passed: false,
      output: err.stdout?.toString() || '',
      errorDetails: err.stderr?.toString() || err.message,
    }
  }
}
