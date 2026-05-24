import { getWatches, getWatch, updateWatch, updateDetectedBug } from '@/store/watches'
import { createSession } from '@/store/sessions'
import { runOrchestrator } from '@/agents/orchestrator'
import { pollGitHubIssues } from './github-source'
import { pollReddit } from './reddit-source'
import { pollStackOverflow } from './stackoverflow-source'
import { DetectedBug } from '@/types'

let initialized = false

async function processDetectedBug(bug: DetectedBug): Promise<void> {
  const session = createSession({
    repoUrl: bug.repoUrl,
    bugTitle: `[Auto] ${bug.title}`,
    bugDescription: bug.description,
  })

  updateDetectedBug(bug.id, { sessionId: session.id })

  const watch = getWatch(bug.watchId)
  if (watch) {
    updateWatch(bug.watchId, {
      autoSessionIds: [...watch.autoSessionIds, session.id],
    })
  }

  console.log(`[BugAgent Monitor] Auto-triggered session ${session.id} for: ${bug.title}`)
  runOrchestrator(session.id).catch(console.error)
}

async function pollAllSources(): Promise<void> {
  const watches = getWatches().filter(w => w.active)
  for (const watch of watches) {
    try {
      let bugs: DetectedBug[] = []
      if (watch.source === 'github-issues') bugs = await pollGitHubIssues(watch)
      else if (watch.source === 'reddit') bugs = await pollReddit(watch)
      else if (watch.source === 'stackoverflow') bugs = await pollStackOverflow(watch)

      for (const bug of bugs) {
        await processDetectedBug(bug)
      }
    } catch (err) {
      console.error(`[BugAgent Monitor] Poll error for watch ${watch.id}:`, err)
    }
  }
}

export function initPoller(): void {
  if (initialized) return
  initialized = true
  console.log('[BugAgent Monitor] Poller started — checking every 60s')
  pollAllSources().catch(console.error)
  setInterval(() => pollAllSources().catch(console.error), 60_000)
}
