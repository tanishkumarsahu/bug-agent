import { NextRequest, NextResponse } from 'next/server'
import { addWatch, getWatches, getDetectedBugs } from '@/store/watches'
import { getSession } from '@/store/sessions'
import { initPoller } from '@/monitor/poller'

export async function GET() {
  initPoller()
  const watches = getWatches()
  const bugs = getDetectedBugs().map(bug => {
    const session = bug.sessionId ? getSession(bug.sessionId) : undefined
    return {
      ...bug,
      sessionStatus: session?.status,
      prUrl: session?.prUrl,
    }
  })
  return NextResponse.json({ watches, bugs })
}

export async function POST(req: NextRequest) {
  initPoller()
  const body = await req.json()
  const { source, label, repoUrl, subreddit, tags, targetRepoUrl, keyword } = body

  if (!source || !label) {
    return NextResponse.json({ error: 'source and label are required' }, { status: 400 })
  }

  const watch = addWatch({
    source,
    label,
    repoUrl,
    subreddit,
    tags,
    targetRepoUrl,
    keyword,
    active: true,
  })

  return NextResponse.json(watch)
}
