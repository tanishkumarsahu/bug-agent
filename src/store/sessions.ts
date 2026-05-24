import { Session, AgentEvent } from '@/types'

const sessions = new Map<string, Session>()
const sseControllers = new Map<string, ReadableStreamDefaultController>()

export function createSession(data: Pick<Session, 'repoUrl' | 'bugTitle' | 'bugDescription'>): Session {
  const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const session: Session = {
    id,
    status: 'pending',
    attempts: 0,
    events: [],
    createdAt: Date.now(),
    ...data,
  }
  sessions.set(id, session)
  return session
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id)
}

export function updateSession(id: string, updates: Partial<Session>): void {
  const session = sessions.get(id)
  if (session) sessions.set(id, { ...session, ...updates })
}

export function addEvent(id: string, event: Omit<AgentEvent, 'timestamp'>): void {
  const session = sessions.get(id)
  if (!session) return
  const fullEvent: AgentEvent = { ...event, timestamp: Date.now() }
  session.events.push(fullEvent)
  sessions.set(id, session)
  const controller = sseControllers.get(id)
  if (controller) {
    try {
      controller.enqueue(`data: ${JSON.stringify(fullEvent)}\n\n`)
    } catch {}
  }
}

export function registerSSEController(id: string, controller: ReadableStreamDefaultController): void {
  sseControllers.set(id, controller)
}

export function removeSSEController(id: string): void {
  sseControllers.delete(id)
}
