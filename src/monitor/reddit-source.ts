import { WatchConfig, DetectedBug } from '@/types'
import { updateWatch, addDetectedBug } from '@/store/watches'

const BUG_PATTERN = /\b(bug|error|issue|crash|broken|exception|fail|not work|doesn't work|weird behavior)\b/i

export async function pollReddit(watch: WatchConfig): Promise<DetectedBug[]> {
  if (!watch.subreddit || !watch.targetRepoUrl) return []

  const query = encodeURIComponent(watch.keyword || watch.label)
  const url = `https://www.reddit.com/r/${watch.subreddit}/search.json?q=${query}&sort=new&restrict_sr=1&limit=15&t=day`

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'BugAgent/1.0 (automated open-source bug fixer; contact: bugagent@automated.dev)',
    },
  })
  if (!res.ok) return []

  const data = await res.json()
  const posts: any[] = data?.data?.children ?? []
  const newBugs: DetectedBug[] = []

  for (const { data: post } of posts) {
    const sourceId: string = post.id
    if (watch.seenIds.includes(sourceId)) continue

    const combined = `${post.title} ${post.selftext || ''}`
    if (!BUG_PATTERN.test(combined)) continue

    const bug = addDetectedBug({
      watchId: watch.id,
      sourceId,
      source: 'reddit',
      title: post.title,
      description: `${post.selftext || post.title}\n\n(Posted on r/${watch.subreddit})`,
      repoUrl: watch.targetRepoUrl!,
      sourceUrl: `https://reddit.com${post.permalink}`,
      detectedAt: Date.now(),
    })

    newBugs.push(bug)
    updateWatch(watch.id, { seenIds: [...watch.seenIds, sourceId] })
  }

  updateWatch(watch.id, { lastCheckedAt: Date.now() })
  return newBugs
}
