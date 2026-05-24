import { createPR } from '@/tools/github'
import { Session } from '@/types'

export async function runPRCreator(session: Session): Promise<string> {
  if (!session.repoLocalPath || !session.rootCause || !session.fixResult || !session.testResult) {
    throw new Error('Missing required session data for PR creation')
  }

  const branchName = `bugagent/fix-${session.id.slice(-6)}`
  const title = `[BugAgent] Fix: ${session.bugTitle}`
  const body = `## 🤖 BugAgent Automated Fix

### Bug Report
**Title:** ${session.bugTitle}
**Description:** ${session.bugDescription}

### Root Cause
${session.rootCause.explanation}

**Affected file:** \`${session.rootCause.file}\` (lines ${session.rootCause.lineStart}–${session.rootCause.lineEnd})
**Confidence:** ${session.rootCause.confidence}

### Fix Summary
${session.fixResult.diffSummary}

### Test Results
${session.testResult.passed ? '✅ All Playwright tests passed' : '⚠️ Tests were attempted but require manual review'}

**Attempts taken:** ${session.attempts}

---
*This PR was created autonomously by BugAgent. Please review before merging.*`

  return await createPR({
    repoUrl: session.repoUrl,
    repoLocalPath: session.repoLocalPath,
    branchName,
    title,
    body,
    sessionId: session.id,
  })
}
