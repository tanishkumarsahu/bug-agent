import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/store/sessions'

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })

  const session = getSession(sessionId)
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  return NextResponse.json({
    status: session.status,
    prUrl: session.prUrl,
    rootCause: session.rootCause,
    fixSummary: session.fixResult?.diffSummary,
    attempts: session.attempts,
    testsPassed: session.testResult?.passed,
  })
}
