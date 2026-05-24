'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { AgentEvent, AgentName } from '@/types'

const AGENT_ORDER: AgentName[] = [
  'BugAnalyzerAgent',
  'CodeSearchAgent',
  'RootCauseAgent',
  'FixGeneratorAgent',
  'TestRunnerAgent',
  'PRCreatorAgent',
]

const AGENT_LABELS: Record<AgentName, string> = {
  OrchestratorAgent: 'Orchestrator',
  BugAnalyzerAgent: 'Bug Analyzer',
  CodeSearchAgent: 'Code Search',
  RootCauseAgent: 'Root Cause',
  FixGeneratorAgent: 'Fix Generator',
  TestRunnerAgent: 'Test Runner',
  PRCreatorAgent: 'PR Creator',
}

const AGENT_ICONS: Record<AgentName, string> = {
  OrchestratorAgent: '⚙️',
  BugAnalyzerAgent: '🔍',
  CodeSearchAgent: '📂',
  RootCauseAgent: '🎯',
  FixGeneratorAgent: '🔧',
  TestRunnerAgent: '🧪',
  PRCreatorAgent: '🚀',
}

type AgentState = 'waiting' | 'running' | 'done' | 'failed' | 'retrying'

function getStatusColor(status: AgentState) {
  switch (status) {
    case 'running': return 'text-yellow-400 border-yellow-500'
    case 'done': return 'text-green-400 border-green-500'
    case 'failed': return 'text-red-400 border-red-500'
    case 'retrying': return 'text-orange-400 border-orange-500'
    default: return 'text-gray-600 border-gray-700'
  }
}

function getLogColor(status: AgentEvent['status']) {
  switch (status) {
    case 'running': return 'text-yellow-300'
    case 'done': return 'text-green-400'
    case 'failed': return 'text-red-400'
    case 'retrying': return 'text-orange-400'
    default: return 'text-gray-400'
  }
}

interface ResultData {
  status: string
  prUrl?: string
  rootCause?: { file: string; lineStart: number; lineEnd: number; explanation: string; confidence: string }
  fixSummary?: string
  attempts?: number
  testsPassed?: boolean
}

