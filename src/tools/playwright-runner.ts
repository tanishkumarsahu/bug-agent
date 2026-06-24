import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { TestResult } from '@/types'

function hasPlaywrightSetup(repoPath: string): boolean {
  const config = ['playwright.config.ts', 'playwright.config.js', 'playwright.config.mjs']
    .some(f => fs.existsSync(path.join(repoPath, f)))
  // Tests can only run if Playwright is actually installed in the cloned repo.
  const installed = fs.existsSync(path.join(repoPath, 'node_modules', '@playwright', 'test'))
  return config && installed
}

export async function runPlaywrightTests(repoPath: string): Promise<TestResult> {
  // We clone with --depth 1 and don't run `npm install`, so most repos can't
  // actually run Playwright. Detect that and skip rather than always "failing".
  if (!hasPlaywrightSetup(repoPath)) {
    return {
      passed: false,
      skipped: true,
      output: '',
      errorDetails: 'No runnable Playwright setup in the repo (missing config or @playwright/test). Skipping automated validation.',
    }
  }

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
