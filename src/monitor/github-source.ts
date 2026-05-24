import { Octokit } from '@octokit/rest'
import { WatchConfig, DetectedBug } from '@/types'
import { updateWatch, addDetectedBug } from '@/store/watches'

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })

function parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/)
  if (!match) throw new Error(`Invalid GitHub URL: ${repoUrl}`)
  return { owner: match[1], repo: match[2] }
}

export async function pollGitHubIssues(watch: WatchConfig): Promise<DetectedBug[]> {
  if (!watch.repoUrl) return []
  const { owner, repo } = parseRepoUrl(watch.repoUrl)

  const since = watch.lastCheckedAt > 0
    ? new Date(watch.lastCheckedAt).toISOString()
    : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: issues } = await octokit.issues.listForRepo({
    owner,
    repo,
    state: 'open',
    labels: 'bug',
    since,
    per_page: 10,
  })

  const newBugs: DetectedBug[] = []

  for (const issue of issues) {
    const sourceId = String(issue.number)
    if (watch.seenIds.includes(sourceId)) continue

    const bug = addDetectedBug({
      watchId: watch.id,
      sourceId,
      source: 'github-issues',
      title: issue.title,
      description: issue.body || issue.title,
      repoUrl: watch.repoUrl!,
      sourceUrl: issue.html_url,
      detectedAt: Date.now(),
    })

    newBugs.push(bug)
    updateWatch(watch.id, { seenIds: [...watch.seenIds, sourceId] })
  }

  updateWatch(watch.id, { lastCheckedAt: Date.now() })
  return newBugs
}
