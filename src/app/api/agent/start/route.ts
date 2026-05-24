import { NextRequest, NextResponse } from 'next/server'
import { createSession } from '@/store/sessions'
import { runOrchestrator } from '@/agents/orchestrator'

export async function POST(req: NextRequest) {
  const { repoUrl, bugTitle, bugDescription } = await req.json()

  if (!repoUrl || !bugTitle || !bugDescription) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const session = createSession({ repoUrl, bugTitle, bugDescription })

  // Fire orchestrator in background — intentionally not awaited
  runOrchestrator(session.id).catch(console.error)

  return NextResponse.json({ sessionId: session.id, status: 'started' })
}
