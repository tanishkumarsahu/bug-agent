import { runBugAnalyzer } from './bug-analyzer'
import { runCodeSearch } from './code-search'
import { runRootCause } from './root-cause'
import { runFixGenerator } from './fix-generator'
import { runTestRunner } from './test-runner'
import { runPRCreator } from './pr-creator'
import { cloneRepo } from '@/tools/filesystem'
import { addEvent, updateSession, getSession } from '@/store/sessions'
import { AgentName } from '@/types'

const MAX_ATTEMPTS = 3

function emit(sessionId: string, agent: AgentName, status: 'running' | 'done' | 'failed' | 'retrying', message: string) {
  addEvent(sessionId, { agent, status, message })
}

export async function runOrchestrator(sessionId: string): Promise<void> {
  try {
    updateSession(sessionId, { status: 'running' })
    const session = getSession(sessionId)!

    // Step 1: Analyze bug
    emit(sessionId, 'BugAnalyzerAgent', 'running', 'Extracting structured bug context from report...')
    const bugContext = await runBugAnalyzer(session.bugTitle, session.bugDescription)
    updateSession(sessionId, { bugContext })
    emit(sessionId, 'BugAnalyzerAgent', 'done', `Identified affected feature: ${bugContext.affectedFeature}`)

    // Step 2: Clone + search code
    emit(sessionId, 'CodeSearchAgent', 'running', 'Cloning repository...')
    const repoLocalPath = await cloneRepo(session.repoUrl, sessionId)
    updateSession(sessionId, { repoLocalPath })
    emit(sessionId, 'CodeSearchAgent', 'running', 'Scanning codebase for relevant files...')
    const relevantFiles = await runCodeSearch(repoLocalPath, bugContext)
    updateSession(sessionId, { relevantFiles })
    emit(sessionId, 'CodeSearchAgent', 'done', `Found ${relevantFiles.length} relevant files`)

    // Step 3: Root cause
    emit(sessionId, 'RootCauseAgent', 'running', 'Analyzing code to identify root cause...')
    const rootCause = await runRootCause(bugContext, relevantFiles)
    updateSession(sessionId, { rootCause })
    emit(sessionId, 'RootCauseAgent', 'done', `Root cause found in ${rootCause.file} (confidence: ${rootCause.confidence})`)

    // Step 4: Fix + test loop (max 3 attempts)
    let testPassed = false
    let lastError: string | undefined
    let fixResult
    let testResult

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      updateSession(sessionId, { attempts: attempt })

      if (attempt > 1) {
        emit(sessionId, 'FixGeneratorAgent', 'retrying', `Attempt ${attempt}/${MAX_ATTEMPTS}: Trying a different fix approach...`)
      } else {
        emit(sessionId, 'FixGeneratorAgent', 'running', `Generating fix for ${rootCause.file}...`)
      }

      fixResult = await runFixGenerator(repoLocalPath, bugContext, rootCause, lastError)
      updateSession(sessionId, { fixResult })
      emit(sessionId, 'FixGeneratorAgent', 'done', `Fix written: ${fixResult.diffSummary}`)

      emit(sessionId, 'TestRunnerAgent', 'running', `Running Playwright tests in Chromium (attempt ${attempt})...`)
      testResult = await runTestRunner(repoLocalPath)
      updateSession(sessionId, { testResult })

      if (testResult.passed) {
        testPassed = true
        emit(sessionId, 'TestRunnerAgent', 'done', 'All tests passed ✅')
        break
      } else {
        lastError = testResult.errorDetails || testResult.output
        if (attempt < MAX_ATTEMPTS) {
          emit(sessionId, 'TestRunnerAgent', 'failed', `Tests failed (attempt ${attempt}/${MAX_ATTEMPTS}). Retrying with new fix...`)
        } else {
          emit(sessionId, 'TestRunnerAgent', 'failed', `Tests failed after ${MAX_ATTEMPTS} attempts. Raising PR for human review.`)
        }
      }
    }

    // Step 5: Create PR
    emit(sessionId, 'PRCreatorAgent', 'running', 'Creating branch and opening Pull Request...')
    const currentSession = getSession(sessionId)!
    const prUrl = await runPRCreator(currentSession)
    updateSession(sessionId, { prUrl, status: testPassed ? 'completed' : 'needs_human_review' })
    emit(sessionId, 'PRCreatorAgent', 'done', `PR opened: ${prUrl}`)
    emit(sessionId, 'OrchestratorAgent', 'done', testPassed
      ? 'Done! PR raised with passing tests.'
      : 'Done! PR raised. Tests need human review.'
    )

  } catch (error: unknown) {
    const err = error as { message?: string }
    const session = getSession(sessionId)
    const lastAgent = session?.events?.slice(-1)[0]?.agent || 'OrchestratorAgent'
    emit(sessionId, lastAgent as AgentName, 'failed', `Fatal error: ${err.message}`)
    updateSession(sessionId, { status: 'failed' })
  }
}