export default function SessionPage() {
  const params = useParams()
  const sessionId = params.id as string

  const [events, setEvents] = useState<AgentEvent[]>([])
  const [agentStates, setAgentStates] = useState<Record<AgentName, AgentState>>({} as Record<AgentName, AgentState>)
  const [result, setResult] = useState<ResultData | null>(null)
  const [sessionDone, setSessionDone] = useState(false)
  const [attempts, setAttempts] = useState(1)

  const logRef = useRef<HTMLDivElement>(null)
  const esRef = useRef<EventSource | null>(null)

  // Derive agent states from events
  useEffect(() => {
    const states: Record<AgentName, AgentState> = {} as Record<AgentName, AgentState>
    for (const event of events) {
      if (event.agent === 'OrchestratorAgent') continue
      states[event.agent] = event.status as AgentState
      if (event.status === 'retrying') setAttempts(a => Math.max(a, 2))
    }
    setAgentStates(states)
  }, [events])

  // Auto-scroll terminal
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [events.length])

  // SSE connection
  useEffect(() => {
    const es = new EventSource(`/api/agent/stream?sessionId=${sessionId}`)
    esRef.current = es

    es.onmessage = (e) => {
      const event: AgentEvent = JSON.parse(e.data)
      setEvents(prev => [...prev, event])
    }

    es.onerror = () => {
      es.close()
      setSessionDone(true)
    }

    return () => es.close()
  }, [sessionId])

  // Poll for result once SSE closes
  useEffect(() => {
    if (!sessionDone) return
    const poll = async () => {
      try {
        const res = await fetch(`/api/agent/result?sessionId=${sessionId}`)
        const data = await res.json()
        if (['completed', 'failed', 'needs_human_review'].includes(data.status)) {
          setResult(data)
          return
        }
      } catch {}
      setTimeout(poll, 2000)
    }
    poll()
  }, [sessionDone, sessionId])

  // Also set sessionDone when orchestrator emits done/failed
  useEffect(() => {
    const last = events[events.length - 1]
    if (last?.agent === 'OrchestratorAgent' && (last.status === 'done' || last.status === 'failed')) {
      setSessionDone(true)
    }
  }, [events])

  const isRetrying = Object.values(agentStates).some(s => s === 'retrying')

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Attempt badge */}
      <div className="border-b border-gray-800 px-6 py-3 flex items-center gap-4">
        <span className="text-gray-400 text-sm font-mono">Session: <span className="text-gray-300">{sessionId}</span></span>
        {attempts > 1 && (
          <span className="text-xs bg-orange-950 border border-orange-700 text-orange-400 px-2 py-0.5 rounded-full font-mono">
            Attempt {attempts}/3
          </span>
        )}
        {result?.status === 'completed' && (
          <span className="text-xs bg-green-950 border border-green-700 text-green-400 px-2 py-0.5 rounded-full">
            ✅ Completed
          </span>
        )}
        {result?.status === 'needs_human_review' && (
          <span className="text-xs bg-orange-950 border border-orange-700 text-orange-400 px-2 py-0.5 rounded-full">
            ⚠️ Needs Review
          </span>
        )}
        {result?.status === 'failed' && (
          <span className="text-xs bg-red-950 border border-red-700 text-red-400 px-2 py-0.5 rounded-full">
            ❌ Failed
          </span>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: Agent pipeline */}
        <div className="w-72 shrink-0 border-r border-gray-800 p-6 flex flex-col gap-1">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-4 font-semibold">Agent Pipeline</p>
          {AGENT_ORDER.map((agent, i) => {
            const state = agentStates[agent] || 'waiting'
            const colorClass = getStatusColor(state)
            return (
              <div key={agent}>
                <div className={`flex items-center gap-3 p-3 rounded-lg border ${colorClass} bg-gray-900/50 transition-all duration-300 ${state === 'running' ? 'shadow-lg shadow-yellow-500/10' : ''}`}>
                  <span className="text-lg">{AGENT_ICONS[agent]}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${colorClass.split(' ')[0]}`}>{AGENT_LABELS[agent]}</p>
                    <p className="text-xs text-gray-500 capitalize">{state}</p>
                  </div>
                  {state === 'running' && (
                    <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shrink-0" />
                  )}
                  {state === 'done' && <span className="text-green-400 shrink-0">✓</span>}
                  {state === 'failed' && <span className="text-red-400 shrink-0">✗</span>}
                  {state === 'retrying' && <span className="text-orange-400 shrink-0 text-xs">↺</span>}
                </div>
                {/* Connector line */}
                {i < AGENT_ORDER.length - 1 && (
                  <div className={`ml-[1.875rem] w-px h-3 ${isRetrying && agent === 'TestRunnerAgent' ? 'bg-orange-500' : 'bg-gray-700'}`} />
                )}
              </div>
            )
          })}

          {isRetrying && (
            <div className="mt-3 text-xs text-orange-400 bg-orange-950/40 border border-orange-800 rounded-lg p-2 text-center">
              ↺ Retrying with new fix approach
            </div>
          )}
        </div>

        {/* Right panel: Terminal log */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            ref={logRef}
            className="flex-1 overflow-y-auto bg-black font-mono text-sm p-6 space-y-1"
          >
            {events.length === 0 && (
              <p className="text-gray-600">Waiting for agents to start...</p>
            )}
            {events.map((event, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="text-gray-600 shrink-0 text-xs pt-0.5">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-gray-500 shrink-0 text-xs pt-0.5 w-28 truncate">
                  [{AGENT_LABELS[event.agent] || event.agent}]
                </span>
                <span className={getLogColor(event.status)}>{event.message}</span>
              </div>
            ))}
            {sessionDone && !result && (
              <p className="text-gray-600 animate-pulse">Fetching final result...</p>
            )}
          </div>
        </div>
      </div>

      {/* Result card */}
      {result && (
        <div className="border-t border-gray-800 bg-gray-900 p-6">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
            {result.prUrl && (
              <a
                href={result.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="md:col-span-3 flex items-center justify-between bg-green-950/60 border border-green-700 rounded-xl px-5 py-4 hover:bg-green-950 transition group"
              >
                <div>
                  <p className="text-green-400 font-semibold text-sm">Pull Request Opened</p>
                  <p className="text-green-300/70 text-xs mt-0.5 font-mono truncate">{result.prUrl}</p>
                </div>
                <span className="text-green-400 group-hover:translate-x-1 transition-transform text-lg">→</span>
              </a>
            )}

            {result.rootCause && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-semibold">Root Cause</p>
                <p className="text-gray-200 text-sm">{result.rootCause.explanation}</p>
                <p className="text-xs text-gray-500 mt-2 font-mono">{result.rootCause.file}:{result.rootCause.lineStart}–{result.rootCause.lineEnd}</p>
                <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full border ${result.rootCause.confidence === 'high' ? 'bg-green-950 border-green-700 text-green-400' : result.rootCause.confidence === 'medium' ? 'bg-yellow-950 border-yellow-700 text-yellow-400' : 'bg-red-950 border-red-700 text-red-400'}`}>
                  {result.rootCause.confidence} confidence
                </span>
              </div>
            )}

            {result.fixSummary && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-semibold">Fix Summary</p>
                <p className="text-gray-200 text-sm">{result.fixSummary}</p>
              </div>
            )}

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col gap-3">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Results</p>
              <div className="flex items-center gap-2">
                <span className={result.testsPassed ? 'text-green-400' : 'text-orange-400'}>
                  {result.testsPassed ? '✅' : '⚠️'}
                </span>
                <span className="text-sm text-gray-300">{result.testsPassed ? 'Tests passed' : 'Tests need review'}</span>
              </div>
              <div className="text-sm text-gray-400">
                Attempts: <span className="text-white">{result.attempts}</span>
              </div>
              <a
                href="/"
                className="mt-auto text-center text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg px-3 py-2 transition"
              >
                Fix another bug →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
