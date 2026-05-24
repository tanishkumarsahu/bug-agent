import { WatchConfig, DetectedBug } from '@/types'
import { updateWatch, addDetectedBug } from '@/store/watches'

export async function pollStackOverflow(watch: WatchConfig): Promise<DetectedBug[]> {
  if (!watch.tags || watch.tags.length === 0 || !watch.targetRepoUrl) return []

  const since = Math.floor(
    (watch.lastCheckedAt > 0 ? watch.lastCheckedAt : Date.now() - 24 * 60 * 60 * 1000) / 1000
  )
  const tagged = encodeURIComponent(watch.tags.join(';'))
  const url =
    `https://api.stackexchange.com/2.3/questions` +
    `?tagged=${tagged}&order=desc&sort=activity&site=stackoverflow` +
    `&filter=withbody&fromdate=${since}&pagesize=10`

  const res = await fetch(url)
  if (!res.ok) return []

  const data = await res.json()
  const questions: any[] = data?.items ?? []
  const newBugs: DetectedBug[] = []
  const keyword = watch.keyword?.toLowerCase()

  for (const q of questions) {
    const sourceId = String(q.question_id)
    if (watch.seenIds.includes(sourceId)) continue

    const combined = `${q.title} ${q.body || ''}`.toLowerCase()
    if (keyword && !combined.includes(keyword)) continue

    const cleanBody = (q.body || q.title).replace(/<[^>]+>/g, '').slice(0, 2000)

    const bug = addDetectedBug({
      watchId: watch.id,
      sourceId,
      source: 'stackoverflow',
      title: q.title,
      description: cleanBody,
      repoUrl: watch.targetRepoUrl!,
      sourceUrl: q.link,
      detectedAt: Date.now(),
    })

    newBugs.push(bug)
    updateWatch(watch.id, { seenIds: [...watch.seenIds, sourceId] })
  }

  updateWatch(watch.id, { lastCheckedAt: Date.now() })
  return newBugs
}
