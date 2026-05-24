import { NextRequest } from 'next/server'
import { getSession, registerSSEController, removeSSEController } from '@/store/sessions'

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return new Response('Missing sessionId', { status: 400 })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      // Replay existing events first
      const session = getSession(sessionId)
      if (session) {
        for (const event of session.events) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }
      }

      // Register for future events
      registerSSEController(sessionId, {
        enqueue: (data: string) => controller.enqueue(encoder.encode(data)),
      } as unknown as ReadableStreamDefaultController)

      // Close stream when session reaches a terminal state
      const check = setInterval(() => {
        const s = getSession(sessionId)
        if (s && ['completed', 'failed', 'needs_human_review'].includes(s.status)) {
          removeSSEController(sessionId)
          try { controller.close() } catch {}
          clearInterval(check)
        }
      }, 1000)
    },
    cancel() {
      removeSSEController(sessionId)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
